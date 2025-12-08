import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

// Mainnet addresses
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const CELLAR_TOKEN = "0x6eF142a2203102F6c58b0C15006BF9F6F5CFe39E";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";

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

// Event ABIs
const ADD_LIQUIDITY_EVENT_ABI = [
    'event LiquidityAdded(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidityMinted)',
];

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 ANALYZING CLP DISTRIBUTION & ACCOUNTING");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    const cellarToken = new ethers.Contract(CELLAR_TOKEN, ERC20_ABI, deployer);
    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, POSITION_MANAGER_ABI, deployer);

    // Get current state
    const totalCLPSupply = await cellarToken.totalSupply();
    const tokenId = await cellar.tokenId();
    const totalLiquidity = await cellar.totalLiquidity();

    console.log("📊 CURRENT STATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   CLP Total Supply: ${ethers.formatEther(totalCLPSupply)} CLP`);
    console.log(`   TheCellar.totalLiquidity: ${ethers.formatEther(totalLiquidity)}`);

    if (tokenId === 0n) {
        console.log("   ⚠️  No position exists yet.");
        return;
    }

    const position = await positionManager.positions(tokenId);
    const positionLiquidity = position.liquidity;
    console.log(`   Position Liquidity: ${ethers.formatEther(positionLiquidity)}`);
    console.log();

    // Calculate the mismatch
    const positionLiquidityBN = BigInt(positionLiquidity.toString());
    const clpSupplyBN = BigInt(totalCLPSupply.toString());
    const totalLiquidityBN = BigInt(totalLiquidity.toString());

    const excessCLP = clpSupplyBN - positionLiquidityBN;
    const clpBurnedInRaids = clpSupplyBN - totalLiquidityBN;

    console.log("🧮 ACCOUNTING BREAKDOWN:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Initial CLP Minted: ${ethers.formatEther(totalLiquidityBN + clpBurnedInRaids)} CLP`);
    console.log(`   (Calculated as: totalLiquidity + CLP burned in raids)`);
    console.log();
    console.log(`   CLP Burned in Raids: ${ethers.formatEther(clpBurnedInRaids)} CLP`);
    console.log(`   (Calculated as: CLP Supply - totalLiquidity)`);
    console.log();
    console.log(`   Current CLP Supply: ${ethers.formatEther(clpSupplyBN)} CLP`);
    console.log(`   Current Position Liquidity: ${ethers.formatEther(positionLiquidityBN)}`);
    console.log();

    if (excessCLP > 0n) {
        console.log(`   ⚠️  EXCESS CLP: ${ethers.formatEther(excessCLP)} CLP`);
        console.log(`      This CLP exists without backing LP`);
        console.log();
        console.log(`   Possible explanations:`);
        console.log(`   1. Liquidity was withdrawn but CLP wasn't burned (bug)`);
        console.log(`   2. Position liquidity decreased due to fees being collected`);
        console.log(`   3. Manual liquidity removal bypassing the contract`);
        console.log();
    }

    // Try to find addresses with significant CLP balances by checking recent events
    console.log("🔍 SEARCHING FOR CLP HOLDERS (via recent events):");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const cellarWithEvents = new ethers.Contract(THE_CELLAR_V3, [
        ...CELLAR_ABI,
        ...ADD_LIQUIDITY_EVENT_ABI,
    ], deployer);

    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 50000); // Last 50k blocks

    try {
        const addEvents = await cellarWithEvents.queryFilter(
            cellarWithEvents.filters.LiquidityAdded(),
            fromBlock,
            currentBlock
        ).catch(() => []);

        console.log(`   Found ${addEvents.length} LiquidityAdded events in last 50k blocks\n`);

        // Collect unique addresses and their total liquidity added
        const addressMap = new Map<string, bigint>();
        let totalLiquidityFromEvents = 0n;

        for (const event of addEvents) {
            if (event.args && event.args.length >= 4) {
                const user = event.args[0] as string;
                const liquidity = BigInt(event.args[3].toString());

                const current = addressMap.get(user) || 0n;
                addressMap.set(user, current + liquidity);
                totalLiquidityFromEvents += liquidity;
            }
        }

        // Check balances for addresses that added liquidity
        console.log(`   Checking CLP balances for ${addressMap.size} addresses...\n`);

        const holders: Array<{ address: string; clpBalance: bigint; liquidityAdded: bigint }> = [];

        for (const [address, liquidityAdded] of addressMap.entries()) {
            try {
                const balance = await cellarToken.balanceOf(address);
                if (balance > 0n) {
                    holders.push({ address, clpBalance: balance, liquidityAdded });
                }
            } catch (error) {
                // Skip if we can't check balance
            }
        }

        // Sort by CLP balance descending
        holders.sort((a, b) => {
            if (a.clpBalance > b.clpBalance) return -1;
            if (a.clpBalance < b.clpBalance) return 1;
            return 0;
        });

        console.log(`   Top CLP Holders (from recent events):`);
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        let totalChecked = 0n;
        for (let i = 0; i < Math.min(10, holders.length); i++) {
            const holder = holders[i];
            const share = (Number(holder.clpBalance) * 100) / Number(clpSupplyBN);
            totalChecked += holder.clpBalance;

            console.log(`   ${i + 1}. ${holder.address}`);
            console.log(`      CLP Balance: ${ethers.formatEther(holder.clpBalance)} CLP (${share.toFixed(2)}%)`);
            console.log(`      Liquidity Added: ${ethers.formatEther(holder.liquidityAdded)}`);
            console.log();
        }

        console.log(`   Total CLP checked: ${ethers.formatEther(totalChecked)} CLP`);
        console.log(`   Total CLP Supply: ${ethers.formatEther(clpSupplyBN)} CLP`);
        console.log(`   Coverage: ${((Number(totalChecked) * 100) / Number(clpSupplyBN)).toFixed(2)}%`);
        console.log();

    } catch (error: any) {
        console.log(`   ⚠️  Error querying events: ${error.message}`);
    }

    console.log("💡 KEY INSIGHTS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   • CLP tokens are receipt tokens - they exist in wallets after minting`);
    console.log(`   • Users don't have to raid - CLP can sit in wallets indefinitely`);
    console.log(`   • The "Pool MON" display shows actual LP in Uniswap (${ethers.formatEther(positionLiquidityBN)})`);
    console.log(`   • Your wallet's CLP balance (269.85) represents your share`);
    console.log(`   • If CLP Supply > Position Liquidity, some CLP may not be withdrawable`);
    console.log(`   • This is an accounting issue, not a display issue`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

