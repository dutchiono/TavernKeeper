import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

// Mainnet addresses
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const CELLAR_TOKEN = "0x6eF142a2203102F6c58b0C15006BF9F6F5CFe39E"; // CLP token
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP_TOKEN = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

// ABIs
const CELLAR_ABI = [
    'function tokenId() view returns (uint256)',
    'function totalLiquidity() view returns (uint256)',
    'function potBalanceMON() view returns (uint256)',
    'function potBalanceKEEP() view returns (uint256)',
    'function wmon() view returns (address)',
    'function keepToken() view returns (address)',
    'function cellarToken() view returns (address)',
];

const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
];

const ERC20_ABI = [
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
];

const POOL_ABI = [
    'function liquidity() external view returns (uint128)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
];

// Helper to calculate token amounts from liquidity for full range positions
// For full range (tickLower: -887200, tickUpper: 887200), we can estimate from current price
function calculateTokenAmounts(
    liquidity: bigint,
    sqrtPriceX96: bigint,
    tickLower: number,
    tickUpper: number,
    currentTick: number
): { amount0: bigint; amount1: bigint } {
    const Q96 = BigInt(2) ** BigInt(96);

    // For full range positions, if price is in range, both tokens are present
    // Simplified calculation: approximate based on current price
    // Actual calculation would use tick math, but for full range this is reasonable

    if (currentTick >= tickLower && currentTick < tickUpper) {
        // Price is in range - both tokens present
        // amount0 ≈ liquidity * (1/sqrtPrice - 1/sqrtPriceUpper)
        // amount1 ≈ liquidity * (sqrtPrice - sqrtPriceLower)
        // For full range, we simplify to:
        const amount0 = (liquidity * Q96) / sqrtPriceX96;
        const amount1 = (liquidity * sqrtPriceX96) / Q96;
        return { amount0, amount1 };
    } else if (currentTick < tickLower) {
        // Price below range - all token0
        return { amount0: liquidity * 1000n, amount1: 0n }; // Rough estimate
    } else {
        // Price above range - all token1
        return { amount0: 0n, amount1: liquidity * 1000n }; // Rough estimate
    }
}

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 COMPREHENSIVE LP ANALYSIS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // Initialize contracts
    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
    const cellarToken = new ethers.Contract(CELLAR_TOKEN, ERC20_ABI, deployer);
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, POSITION_MANAGER_ABI, deployer);
    const pool = new ethers.Contract(V3_POOL, POOL_ABI, deployer);
    const wmonToken = new ethers.Contract(WMON, ERC20_ABI, deployer);
    const keepToken = new ethers.Contract(KEEP_TOKEN, ERC20_ABI, deployer);

    // 1. Get TheCellarV3 state
    console.log("📊 THE CELLAR V3 STATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const tokenId = await cellar.tokenId();
    const totalLiquidity = await cellar.totalLiquidity();
    const potBalanceMON = await cellar.potBalanceMON();
    const potBalanceKEEP = await cellar.potBalanceKEEP();

    console.log(`   Position NFT Token ID: ${tokenId.toString()}`);
    console.log(`   Total Liquidity (tracked): ${ethers.formatEther(totalLiquidity)}`);
    console.log(`   Pot Balance MON: ${ethers.formatEther(potBalanceMON)} MON`);
    console.log(`   Pot Balance KEEP: ${ethers.formatEther(potBalanceKEEP)} KEEP`);
    console.log();

    // 2. CLP Token (CellarToken) Analysis
    console.log("🪙 CLP TOKEN (CellarToken) ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const clpTotalSupply = await cellarToken.totalSupply();
    const clpInCellar = await cellarToken.balanceOf(THE_CELLAR_V3);

    console.log(`   CLP Total Supply: ${ethers.formatEther(clpTotalSupply)} CLP`);
    console.log(`   CLP in TheCellar Contract: ${ethers.formatEther(clpInCellar)} CLP`);
    console.log(`   CLP in User Wallets: ${ethers.formatEther(clpTotalSupply - clpInCellar)} CLP`);
    console.log();

    // Get pool state first (needed for position calculations)
    const poolLiquidity = await pool.liquidity();
    const poolToken0 = await pool.token0();
    const poolToken1 = await pool.token1();
    const slot0 = await pool.slot0();

    // 3. Actual Uniswap V3 Position Analysis
    console.log("💧 UNISWAP V3 POSITION (ACTUAL LP):");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (tokenId === 0n) {
        console.log("   ⚠️  No position exists (tokenId = 0)");
        console.log("   This means no liquidity has been added yet.");
    } else {
        const position = await positionManager.positions(tokenId);
        const positionLiquidity = position.liquidity;

        console.log(`   Position Liquidity: ${positionLiquidity.toString()}`);
        console.log(`   Position Liquidity (formatted): ${ethers.formatEther(positionLiquidity)}`);
        console.log(`   Tick Range: ${position.tickLower.toString()} to ${position.tickUpper.toString()}`);
        console.log(`   Token0: ${position.token0}`);
        console.log(`   Token1: ${position.token1}`);
        console.log(`   Fee: ${position.fee} (${Number(position.fee) / 10000}%)`);
        console.log(`   Tokens Owed (fees):`);
        console.log(`     Token0: ${ethers.formatEther(position.tokensOwed0)}`);
        console.log(`     Token1: ${ethers.formatEther(position.tokensOwed1)}`);
        console.log();

        // Determine which token is which
        const isToken0WMON = position.token0.toLowerCase() === WMON.toLowerCase();
        const isToken1KEEP = position.token1.toLowerCase() === KEEP_TOKEN.toLowerCase();
        const isToken0KEEP = position.token0.toLowerCase() === KEEP_TOKEN.toLowerCase();
        const isToken1WMON = position.token1.toLowerCase() === WMON.toLowerCase();

        if (isToken0WMON && isToken1KEEP) {
            console.log("   ✅ Token order: WMON (token0) / KEEP (token1)");
        } else if (isToken0KEEP && isToken1WMON) {
            console.log("   ✅ Token order: KEEP (token0) / WMON (token1)");
        } else {
            console.log("   ⚠️  Unexpected token order!");
            console.log(`      Token0: ${position.token0}`);
            console.log(`      Token1: ${position.token1}`);
        }

        // Calculate actual token amounts in position
        const tokenAmounts = calculateTokenAmounts(
            BigInt(position.liquidity.toString()),
            BigInt(slot0.sqrtPriceX96.toString()),
            Number(position.tickLower),
            Number(position.tickUpper),
            Number(slot0.tick)
        );

        // Determine token amounts based on actual order
        const wmonInPosition = isToken0WMON ? tokenAmounts.amount0 : (isToken1WMON ? tokenAmounts.amount1 : 0n);
        const keepInPosition = isToken0KEEP ? tokenAmounts.amount0 : (isToken1KEEP ? tokenAmounts.amount1 : 0n);

        console.log();
        console.log("   💰 ESTIMATED TOKEN AMOUNTS IN POSITION:");
        console.log(`     WMON: ${ethers.formatEther(wmonInPosition)} WMON`);
        console.log(`     KEEP: ${ethers.formatEther(keepInPosition)} KEEP`);
        console.log(`     (Note: These are estimates based on current price)`);
        console.log();
    }

    // 4. Pool-level liquidity
    console.log("🏊 UNISWAP V3 POOL STATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log(`   Pool Total Liquidity: ${poolLiquidity.toString()}`);
    console.log(`   Pool Token0: ${poolToken0}`);
    console.log(`   Pool Token1: ${poolToken1}`);
    console.log(`   Current Tick: ${slot0.tick.toString()}`);
    console.log(`   SqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
    console.log();

    // 5. Token balances in TheCellar contract
    console.log("💰 TOKEN BALANCES IN THE CELLAR CONTRACT:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const cellarWMONBalance = await wmonToken.balanceOf(THE_CELLAR_V3);
    const cellarKEEPBalance = await keepToken.balanceOf(THE_CELLAR_V3);

    console.log(`   WMON Balance: ${ethers.formatEther(cellarWMONBalance)} WMON`);
    console.log(`   KEEP Balance: ${ethers.formatEther(cellarKEEPBalance)} KEEP`);
    console.log();

    // 6. Comparison and Analysis
    console.log("📈 COMPARISON & ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (tokenId !== 0n) {
        const position = await positionManager.positions(tokenId);
        const positionLiquidity = position.liquidity;

        console.log(`   Actual LP Position Liquidity: ${ethers.formatEther(positionLiquidity)}`);
        console.log(`   CLP Total Supply: ${ethers.formatEther(clpTotalSupply)}`);
        console.log(`   TheCellar.totalLiquidity: ${ethers.formatEther(totalLiquidity)}`);
        console.log();

        // Check for discrepancies
        const positionLiquidityBN = BigInt(positionLiquidity.toString());
        const clpSupplyBN = BigInt(clpTotalSupply.toString());
        const totalLiquidityBN = BigInt(totalLiquidity.toString());

        if (positionLiquidityBN === clpSupplyBN) {
            console.log("   ✅ CLP Supply matches Position Liquidity (1:1 ratio maintained)");
        } else {
            const diff = positionLiquidityBN > clpSupplyBN
                ? positionLiquidityBN - clpSupplyBN
                : clpSupplyBN - positionLiquidityBN;
            const diffPercent = (Number(diff) * 100) / Number(positionLiquidityBN);
            console.log(`   ⚠️  MISMATCH: Position Liquidity ≠ CLP Supply`);
            console.log(`      Difference: ${ethers.formatEther(diff)} (${diffPercent.toFixed(4)}%)`);
            if (positionLiquidityBN > clpSupplyBN) {
                console.log(`      Position has MORE liquidity than CLP tokens`);
                console.log(`      This is expected if CLP tokens were burned during raids`);
                console.log(`      (Raids burn CLP but don't remove actual LP from Uniswap)`);
            } else {
                console.log(`      ⚠️  CLP Supply is HIGHER than Position Liquidity`);
                console.log(`      This is UNEXPECTED - CLP should never exceed actual LP`);
                console.log(`      Possible causes:`);
                console.log(`        - Liquidity was removed but CLP wasn't burned`);
                console.log(`        - Tracking error in minting/burning`);
            }
        }
        console.log();

        if (totalLiquidityBN === positionLiquidityBN) {
            console.log("   ✅ TheCellar.totalLiquidity matches Position Liquidity");
        } else {
            console.log(`   ⚠️  MISMATCH: TheCellar.totalLiquidity ≠ Position Liquidity`);
            console.log(`      TheCellar tracks: ${ethers.formatEther(totalLiquidity)}`);
            console.log(`      Actual position: ${ethers.formatEther(positionLiquidity)}`);
        }
        console.log();
    }

    // 7. Summary
    console.log("📋 SUMMARY:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (tokenId === 0n) {
        console.log("   • No liquidity position exists yet");
        console.log("   • CLP tokens: " + ethers.formatEther(clpTotalSupply));
        console.log("   • Users can add liquidity to create the position");
    } else {
        const position = await positionManager.positions(tokenId);
        const positionLiquidity = position.liquidity;

        console.log("   • Actual LP in Uniswap V3 Position:");
        console.log(`     ${ethers.formatEther(positionLiquidity)} liquidity units`);
        console.log("   • CLP Tokens (receipt tokens):");
        console.log(`     Total Supply: ${ethers.formatEther(clpTotalSupply)} CLP`);
        console.log(`     In User Wallets: ${ethers.formatEther(clpTotalSupply - clpInCellar)} CLP`);
        console.log("   • Pot (accumulated fees):");
        console.log(`     ${ethers.formatEther(potBalanceMON)} MON`);
        console.log(`     ${ethers.formatEther(potBalanceKEEP)} KEEP`);
        console.log();
        console.log("   💡 KEY INSIGHTS:");
        console.log("      • The 'Pool MON' display on the main page shows the actual");
        console.log("        token amounts in the Uniswap V3 pool position (correct).");
        console.log("      • CLP tokens in wallets represent user shares but don't");
        console.log("        affect the pool's actual liquidity until withdrawn.");
        console.log("      • If CLP supply > Position liquidity, some CLP may have been");
        console.log("        burned during raids (expected behavior).");
        console.log("      • If TheCellar.totalLiquidity ≠ Position liquidity, there");
        console.log("        may be a tracking issue or fees have accumulated.");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

