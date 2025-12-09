import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const CELLAR_TOKEN = "0x6eF142a2203102F6c58b0C15006BF9F6F5CFe39E";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";

const ERC20_ABI = ['function totalSupply() view returns (uint256)'];
const CELLAR_ABI = ['function tokenId() view returns (uint256)', 'function totalLiquidity() view returns (uint256)'];
const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
];

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 VERIFYING LP ACCOUNTING - STEP BY STEP");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const cellarToken = new ethers.Contract(CELLAR_TOKEN, ERC20_ABI, deployer);
    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, POSITION_MANAGER_ABI, deployer);

    const clpSupply = await cellarToken.totalSupply();
    const totalLiquidity = await cellar.totalLiquidity();
    const tokenId = await cellar.tokenId();

    if (tokenId === 0n) {
        console.log("No position exists.");
        return;
    }

    const position = await positionManager.positions(tokenId);
    const positionLiquidity = position.liquidity;

    console.log("📊 RAW VALUES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   CLP Total Supply: ${clpSupply.toString()}`);
    console.log(`   TheCellar.totalLiquidity: ${totalLiquidity.toString()}`);
    console.log(`   Position.liquidity: ${positionLiquidity.toString()}`);
    console.log();

    const clpSupplyBN = BigInt(clpSupply.toString());
    const totalLiquidityBN = BigInt(totalLiquidity.toString());
    const positionLiquidityBN = BigInt(positionLiquidity.toString());

    console.log("🧮 ACCOUNTING EQUATIONS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   From contract logic:");
    console.log("   • addLiquidity(): mints CLP 1:1 with liquidity, increases totalLiquidity");
    console.log("   • withdraw(): burns CLP, decreases totalLiquidity, removes LP");
    console.log("   • raid(): burns CLP, does NOT change totalLiquidity, does NOT remove LP");
    console.log();

    // Calculate what should have happened
    const clpBurnedInRaids = clpSupplyBN - totalLiquidityBN;
    const initialLiquidityMinted = totalLiquidityBN + clpBurnedInRaids;

    console.log("📐 CALCULATED VALUES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Initial Liquidity Minted: ${ethers.formatEther(initialLiquidityMinted)}`);
    console.log(`   (totalLiquidity + CLP burned in raids)`);
    console.log();
    console.log(`   CLP Burned in Raids: ${ethers.formatEther(clpBurnedInRaids)}`);
    console.log(`   (CLP Supply - totalLiquidity)`);
    console.log();
    console.log(`   Current CLP Supply: ${ethers.formatEther(clpSupplyBN)}`);
    console.log(`   Current totalLiquidity: ${ethers.formatEther(totalLiquidityBN)}`);
    console.log(`   Current Position Liquidity: ${ethers.formatEther(positionLiquidityBN)}`);
    console.log();

    // Check if they match expected formulas
    console.log("✅ VERIFICATION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Formula: CLP Supply = Initial Minted - Withdrawn - Raided
    // We know: Initial Minted = totalLiquidity + Raided
    // So: CLP Supply = totalLiquidity + Raided - Withdrawn - Raided = totalLiquidity - Withdrawn
    // Therefore: Withdrawn = totalLiquidity - CLP Supply

    const liquidityWithdrawn = totalLiquidityBN - clpSupplyBN;

    if (liquidityWithdrawn === 0n) {
        console.log(`   ✅ CLP Supply = totalLiquidity (no withdrawals)`);
    } else if (liquidityWithdrawn > 0n) {
        console.log(`   ⚠️  ISSUE: CLP Supply < totalLiquidity by ${ethers.formatEther(liquidityWithdrawn)}`);
        console.log(`       This means ${ethers.formatEther(liquidityWithdrawn)} CLP was burned without decreasing totalLiquidity`);
        console.log(`       This should NOT happen - withdrawals decrease both!`);
    } else {
        const excessCLP = -liquidityWithdrawn;
        console.log(`   ⚠️  ISSUE: CLP Supply > totalLiquidity by ${ethers.formatEther(excessCLP)}`);
        console.log(`       This means ${ethers.formatEther(excessCLP)} CLP exists without being tracked in totalLiquidity`);
        console.log(`       This suggests CLP was minted incorrectly OR totalLiquidity wasn't updated`);
    }
    console.log();

    // Check position liquidity
    const positionVsTotal = positionLiquidityBN - totalLiquidityBN;
    if (positionVsTotal === 0n) {
        console.log(`   ✅ Position Liquidity = totalLiquidity (no fees accumulated)`);
    } else if (positionVsTotal > 0n) {
        console.log(`   ✅ Position Liquidity > totalLiquidity by ${ethers.formatEther(positionVsTotal)}`);
        console.log(`       This is EXPECTED - fees accumulate in the position, increasing its value`);
    } else {
        console.log(`   ⚠️  Position Liquidity < totalLiquidity by ${ethers.formatEther(-positionVsTotal)}`);
        console.log(`       This suggests liquidity was removed from the position`);
    }
    console.log();

    // The key question: Can CLP Supply exceed Position Liquidity?
    const clpVsPosition = clpSupplyBN - positionLiquidityBN;
    if (clpVsPosition === 0n) {
        console.log(`   ✅ CLP Supply = Position Liquidity (perfect match!)`);
    } else if (clpVsPosition > 0n) {
        console.log(`   ⚠️  CRITICAL: CLP Supply > Position Liquidity by ${ethers.formatEther(clpVsPosition)}`);
        console.log(`       This means ${ethers.formatEther(clpVsPosition)} CLP tokens exist without backing LP!`);
        console.log(`       Possible causes:`);
        console.log(`       1. Liquidity was withdrawn but CLP wasn't burned`);
        console.log(`       2. Position liquidity decreased (unlikely for full range)`);
        console.log(`       3. CLP was minted incorrectly (more than liquidity added)`);
        console.log(`       4. Manual liquidity removal bypassing the contract`);
    } else {
        const positionExcess = -clpVsPosition;
        console.log(`   ✅ CLP Supply < Position Liquidity by ${ethers.formatEther(positionExcess)}`);
        console.log(`       This is EXPECTED - CLP was burned in raids, but LP stayed in pool`);
    }
    console.log();

    console.log("💡 THE REAL QUESTION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   How can CLP Supply (407.87) > Position Liquidity (383.75)?");
    console.log();
    console.log("   If withdrawals happened:");
    console.log("     • CLP should have been burned");
    console.log("     • totalLiquidity should have decreased");
    console.log("     • Position liquidity should have decreased");
    console.log();
    console.log("   Current state suggests:");
    console.log("     • 24.12 liquidity was removed from position");
    console.log("     • But CLP wasn't burned (or wasn't burned enough)");
    console.log("     • This is a BUG or accounting error");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

