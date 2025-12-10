import { ethers } from "hardhat";

/**
 * Check TheCellarV3 pot status and diagnose issues
 *
 * Usage:
 *   npx hardhat run scripts/check_cellar_v3_pot.ts --network monad
 */

const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const TAVERN_KEEPER = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

const THE_CELLAR_V3_ABI = [
    "function potBalanceMON() external view returns (uint256)",
    "function potBalanceKEEP() external view returns (uint256)",
    "function wmon() external view returns (address)",
    "function keepToken() external view returns (address)",
    "function tokenId() external view returns (uint256)",
    "function owner() external view returns (address)",
    "event FeesCollected(uint256 monAmount, uint256 keepAmount)",
];

async function main() {
    console.log("=== CHECKING THE CELLAR V3 POT ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("TheCellarV3:", THE_CELLAR_V3);
    console.log("");

    const cellar = await ethers.getContractAt(THE_CELLAR_V3_ABI, THE_CELLAR_V3);

    // 1. Check pot balances
    console.log("--- POT BALANCES ---");
    const potBalanceMON = await cellar.potBalanceMON();
    const potBalanceKEEP = await cellar.potBalanceKEEP();
    console.log("Pot MON:", ethers.formatEther(potBalanceMON), "MON");
    console.log("Pot KEEP:", ethers.formatEther(potBalanceKEEP), "KEEP");
    console.log("");

    // 2. Check contract balances
    console.log("--- CONTRACT BALANCES ---");
    const contractMONBalance = await ethers.provider.getBalance(THE_CELLAR_V3);
    console.log("Contract Native MON:", ethers.formatEther(contractMONBalance), "MON");

    const WMONContract = await ethers.getContractAt("IERC20", WMON);
    const wmonBalance = await WMONContract.balanceOf(THE_CELLAR_V3);
    console.log("Contract WMON Balance:", ethers.formatEther(wmonBalance), "WMON");

    const KEEPContract = await ethers.getContractAt("IERC20", KEEP);
    const keepBalance = await KEEPContract.balanceOf(THE_CELLAR_V3);
    console.log("Contract KEEP Balance:", ethers.formatEther(keepBalance), "KEEP");
    console.log("");

    // 3. Check if receive() is working
    console.log("--- RECEIVE() FUNCTION STATUS ---");
    if (contractMONBalance > 0n && potBalanceMON === 0n) {
        console.log("⚠️  PROBLEM: Contract has MON but potBalanceMON is 0!");
        console.log("   This means receive() is NOT updating potBalanceMON");
        console.log("   Possible causes:");
        console.log("   1. WMON deposit() is failing");
        console.log("   2. receive() is reverting");
        console.log("   3. Pot balance was reset/cleared");
    } else if (contractMONBalance === 0n && potBalanceMON === 0n) {
        console.log("ℹ️  Contract has no MON and pot is empty");
        console.log("   This could mean:");
        console.log("   1. No fees have been sent recently");
        console.log("   2. All MON was wrapped to WMON (check WMON balance)");
    } else if (contractMONBalance === 0n && potBalanceMON > 0n) {
        console.log("✅ Pot has MON but contract balance is 0");
        console.log("   This is normal - MON was wrapped to WMON");
    } else {
        console.log("✅ Contract has MON and potBalanceMON matches");
    }
    console.log("");

    // 4. Check TavernKeeper treasury
    console.log("--- TAVERN KEEPER CONFIGURATION ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(TAVERN_KEEPER);
    const treasury = await tavernKeeper.treasury();
    console.log("TavernKeeper Treasury:", treasury);
    console.log("Expected (TheCellarV3):", THE_CELLAR_V3);
    if (treasury.toLowerCase() === THE_CELLAR_V3.toLowerCase()) {
        console.log("✅ Treasury is correctly set to TheCellarV3");
    } else {
        console.log("❌ PROBLEM: Treasury is NOT set to TheCellarV3!");
        console.log("   Fees are going to:", treasury);
    }
    console.log("");

    // 5. Check recent TreasuryFee events
    console.log("--- RECENT TREASURY FEE EVENTS (Last 1000 blocks) ---");
    try {
        const blockNumber = await ethers.provider.getBlockNumber();
        const fromBlock = Math.max(0, blockNumber - 1000);
        const filter = tavernKeeper.filters.TreasuryFee();
        const events = await tavernKeeper.queryFilter(filter, fromBlock, blockNumber);

        if (events.length === 0) {
            console.log("No TreasuryFee events found in last 1000 blocks");
            console.log("   This could mean:");
            console.log("   1. No one has taken office recently");
            console.log("   2. Office fees are 0 (price too low)");
        } else {
            console.log(`Found ${events.length} TreasuryFee event(s):\n`);
            let totalFees = 0n;
            for (const event of events.slice(-10)) {
                const amount = event.args.amount || 0n;
                totalFees += amount;
                const block = await ethers.provider.getBlock(event.blockNumber);
                console.log(`  Block ${event.blockNumber} (${new Date(Number(block?.timestamp || 0) * 1000).toISOString()}):`);
                console.log(`    Treasury: ${event.args.treasury}`);
                console.log(`    Amount: ${ethers.formatEther(amount)} MON`);
                if (event.args.treasury.toLowerCase() !== THE_CELLAR_V3.toLowerCase()) {
                    console.log(`    ⚠️  Going to wrong address! Should be ${THE_CELLAR_V3}`);
                }
                console.log("");
            }
            console.log(`Total Fees Sent (last 10 events): ${ethers.formatEther(totalFees)} MON`);
        }
    } catch (e: any) {
        console.log("Error querying events:", e.message);
    }

    // 6. Check recent FeesCollected events from TheCellarV3
    console.log("--- RECENT FEES COLLECTED EVENTS (Last 1000 blocks) ---");
    try {
        const blockNumber = await ethers.provider.getBlockNumber();
        const fromBlock = Math.max(0, blockNumber - 1000);
        const filter = cellar.filters.FeesCollected();
        const events = await cellar.queryFilter(filter, fromBlock, blockNumber);

        if (events.length === 0) {
            console.log("No FeesCollected events found");
            console.log("   This means receive() hasn't been called recently");
        } else {
            console.log(`Found ${events.length} FeesCollected event(s):\n`);
            let totalCollected = 0n;
            for (const event of events.slice(-10)) {
                const monAmount = event.args.monAmount || 0n;
                const keepAmount = event.args.keepAmount || 0n;
                totalCollected += monAmount;
                const block = await ethers.provider.getBlock(event.blockNumber);
                console.log(`  Block ${event.blockNumber} (${new Date(Number(block?.timestamp || 0) * 1000).toISOString()}):`);
                console.log(`    MON: ${ethers.formatEther(monAmount)} MON`);
                console.log(`    KEEP: ${ethers.formatEther(keepAmount)} KEEP`);
                console.log("");
            }
            console.log(`Total Collected (last 10 events): ${ethers.formatEther(totalCollected)} MON`);
        }
    } catch (e: any) {
        console.log("Error querying FeesCollected events:", e.message);
    }

    // 7. Summary
    console.log("\n=== SUMMARY ===");
    if (potBalanceMON === 0n && potBalanceKEEP === 0n) {
        console.log("⚠️  POT IS EMPTY");
        if (contractMONBalance > 0n) {
            console.log("   But contract has MON - receive() may be broken!");
        } else {
            console.log("   No MON in contract - check if fees are being sent");
        }
    } else {
        console.log(`✅ Pot has funds: ${ethers.formatEther(potBalanceMON)} MON, ${ethers.formatEther(potBalanceKEEP)} KEEP`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exitCode = 1;
    });

