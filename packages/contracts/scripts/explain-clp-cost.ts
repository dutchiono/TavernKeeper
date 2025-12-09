import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

const CELLAR_ABI = [
    'event LiquidityAdded(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidityMinted)'
];

async function main() {
    console.log("🔍 EXPLAINING CLP COST CONFUSION\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);

    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);

    const events = await cellar.queryFilter(
        cellar.filters.LiquidityAdded(),
        fromBlock,
        currentBlock
    );

    if (events.length === 0) {
        console.log("No events found.");
        return;
    }

    // Use the most recent event
    const latestEvent = events[events.length - 1];
    const amount0 = BigInt(latestEvent.args![1].toString());
    const amount1 = BigInt(latestEvent.args![2].toString());
    const liquidity = BigInt(latestEvent.args![3].toString());

    console.log("📊 REAL EXAMPLE FROM CHAIN:");
    console.log(`   ${ethers.formatEther(amount0)} MON + ${ethers.formatEther(amount1)} KEEP`);
    console.log(`   = ${liquidity.toString()} liquidity units`);
    console.log(`   = ${liquidity.toString()} CLP tokens minted (1:1 ratio)\n`);

    console.log("💰 WHAT THIS MEANS:");
    console.log(`   To get ${liquidity.toString()} CLP tokens, someone paid:`);
    console.log(`   • ${ethers.formatEther(amount0)} MON`);
    console.log(`   • ${ethers.formatEther(amount1)} KEEP\n`);

    // Calculate for 921 CLP
    const monFor921 = (amount0 * 921n) / liquidity;
    const keepFor921 = (amount1 * 921n) / liquidity;

    console.log("🎯 FOR 921 CLP TOKENS:");
    console.log(`   MON needed: ${ethers.formatEther(monFor921)}`);
    console.log(`   KEEP needed: ${ethers.formatEther(keepFor921)}\n`);

    // Now explain the confusion
    console.log("⚠️  THE CONFUSION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("The UI shows 'CELLAR PRICE: 802.22 LP' - this is the RAID PRICE!");
    console.log("That means: 'Burn 802.22 CLP tokens to get the pot'\n");

    console.log("This is NOT the mint cost. The mint cost is:");
    console.log(`   To mint 921 CLP: ${ethers.formatEther(monFor921)} MON + ${ethers.formatEther(keepFor921)} KEEP\n`);

    // Show what 802 CLP would cost to mint
    const monFor802 = (amount0 * 802n) / liquidity;
    const keepFor802 = (amount1 * 802n) / liquidity;

    console.log("🔍 TO MINT 802 CLP (the raid price amount):");
    console.log(`   MON needed: ${ethers.formatEther(monFor802)}`);
    console.log(`   KEEP needed: ${ethers.formatEther(keepFor802)}`);
    console.log(`   Total value: ~${ethers.formatEther(monFor802 + (keepFor802 * ethers.parseEther("0.253") / ethers.parseEther("1")))} MON equivalent\n`);

    console.log("📋 SUMMARY:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. RAID PRICE (what UI shows): 802.22 CLP tokens to BURN to get pot");
    console.log("2. MINT COST (what you're asking): How much MON+KEEP to GET CLP tokens");
    console.log("3. The mint cost IS tiny because liquidity units are huge numbers");
    console.log("4. But to RAID, you need 802 CLP, which costs real money to acquire!\n");

    console.log("💡 THE REAL QUESTION:");
    console.log("If someone wants to raid (needs 802 CLP), they need to either:");
    console.log("  A) Mint 802 CLP by adding liquidity (costs MON+KEEP)");
    console.log("  B) Buy 802 CLP from someone else");
    console.log(`  C) Already have 802 CLP from previous mints\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

