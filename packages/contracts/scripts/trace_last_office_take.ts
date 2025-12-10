import { ethers } from "hardhat";

/**
 * Trace the LAST office take and see where the money went
 *
 * Usage:
 *   npx hardhat run scripts/trace_last_office_take.ts --network monad
 */

const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const TAVERN_KEEPER = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";

async function main() {
    console.log("=== TRACING LAST OFFICE TAKE ===\n");

    const [deployer] = await ethers.getSigners();
    const provider = deployer.provider!;
    const blockNumber = await provider.getBlockNumber();

    // Get TavernKeeper contract
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(TAVERN_KEEPER);

    // Find the most recent TreasuryFee event
    console.log("Searching for most recent TreasuryFee event...\n");

    let lastEvent = null;
    let searchRange = 1000;
    let found = false;

    // Search backwards in chunks
    for (let start = blockNumber; start > 0 && !found; start -= searchRange) {
        const fromBlock = Math.max(0, start - searchRange);
        try {
            const filter = tavernKeeper.filters.TreasuryFee();
            const events = await tavernKeeper.queryFilter(filter, fromBlock, start);

            if (events.length > 0) {
                // Get the most recent one
                lastEvent = events[events.length - 1];
                found = true;
                break;
            }
        } catch (e: any) {
            console.log(`Error searching blocks ${fromBlock}-${start}: ${e.message}`);
        }
    }

    if (!lastEvent) {
        console.log("❌ No TreasuryFee events found!");
        return;
    }

    console.log("✅ Found most recent TreasuryFee event:");
    console.log(`   Block: ${lastEvent.blockNumber}`);
    console.log(`   Transaction: ${lastEvent.transactionHash}`);
    console.log(`   Treasury: ${lastEvent.args.treasury}`);
    console.log(`   Amount: ${ethers.formatEther(lastEvent.args.amount)} MON`);
    console.log("");

    // Get the transaction receipt
    const receipt = await provider.getTransactionReceipt(lastEvent.transactionHash);
    if (!receipt) {
        console.log("❌ Could not get transaction receipt");
        return;
    }

    console.log("=== TRANSACTION DETAILS ===");
    console.log(`From: ${receipt.from}`);
    console.log(`To: ${receipt.to}`);
    console.log(`Value: ${ethers.formatEther(receipt.value || 0n)} MON`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Status: ${receipt.status === 1 ? "✅ Success" : "❌ Failed"}`);
    console.log("");

    // Check all internal transactions/transfers
    console.log("=== TRACING FUND FLOW ===");

    // Get the block
    const block = await provider.getBlock(receipt.blockNumber);
    console.log(`Block Timestamp: ${new Date(Number(block?.timestamp || 0) * 1000).toISOString()}`);
    console.log("");

    // Check logs for transfers
    console.log("Checking transaction logs for transfers...\n");

    const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
    const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

    // ERC20 Transfer event signature
    const transferEventSig = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    for (const log of receipt.logs) {
        // Check if it's a Transfer event
        if (log.topics[0] === transferEventSig) {
            const from = "0x" + log.topics[1].slice(26);
            const to = "0x" + log.topics[2].slice(26);

            // Try to decode amount
            let amount = 0n;
            try {
                amount = BigInt(log.data);
            } catch (e) {
                // Skip if can't decode
                continue;
            }

            if (log.address.toLowerCase() === WMON.toLowerCase()) {
                console.log(`WMON Transfer:`);
                console.log(`   From: ${from}`);
                console.log(`   To: ${to}`);
                console.log(`   Amount: ${ethers.formatEther(amount)} WMON`);
                if (to.toLowerCase() === THE_CELLAR_V3.toLowerCase()) {
                    console.log(`   ✅ Sent to TheCellarV3`);
                }
                console.log("");
            } else if (log.address.toLowerCase() === KEEP.toLowerCase()) {
                console.log(`KEEP Transfer:`);
                console.log(`   From: ${from}`);
                console.log(`   To: ${to}`);
                console.log(`   Amount: ${ethers.formatEther(amount)} KEEP`);
                if (to.toLowerCase() === THE_CELLAR_V3.toLowerCase()) {
                    console.log(`   ✅ Sent to TheCellarV3`);
                }
                console.log("");
            }
        }
    }

    // Check for native MON transfers (check balance changes)
    console.log("=== CHECKING NATIVE MON TRANSFERS ===");
    console.log(`Checking if native MON was sent to TheCellarV3...\n`);

    // Get balance before and after
    const blockBefore = receipt.blockNumber - 1;
    const blockAfter = receipt.blockNumber;

    try {
        const balanceBefore = await provider.getBalance(THE_CELLAR_V3, blockBefore);
        const balanceAfter = await provider.getBalance(THE_CELLAR_V3, blockAfter);
        const balanceChange = balanceAfter - balanceBefore;

        console.log(`TheCellarV3 Balance Before: ${ethers.formatEther(balanceBefore)} MON`);
        console.log(`TheCellarV3 Balance After: ${ethers.formatEther(balanceAfter)} MON`);
        console.log(`Balance Change: ${ethers.formatEther(balanceChange)} MON`);

        if (balanceChange > 0n) {
            console.log(`✅ Native MON was received by TheCellarV3`);
        } else if (balanceChange < 0n) {
            console.log(`⚠️  MON was withdrawn from TheCellarV3!`);
        } else {
            console.log(`ℹ️  No native MON balance change`);
        }
        console.log("");
    } catch (e: any) {
        console.log(`Error checking balance: ${e.message}`);
    }

    // Check for FeesCollected event from TheCellarV3 in the same block
    console.log("=== CHECKING FOR FEESCOLLECTED EVENT ===");
    try {
        const TheCellarV3 = await ethers.getContractAt(
            ["event FeesCollected(uint256 monAmount, uint256 keepAmount)"],
            THE_CELLAR_V3
        );

        const feesFilter = TheCellarV3.filters.FeesCollected();
        const feesEvents = await TheCellarV3.queryFilter(feesFilter, receipt.blockNumber, receipt.blockNumber);

        if (feesEvents.length > 0) {
            console.log(`✅ Found ${feesEvents.length} FeesCollected event(s) in same block:`);
            for (const event of feesEvents) {
                console.log(`   MON: ${ethers.formatEther(event.args.monAmount)} MON`);
                console.log(`   KEEP: ${ethers.formatEther(event.args.keepAmount)} KEEP`);
            }
        } else {
            console.log(`❌ No FeesCollected event found in block ${receipt.blockNumber}`);
            console.log(`   This means receive() may not have been called or failed!`);
        }
        console.log("");
    } catch (e: any) {
        console.log(`Error checking FeesCollected: ${e.message}`);
    }

    // Check for Raid events in the same block or next few blocks
    console.log("=== CHECKING FOR RAID EVENTS (SAME BLOCK AND AFTER) ===");
    try {
        const TheCellarV3 = await ethers.getContractAt(
            ["event Raid(address indexed user, uint256 lpBurned, uint256 wmonPayout, uint256 keepPayout, uint256 newInitPrice, uint256 newEpochId)"],
            THE_CELLAR_V3
        );

        const raidFilter = TheCellarV3.filters.Raid();
        // Check same block and next 1000 blocks after the fee event
        const raidEvents = await TheCellarV3.queryFilter(raidFilter, receipt.blockNumber, receipt.blockNumber + 1000);

        if (raidEvents.length > 0) {
            console.log(`⚠️  Found ${raidEvents.length} Raid event(s) shortly after:`);
            for (const event of raidEvents) {
                const raidReceipt = await provider.getTransactionReceipt(event.transactionHash);
                const raidBlock = await provider.getBlock(event.blockNumber);
                console.log(`\n   Block: ${event.blockNumber} (${new Date(Number(raidBlock?.timestamp || 0) * 1000).toISOString()})`);
                console.log(`   Transaction: ${event.transactionHash}`);
                console.log(`   User: ${event.args.user}`);
                console.log(`   LP Burned: ${ethers.formatEther(event.args.lpBurned)} CLP`);
                console.log(`   WMON Payout: ${ethers.formatEther(event.args.wmonPayout)} WMON`);
                console.log(`   KEEP Payout: ${ethers.formatEther(event.args.keepPayout)} KEEP`);
                console.log(`   ⚠️  THIS IS WHERE THE POT WENT!`);
            }
        } else {
            console.log(`✅ No Raid events found in same block or next 1000 blocks`);
        }
        console.log("");
    } catch (e: any) {
        console.log(`Error checking Raid events: ${e.message}`);
    }

    // Check pot state at the time of the fee event
    console.log("=== CHECKING POT STATE AT TIME OF FEE ===");
    try {
        const cellar = await ethers.getContractAt(
            [
                "function potBalanceMON() view returns (uint256)",
                "function potBalanceKEEP() view returns (uint256)"
            ],
            THE_CELLAR_V3
        );

        // Check pot before the transaction
        const potMONBefore = await cellar.potBalanceMON({ blockTag: receipt.blockNumber - 1 });
        const potKEEPBefore = await cellar.potBalanceKEEP({ blockTag: receipt.blockNumber - 1 });

        // Check pot after the transaction
        const potMONAfter = await cellar.potBalanceMON({ blockTag: receipt.blockNumber });
        const potKEEPAfter = await cellar.potBalanceKEEP({ blockTag: receipt.blockNumber });

        console.log(`Pot MON Before: ${ethers.formatEther(potMONBefore)} MON`);
        console.log(`Pot MON After: ${ethers.formatEther(potMONAfter)} MON`);
        console.log(`Pot KEEP Before: ${ethers.formatEther(potKEEPBefore)} KEEP`);
        console.log(`Pot KEEP After: ${ethers.formatEther(potKEEPAfter)} KEEP`);

        const feeAmount = lastEvent.args.amount;
        const expectedPotAfter = potMONBefore + feeAmount;

        if (potMONAfter !== expectedPotAfter) {
            console.log(`\n⚠️  PROBLEM: Pot should be ${ethers.formatEther(expectedPotAfter)} MON but is ${ethers.formatEther(potMONAfter)} MON`);
            console.log(`   Difference: ${ethers.formatEther(expectedPotAfter - potMONAfter)} MON`);
        } else {
            console.log(`\n✅ Pot was correctly updated by receive()`);
        }

        // Check current pot state
        console.log("\n=== CURRENT POT STATE ===");
        const potMON = await cellar.potBalanceMON();
        const potKEEP = await cellar.potBalanceKEEP();

        console.log(`Current Pot MON: ${ethers.formatEther(potMON)} MON`);
        console.log(`Current Pot KEEP: ${ethers.formatEther(potKEEP)} KEEP`);

        if (potMON === 0n && feeAmount > 0n) {
            console.log(`\n⚠️  PROBLEM: Fee was ${ethers.formatEther(feeAmount)} MON but pot is now empty!`);
            console.log(`   The pot was either raided or drained after the fee was received.`);
        }
    } catch (e: any) {
        console.log(`Error checking pot state: ${e.message}`);
    }

    console.log("\n=== SUMMARY ===");
    console.log(`Last office take: Block ${lastEvent.blockNumber}, ${ethers.formatEther(lastEvent.args.amount)} MON`);
    console.log(`Treasury address: ${lastEvent.args.treasury}`);
    if (lastEvent.args.treasury.toLowerCase() !== THE_CELLAR_V3.toLowerCase()) {
        console.log(`❌ PROBLEM: Treasury is NOT TheCellarV3!`);
    } else {
        console.log(`✅ Treasury is correctly set to TheCellarV3`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exitCode = 1;
    });

