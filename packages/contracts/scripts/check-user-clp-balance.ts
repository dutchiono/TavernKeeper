import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

// Mainnet addresses
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const CELLAR_TOKEN = "0x6eF142a2203102F6c58b0C15006BF9F6F5CFe39E";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";

// Get user address from environment variable or use deployer
// Usage: USER_ADDRESS=0x... npx hardhat run scripts/check-user-clp-balance.ts --network monad
// Or: $env:USER_ADDRESS="0x..."; npx hardhat run scripts/check-user-clp-balance.ts --network monad
const USER_ADDRESS = process.env.USER_ADDRESS || process.env.DEPLOYER_ADDRESS || "";

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
];

const CELLAR_ABI = [
    'function tokenId() view returns (uint256)',
    'function totalLiquidity() view returns (uint256)',
];

const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
];

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 CHECKING USER CLP BALANCE & LP ACCOUNTING");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();

    if (!USER_ADDRESS) {
        console.log("Usage (PowerShell):");
        console.log("  $env:USER_ADDRESS=\"0x...\"; npx hardhat run scripts/check-user-clp-balance.ts --network monad");
        console.log("\nOr set USER_ADDRESS or DEPLOYER_ADDRESS in .env");
        console.log("\nUsing deployer address:", deployer.address);
        console.log();
    }

    const userAddress = USER_ADDRESS || deployer.address;
    console.log(`Checking CLP balance for: ${userAddress}\n`);

    const cellarToken = new ethers.Contract(CELLAR_TOKEN, ERC20_ABI, deployer);
    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, POSITION_MANAGER_ABI, deployer);

    // Get balances
    const userCLPBalance = await cellarToken.balanceOf(userAddress);
    const totalCLPSupply = await cellarToken.totalSupply();
    const tokenId = await cellar.tokenId();
    const totalLiquidity = await cellar.totalLiquidity();

    console.log("📊 USER CLP BALANCE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Your CLP Balance: ${ethers.formatEther(userCLPBalance)} CLP`);
    console.log(`   Total CLP Supply: ${ethers.formatEther(totalCLPSupply)} CLP`);
    console.log(`   Your Share: ${((Number(userCLPBalance) / Number(totalCLPSupply)) * 100).toFixed(2)}%`);
    console.log();

    if (tokenId === 0n) {
        console.log("⚠️  No position exists yet.");
        return;
    }

    const position = await positionManager.positions(tokenId);
    const positionLiquidity = position.liquidity;

    console.log("💧 POSITION & ACCOUNTING:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Position Liquidity: ${ethers.formatEther(positionLiquidity)}`);
    console.log(`   TheCellar.totalLiquidity: ${ethers.formatEther(totalLiquidity)}`);
    console.log(`   CLP Total Supply: ${ethers.formatEther(totalCLPSupply)}`);
    console.log();

    // Calculate user's share of actual LP
    const userShareOfLP = (BigInt(userCLPBalance.toString()) * BigInt(positionLiquidity.toString())) / BigInt(totalCLPSupply.toString());

    console.log("💰 YOUR SHARE OF ACTUAL LP:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Your CLP: ${ethers.formatEther(userCLPBalance)} CLP`);
    console.log(`   Your Share of Position: ${ethers.formatEther(userShareOfLP)} liquidity units`);
    console.log(`   (Based on: Your CLP / Total CLP * Position Liquidity)`);
    console.log();

    // Check for accounting issues
    console.log("🔍 ACCOUNTING CHECK:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const positionLiquidityBN = BigInt(positionLiquidity.toString());
    const clpSupplyBN = BigInt(totalCLPSupply.toString());
    const totalLiquidityBN = BigInt(totalLiquidity.toString());

    if (clpSupplyBN > positionLiquidityBN) {
        const excessCLP = clpSupplyBN - positionLiquidityBN;
        const excessPercent = (Number(excessCLP) * 100) / Number(clpSupplyBN);
        console.log(`   ⚠️  CLP Supply exceeds Position Liquidity`);
        console.log(`      Excess: ${ethers.formatEther(excessCLP)} CLP (${excessPercent.toFixed(2)}%)`);
        console.log(`      This means some CLP tokens don't have backing LP`);
        console.log();

        // Calculate user's share of the excess
        const userExcessCLP = (BigInt(userCLPBalance.toString()) * excessCLP) / clpSupplyBN;
        console.log(`   Your share of excess CLP: ${ethers.formatEther(userExcessCLP)} CLP`);
        console.log(`   (This CLP may not be withdrawable)`);
        console.log();
    } else {
        console.log(`   ✅ CLP Supply ≤ Position Liquidity (good!)`);
        console.log();
    }

    // Calculate what user should be able to withdraw
    console.log("💡 WITHDRAWAL ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (clpSupplyBN > positionLiquidityBN) {
        // If CLP supply exceeds position, user can only withdraw proportional share
        const withdrawableCLP = (BigInt(userCLPBalance.toString()) * positionLiquidityBN) / clpSupplyBN;
        const nonWithdrawableCLP = BigInt(userCLPBalance.toString()) - withdrawableCLP;

        console.log(`   Your Total CLP: ${ethers.formatEther(userCLPBalance)} CLP`);
        console.log(`   Withdrawable CLP: ${ethers.formatEther(withdrawableCLP)} CLP`);
        console.log(`   Non-Withdrawable CLP: ${ethers.formatEther(nonWithdrawableCLP)} CLP`);
        console.log(`   (Non-withdrawable due to accounting mismatch)`);
        console.log();
        console.log(`   ⚠️  WARNING: If you try to withdraw all ${ethers.formatEther(userCLPBalance)} CLP,`);
        console.log(`       the transaction may fail if there isn't enough backing liquidity.`);
        console.log(`       You can safely withdraw up to ${ethers.formatEther(withdrawableCLP)} CLP.`);
    } else {
        console.log(`   ✅ You can withdraw all ${ethers.formatEther(userCLPBalance)} CLP`);
        console.log(`      (CLP Supply matches Position Liquidity)`);
    }
    console.log();

    // Summary
    console.log("📋 SUMMARY:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   • Your wallet shows: ${ethers.formatEther(userCLPBalance)} CLP`);
    console.log(`   • This represents your share of the LP position`);
    console.log(`   • CLP tokens are receipt tokens - they exist in wallets until:`);
    console.log(`     1. You withdraw (burns CLP + removes LP)`);
    console.log(`     2. You raid (burns CLP but keeps LP in pool)`);
    console.log(`   • The "Pool MON" display shows actual LP in Uniswap (${ethers.formatEther(positionLiquidity)})`);
    console.log(`   • Your CLP balance is separate from the pool's actual liquidity`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

