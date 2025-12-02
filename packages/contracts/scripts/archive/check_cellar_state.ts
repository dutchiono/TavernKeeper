import * as fs from "fs";
import { ethers } from "hardhat";
import * as path from "path";

async function main() {
    console.log("\n============================================");
    console.log("CELLAR STATE CHECK");
    console.log("============================================\n");

    // Test RPC connection first
    try {
        const blockNumber = await ethers.provider.getBlockNumber();
        console.log("✓ Connected to network. Latest block:", blockNumber);
        console.log("");
    } catch (error: any) {
        console.error("✗ Failed to connect to network:", error.message);
        process.exit(1);
    }

    const [deployer] = await ethers.getSigners();
    console.log("Checking with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MON\n");

    // Get contract addresses (from addresses.ts)
    const tavernKeeperAddress = process.env.TAVERN_KEEPER_PROXY || "0x311d8722A5cE11DF157D7a9d414bbeC2640c5Fb2";
    const cellarAddress = process.env.THE_CELLAR_ADDRESS || "0x41ceC2cE651D37830af8FD94a35d23d428F80aC0";

    console.log("Contract Addresses:");
    console.log("  TavernKeeper:", tavernKeeperAddress);
    console.log("  TheCellar:", cellarAddress);
    console.log("");

    // Check TavernKeeper treasury
    console.log("--- TavernKeeper State ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(tavernKeeperAddress);

    try {
        const treasury = await tavernKeeper.treasury();
        console.log("  Treasury Address:", treasury);
        console.log("  Matches Cellar:", treasury.toLowerCase() === cellarAddress.toLowerCase() ? "✅ YES" : "❌ NO");
        console.log("");

        // Get current price
        const slot0 = await tavernKeeper.getSlot0();
        const currentPrice = await tavernKeeper.getPrice();
        console.log("  Current Office Price:", ethers.formatEther(currentPrice), "MON");
        console.log("  Epoch ID:", slot0.epochId.toString());
        console.log("");
    } catch (error: any) {
        console.error("  Error reading TavernKeeper:", error.message);
        console.log("");
    }

    // Check Cellar contract
    console.log("--- Cellar Contract State ---");

    // Get native balance
    const cellarBalance = await ethers.provider.getBalance(cellarAddress);
    console.log("  Native Balance (address(this).balance):", ethers.formatEther(cellarBalance), "MON");

    // Try to read potBalance (if it's CellarHook)
    try {
        // Try CellarHook ABI
        const CellarHookABI = [
            "function potBalance() external view returns (uint256)",
            "function slot0() external view returns (tuple(uint8 locked, uint16 epochId, uint192 initPrice, uint40 startTime))",
            "function getAuctionPrice() external view returns (uint256)",
        ];

        const cellarContract = new ethers.Contract(cellarAddress, CellarHookABI, ethers.provider);
        const potBalance = await cellarContract.potBalance();
        console.log("  potBalance variable:", ethers.formatEther(potBalance), "MON");
        console.log("  Balance vs potBalance match:", cellarBalance === potBalance ? "✅ YES" : "❌ NO - MISMATCH!");

        if (cellarBalance > 0n && potBalance === 0n) {
            console.log("\n  ⚠️  CRITICAL ISSUE FOUND!");
            console.log("     Contract has", ethers.formatEther(cellarBalance), "MON but potBalance is 0");
            console.log("     This means the receive() function doesn't update potBalance.");
            console.log("     The contract needs to be fixed to update potBalance when receiving funds.");
        }

        const slot0 = await cellarContract.slot0();
        const price = await cellarContract.getAuctionPrice();
        console.log("  Current Cellar Price:", ethers.formatEther(price), "LP");
        console.log("  Epoch ID:", slot0.epochId.toString());
        console.log("");
    } catch (error: any) {
        console.log("  Could not read potBalance (might be old TheCellar contract)");
        console.log("  Error:", error.message);
        console.log("");

        // Try old TheCellar ABI
        try {
            const TheCellarABI = [
                "function slot0() external view returns (tuple(uint8 locked, uint16 epochId, uint192 initPrice, uint40 startTime))",
                "function getPrice() external view returns (uint256)",
            ];

            const cellarContract = new ethers.Contract(cellarAddress, TheCellarABI, ethers.provider);
            const slot0 = await cellarContract.slot0();
            const price = await cellarContract.getPrice();
            console.log("  (Old TheCellar contract detected - uses address(this).balance)");
            console.log("  Current Cellar Price:", ethers.formatEther(price), "LP");
            console.log("  Epoch ID:", slot0.epochId.toString());
            console.log("");
        } catch (error2: any) {
            console.log("  Could not read as TheCellar either");
            console.log("  Error:", error2.message);
            console.log("");
        }
    }

    // Check recent transactions
    console.log("--- Recent Transactions ---");
    try {
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log("  Latest Block:", latestBlock);
        console.log("  Checking last 100 blocks for transfers to cellar...");

        let foundTransfers = false;
        for (let i = 0; i < 100 && latestBlock - i > 0; i++) {
            const block = await ethers.provider.getBlock(latestBlock - i, true);
            if (block && block.transactions) {
                for (const txHash of block.transactions) {
                    const tx = await ethers.provider.getTransaction(txHash);
                    if (tx && tx.to && tx.to.toLowerCase() === cellarAddress.toLowerCase() && tx.value > 0n) {
                        console.log(`  Found transfer in block ${block.number}:`);
                        console.log(`    From: ${tx.from}`);
                        console.log(`    Amount: ${ethers.formatEther(tx.value)} MON`);
                        foundTransfers = true;
                    }
                }
            }
        }
        if (!foundTransfers) {
            console.log("  No recent transfers found in last 100 blocks");
        }
    } catch (error: any) {
        console.log("  Error checking transactions:", error.message);
    }

    console.log("\n============================================");
    console.log("CHECK COMPLETE");
    console.log("============================================\n");

    // Also write to file
    const outputFile = path.join(__dirname, "..", "cellar_check_output.txt");
    fs.writeFileSync(outputFile, "Check completed. See console output above.\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
