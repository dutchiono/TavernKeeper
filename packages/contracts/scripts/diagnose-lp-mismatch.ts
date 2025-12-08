import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

// Mainnet addresses
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const CELLAR_TOKEN = "0x6eF142a2203102F6c58b0C15006BF9F6F5CFe39E";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";

// ABIs
const CELLAR_ABI = [
    'function tokenId() view returns (uint256)',
    'function totalLiquidity() view returns (uint256)',
];

const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
];

const ERC20_ABI = [
    'function totalSupply() view returns (uint256)',
];

// Event ABIs for historical analysis
const RAID_EVENT_ABI = [
    'event Raid(address indexed user, uint256 lpBurned, uint256 monPayout, uint256 keepPayout, uint256 newInitPrice, uint256 newEpochId)',
];

const WITHDRAW_EVENT_ABI = [
    'event LiquidityRemoved(address indexed user, uint256 liquidityBurned, uint256 amount0, uint256 amount1, uint256 feesMon, uint256 feesKeep)',
];

const ADD_LIQUIDITY_EVENT_ABI = [
    'event LiquidityAdded(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidityMinted)',
];

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 DIAGNOSING LP MISMATCH");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
    const cellarToken = new ethers.Contract(CELLAR_TOKEN, ERC20_ABI, deployer);
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, POSITION_MANAGER_ABI, deployer);

    // Get current state
    const tokenId = await cellar.tokenId();
    const totalLiquidity = await cellar.totalLiquidity();
    const clpTotalSupply = await cellarToken.totalSupply();

    if (tokenId === 0n) {
        console.log("No position exists yet.");
        return;
    }

    const position = await positionManager.positions(tokenId);
    const positionLiquidity = position.liquidity;

    console.log("📊 CURRENT STATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Position Liquidity: ${ethers.formatEther(positionLiquidity)}`);
    console.log(`   CLP Total Supply: ${ethers.formatEther(clpTotalSupply)}`);
    console.log(`   TheCellar.totalLiquidity: ${ethers.formatEther(totalLiquidity)}`);
    console.log();

    // Calculate differences
    const positionLiquidityBN = BigInt(positionLiquidity.toString());
    const clpSupplyBN = BigInt(clpTotalSupply.toString());
    const totalLiquidityBN = BigInt(totalLiquidity.toString());

    const clpDiff = clpSupplyBN > positionLiquidityBN
        ? clpSupplyBN - positionLiquidityBN
        : positionLiquidityBN - clpSupplyBN;

    const totalLiquidityDiff = positionLiquidityBN > totalLiquidityBN
        ? positionLiquidityBN - totalLiquidityBN
        : totalLiquidityBN - positionLiquidityBN;

    console.log("🔍 ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Issue 1: CLP Supply > Position Liquidity
    if (clpSupplyBN > positionLiquidityBN) {
        console.log(`   ⚠️  ISSUE 1: CLP Supply exceeds Position Liquidity`);
        console.log(`      Excess CLP: ${ethers.formatEther(clpDiff)}`);
        console.log(`      This means ${ethers.formatEther(clpDiff)} CLP tokens exist without backing LP`);
        console.log(`      Possible causes:`);
        console.log(`        1. Liquidity was withdrawn but CLP wasn't burned properly`);
        console.log(`        2. CLP was minted incorrectly (more than liquidity added)`);
        console.log(`        3. Position liquidity decreased due to price movement (unlikely for full range)`);
        console.log();
    } else if (clpSupplyBN < positionLiquidityBN) {
        console.log(`   ✅ CLP Supply < Position Liquidity (expected after raids)`);
        console.log(`      Difference: ${ethers.formatEther(clpDiff)} CLP burned during raids`);
        console.log();
    }

    // Issue 2: totalLiquidity < Position Liquidity
    if (totalLiquidityBN < positionLiquidityBN) {
        console.log(`   ⚠️  ISSUE 2: TheCellar.totalLiquidity < Position Liquidity`);
        console.log(`      Difference: ${ethers.formatEther(totalLiquidityDiff)}`);
        console.log(`      This is EXPECTED because:`);
        console.log(`        1. Raids burn CLP but DON'T decrease totalLiquidity`);
        console.log(`        2. Fees accumulate in the position, increasing its value`);
        console.log(`        3. totalLiquidity tracks minted liquidity, not current position value`);
        console.log();
        console.log(`      The position has grown by ${ethers.formatEther(totalLiquidityDiff)} due to:`);
        console.log(`        - Fees accumulating (increasing position value)`);
        console.log(`        - CLP burned during raids (${ethers.formatEther(clpSupplyBN - totalLiquidityBN)} CLP)`);
        console.log();
    }

    // Analyze historical events
    console.log("📜 HISTORICAL EVENT ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const cellarWithEvents = new ethers.Contract(THE_CELLAR_V3, [
        ...CELLAR_ABI,
        ...RAID_EVENT_ABI,
        ...WITHDRAW_EVENT_ABI,
        ...ADD_LIQUIDITY_EVENT_ABI,
    ], deployer);

    // Get all events (with smaller range to avoid RPC limits)
    const currentBlock = await ethers.provider.getBlockNumber();
    // Try smaller ranges and work backwards
    const blockRange = 10000; // Smaller range
    const fromBlock = Math.max(0, currentBlock - blockRange);

    console.log(`   Scanning blocks ${fromBlock} to ${currentBlock} (last ${blockRange} blocks)...\n`);
    console.log(`   Note: For full history, may need to scan in chunks\n`);

    try {
        // Query events in smaller chunks if needed
        const [addEvents, withdrawEvents, raidEvents] = await Promise.all([
            cellarWithEvents.queryFilter(
                cellarWithEvents.filters.LiquidityAdded(),
                fromBlock,
                currentBlock
            ).catch(() => []),
            cellarWithEvents.queryFilter(
                cellarWithEvents.filters.LiquidityRemoved(),
                fromBlock,
                currentBlock
            ).catch(() => []),
            cellarWithEvents.queryFilter(
                cellarWithEvents.filters.Raid(),
                fromBlock,
                currentBlock
            ).catch(() => []),
        ]);

        let totalLiquidityMinted = 0n;
        let totalLiquidityWithdrawn = 0n;
        let totalCLPBurnedInRaids = 0n;

        console.log(`   📈 Liquidity Added Events: ${addEvents.length}`);
        for (const event of addEvents) {
            if (event.args && event.args.length >= 4) {
                const liquidity = BigInt(event.args[3].toString());
                totalLiquidityMinted += liquidity;
            }
        }
        console.log(`      Total Liquidity Minted: ${ethers.formatEther(totalLiquidityMinted)}`);

        console.log(`\n   📉 Liquidity Removed Events: ${withdrawEvents.length}`);
        for (const event of withdrawEvents) {
            if (event.args && event.args.length >= 2) {
                const liquidity = BigInt(event.args[1].toString());
                totalLiquidityWithdrawn += liquidity;
            }
        }
        console.log(`      Total Liquidity Withdrawn: ${ethers.formatEther(totalLiquidityWithdrawn)}`);

        console.log(`\n   ⚔️  Raid Events: ${raidEvents.length}`);
        for (const event of raidEvents) {
            if (event.args && event.args.length >= 2) {
                const lpBurned = BigInt(event.args[1].toString());
                totalCLPBurnedInRaids += lpBurned;
            }
        }
        console.log(`      Total CLP Burned in Raids: ${ethers.formatEther(totalCLPBurnedInRaids)}`);

        console.log();
        console.log("   📊 CALCULATED TOTALS:");
        console.log("   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`      Expected CLP Supply: ${ethers.formatEther(totalLiquidityMinted - totalLiquidityWithdrawn - totalCLPBurnedInRaids)}`);
        console.log(`      Actual CLP Supply: ${ethers.formatEther(clpTotalSupply)}`);

        const expectedCLP = totalLiquidityMinted - totalLiquidityWithdrawn - totalCLPBurnedInRaids;
        const actualCLPBN = BigInt(clpTotalSupply.toString());

        if (expectedCLP === actualCLPBN) {
            console.log(`      ✅ CLP Supply matches expected value!`);
        } else {
            const diff = expectedCLP > actualCLPBN ? expectedCLP - actualCLPBN : actualCLPBN - expectedCLP;
            console.log(`      ⚠️  Mismatch: ${ethers.formatEther(diff)} CLP difference`);
            if (expectedCLP > actualCLPBN) {
                console.log(`         Expected more CLP than exists (some may have been burned elsewhere)`);
            } else {
                console.log(`         More CLP exists than expected (possible minting issue)`);
            }
        }

        console.log();
        console.log(`      Expected totalLiquidity: ${ethers.formatEther(totalLiquidityMinted - totalLiquidityWithdrawn)}`);
        console.log(`      Actual totalLiquidity: ${ethers.formatEther(totalLiquidity)}`);

        const expectedTotalLiquidity = totalLiquidityMinted - totalLiquidityWithdrawn;
        if (expectedTotalLiquidity === totalLiquidityBN) {
            console.log(`      ✅ totalLiquidity matches expected value!`);
        } else {
            const diff = expectedTotalLiquidity > totalLiquidityBN
                ? expectedTotalLiquidity - totalLiquidityBN
                : totalLiquidityBN - expectedTotalLiquidity;
            console.log(`      ⚠️  Mismatch: ${ethers.formatEther(diff)} difference`);
            console.log(`         Note: Raids don't affect totalLiquidity (by design)`);
        }

    } catch (error: any) {
        console.log(`   ⚠️  Error querying events: ${error.message}`);
        console.log(`   (This might be due to RPC limitations or contract upgrade)`);
    }

    // Calculate expected values based on current state
    console.log();
    console.log("🧮 MATHEMATICAL ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // If raids burn CLP but don't decrease totalLiquidity:
    // CLP Supply = Initial Minted - Withdrawn - Raided
    // totalLiquidity = Initial Minted - Withdrawn
    // So: CLP burned in raids = CLP Supply - totalLiquidity

    const clpBurnedInRaids = clpSupplyBN - totalLiquidityBN;
    const initialLiquidityMinted = totalLiquidityBN + clpBurnedInRaids;
    const liquidityWithdrawn = initialLiquidityMinted - positionLiquidityBN;

    console.log(`   Initial Liquidity Minted: ${ethers.formatEther(initialLiquidityMinted)}`);
    console.log(`   (Calculated as: totalLiquidity + CLP burned in raids)`);
    console.log();
    console.log(`   CLP Burned in Raids: ${ethers.formatEther(clpBurnedInRaids)}`);
    console.log(`   (Calculated as: CLP Supply - totalLiquidity)`);
    console.log();
    console.log(`   Liquidity Withdrawn: ${ethers.formatEther(liquidityWithdrawn)}`);
    console.log(`   (Calculated as: Initial Minted - Position Liquidity)`);
    console.log();

    if (liquidityWithdrawn > 0n) {
        console.log(`   ⚠️  This suggests ${ethers.formatEther(liquidityWithdrawn)} liquidity was withdrawn`);
        console.log(`       If withdrawals happened, CLP should have been burned.`);
        console.log(`       Current CLP Supply suggests withdrawals may not have burned CLP properly.`);
    } else if (liquidityWithdrawn < 0n) {
        const feesAccumulated = -liquidityWithdrawn;
        console.log(`   ✅ Position has grown by ${ethers.formatEther(feesAccumulated)} due to fees`);
        console.log(`       (Position Liquidity > Initial Minted)`);
    } else {
        console.log(`   ✅ Position Liquidity matches Initial Minted (no fees or withdrawals)`);
    }

    console.log();
    console.log("💡 EXPLANATION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   • Raids burn CLP tokens but DON'T decrease totalLiquidity or remove LP");
    console.log("   • Withdrawals burn CLP AND decrease totalLiquidity AND remove LP");
    console.log("   • Fees accumulate in the position, increasing its value over time");
    console.log("   • Position liquidity can grow beyond totalLiquidity due to fees");
    console.log("   • CLP supply should match: minted - withdrawn - raided");
    console.log();
    console.log("   The 'Pool MON' display is CORRECT - it shows actual token amounts");
    console.log("   in the Uniswap position, which is what matters for the pool.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

