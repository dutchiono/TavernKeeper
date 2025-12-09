import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

/**
 * Script to check where office payments are going
 *
 * Checks:
 * 1. Who is the owner of TavernKeeper contract
 * 2. What is the treasury address
 * 3. Recent TreasuryFee events to see where money went
 * 4. Balance of owner vs treasury
 *
 * Usage: npx hardhat run scripts/check-office-payments.ts --network monad
 */

const TAVERNKEEPER_PROXY = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS || "";

const TAVERNKEEPER_ABI = [
    "function owner() external view returns (address)",
    "function treasury() external view returns (address)",
    "function FEE() external view returns (uint256)",
    "function DIVISOR() external view returns (uint256)",
    "event TreasuryFee(address indexed treasury, uint256 amount)",
];

async function main() {
    const [signer] = await ethers.getSigners();
    const provider = signer.provider;
    if (!provider) {
        console.error("❌ No provider available");
        process.exit(1);
    }

    console.log("🔍 Checking Office Payment Distribution\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const tavernKeeper = new ethers.Contract(TAVERNKEEPER_PROXY, TAVERNKEEPER_ABI, provider);

    // 1. Check owner
    const owner = await tavernKeeper.owner();
    console.log(`📋 Contract Owner: ${owner}`);
    if (DEPLOYER_ADDRESS) {
        const matches = owner.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase();
        console.log(`   Expected Deployer: ${DEPLOYER_ADDRESS}`);
        console.log(`   Match: ${matches ? "✅ YES" : "❌ NO"}`);
    }
    console.log();

    // 2. Check treasury
    const treasury = await tavernKeeper.treasury();
    console.log(`💰 Treasury Address: ${treasury}`);
    if (treasury === ethers.ZeroAddress) {
        console.log("   ⚠️  Treasury is NOT SET - dev fee and cellar fee both go to owner!");
    }
    console.log();

    // 3. Check fee constants
    const FEE = await tavernKeeper.FEE();
    const DIVISOR = await tavernKeeper.DIVISOR();
    const feePercent = (Number(FEE) / Number(DIVISOR)) * 100;
    const devFeePercent = feePercent / 4; // devFee = totalFee / 4
    const cellarFeePercent = feePercent - devFeePercent;
    console.log(`📊 Fee Structure:`);
    console.log(`   Total Fee: ${feePercent}%`);
    console.log(`   Dev Fee (to owner): ${devFeePercent}%`);
    console.log(`   Cellar Fee (to treasury): ${cellarFeePercent}%`);
    console.log(`   Miner Fee (to previous king): ${100 - feePercent}%`);
    console.log();

    // 4. Check balances
    const ownerBalance = await provider.getBalance(owner);
    const treasuryBalance = treasury !== ethers.ZeroAddress ? await provider.getBalance(treasury) : 0n;
    console.log(`💵 Current Balances:`);
    console.log(`   Owner Balance: ${ethers.formatEther(ownerBalance)} MON`);
    if (treasury !== ethers.ZeroAddress) {
        console.log(`   Treasury Balance: ${ethers.formatEther(treasuryBalance)} MON`);
    }
    console.log();

    // 5. Check recent TreasuryFee events
    console.log(`📜 Checking Recent TreasuryFee Events (last 1000 blocks)...`);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);

    const filter = tavernKeeper.filters.TreasuryFee();
    const events = await tavernKeeper.queryFilter(filter, fromBlock, currentBlock);

    console.log(`   Found ${events.length} TreasuryFee events`);

    if (events.length > 0) {
        console.log(`\n   Recent Events:`);
        let totalTreasuryFees = 0n;
        for (let i = Math.max(0, events.length - 10); i < events.length; i++) {
            const event = events[i];
            const args = event.args;
            if (args) {
                const treasuryAddr = args[0];
                const amount = args[1];
                totalTreasuryFees += amount;
                const block = await provider.getBlock(event.blockNumber);
                const timestamp = new Date(block!.timestamp * 1000).toISOString();
                console.log(`   [${timestamp}] ${ethers.formatEther(amount)} MON → ${treasuryAddr}`);
            }
        }
        console.log(`\n   Total Treasury Fees (last 1000 blocks): ${ethers.formatEther(totalTreasuryFees)} MON`);
    } else {
        console.log(`   ⚠️  No TreasuryFee events found in last 1000 blocks`);
    }
    console.log();

    // 6. Calculate expected dev fees from recent takeOffice transactions
    console.log(`🔍 Checking Recent takeOffice Transactions...`);
    const takeOfficeInterface = new ethers.Interface([
        "function takeOffice(uint256 epochId, uint256 deadline, uint256 maxPrice, string memory uri) payable",
    ]);

    // Get recent transactions to the contract
    const recentTxs: any[] = [];
    for (let blockNum = currentBlock; blockNum >= fromBlock && recentTxs.length < 20; blockNum--) {
        try {
            const block = await provider.getBlock(blockNum, true);
            if (block && block.transactions) {
                for (const txHash of block.transactions) {
                    if (typeof txHash === 'string') {
                        const tx = await provider.getTransaction(txHash);
                        if (tx && tx.to && tx.to.toLowerCase() === TAVERNKEEPER_PROXY.toLowerCase() && tx.value > 0n) {
                            try {
                                const decoded = takeOfficeInterface.parseTransaction({ data: tx.data, value: tx.value });
                                if (decoded && decoded.name === 'takeOffice') {
                                    recentTxs.push({ tx, decoded, blockNum });
                                }
                            } catch {
                                // Not a takeOffice call, skip
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // Skip block if error
        }
    }

    console.log(`   Found ${recentTxs.length} recent takeOffice transactions`);

    if (recentTxs.length > 0) {
        let totalPaid = 0n;
        let expectedDevFee = 0n;
        let expectedCellarFee = 0n;

        console.log(`\n   Recent Transactions:`);
        for (const { tx, blockNum } of recentTxs.slice(-10)) {
            const price = tx.value;
            const totalFee = (price * FEE) / DIVISOR;
            const devFee = totalFee / 4n;
            const cellarFee = totalFee - devFee;

            totalPaid += price;
            expectedDevFee += devFee;
            expectedCellarFee += cellarFee;

            const block = await provider.getBlock(blockNum);
            const timestamp = block ? new Date(block.timestamp * 1000).toISOString() : 'unknown';
            console.log(`   [${timestamp}] Block ${blockNum}: Paid ${ethers.formatEther(price)} MON`);
            console.log(`      Expected Dev Fee: ${ethers.formatEther(devFee)} MON → ${owner}`);
            if (treasury !== ethers.ZeroAddress) {
                console.log(`      Expected Cellar Fee: ${ethers.formatEther(cellarFee)} MON → ${treasury}`);
            } else {
                console.log(`      Expected Cellar Fee: ${ethers.formatEther(cellarFee)} MON → ${owner} (treasury not set)`);
            }
        }

        console.log(`\n   Summary (last ${recentTxs.length} transactions):`);
        console.log(`   Total Paid: ${ethers.formatEther(totalPaid)} MON`);
        console.log(`   Expected Dev Fees: ${ethers.formatEther(expectedDevFee)} MON → ${owner}`);
        if (treasury !== ethers.ZeroAddress) {
            console.log(`   Expected Cellar Fees: ${ethers.formatEther(expectedCellarFee)} MON → ${treasury}`);
        } else {
            console.log(`   Expected Cellar Fees: ${ethers.formatEther(expectedCellarFee)} MON → ${owner} (treasury not set)`);
        }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Payment check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

