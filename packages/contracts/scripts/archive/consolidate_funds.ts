import { ethers } from "hardhat";

// ==============================================================================
// 1. PASTE YOUR "VICTIM" PRIVATE KEYS HERE (The wallets you want to drain)
// ==============================================================================
const VICTIM_KEYS: string[] = [
    "0xbe3e1eb04a153dae7e96bf4ec7b2242c8e9da6020a51b574671ea0048889fda7",
    "0xcc7bd4ecdeecc71c9a14a1cdb4f7ab9dbe821139d2b49c9d6beda75a87f04381",
    "0x33d0b4cfaae4ba4a29f8090654f0f3ff0df444612ea9574bbceb01a428767db1",
    "0xcf45627b0d9f15552d81b7e942c7dfa4cde236ac2a3359f30aa66de59b389ea5",
    "0x46713aa0911de0134ecda30e4821e57e3162b006370088b76b9d7e2cdfc2ef14",
    "0xf9d9d32f4194066d6d074bd707ece220a1f117eddb37c57eb674bbd6e31d6e22",
    "0xdaa45f7c75acae9e04ebff6d69b8ccab2ecd8996190dc4a7bbca897893cf1294",
    "0x46b95fc01e9bc602dee7950e1a9238a3eddd2b91d08a05ab439485fdd1aeb7f7",
    "0x75fbb7e43e796c20f07769653600eda40f0d8f9d3eaad9a75d1cec99f5b55cb7",
    "0x76e6ad2d307c91f34d7548bf0cdb2f805b738c2c476cfa24f1ecb9d15086cc17"
];

// ==============================================================================

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== CONSOLIDATING FUNDS ===");
    console.log("Destination (Deployer):", deployer.address);
    console.log("------------------------------------------------------------");

    if (VICTIM_KEYS.length === 0) {
        console.log("No private keys provided in VICTIM_KEYS array.");
        console.log("Please edit scripts/consolidate_funds.ts and add your keys.");
        return;
    }

    const provider = ethers.provider;

    for (const key of VICTIM_KEYS) {
        try {
            const wallet = new ethers.Wallet(key, provider);
            const balance = await provider.getBalance(wallet.address);

            console.log(`Checking ${wallet.address}...`);
            console.log(`Balance: ${ethers.formatEther(balance)} MON`);

            if (balance === 0n) {
                console.log("-> Skipping (Empty)");
                continue;
            }

            // Estimate Gas for Transfer
            const txRequest = {
                to: deployer.address,
                value: balance, // Temporary value for estimation
            };

            const gasPrice = (await provider.getFeeData()).gasPrice;
            if (!gasPrice) throw new Error("Could not get gas price");

            const gasLimit = 21000n; // Standard transfer
            const gasCost = gasLimit * gasPrice;

            if (balance <= gasCost) {
                console.log("-> Skipping (Insufficient to cover gas)");
                continue;
            }

            const amountToSend = balance - gasCost;

            console.log(`-> Draining ${ethers.formatEther(amountToSend)} MON...`);

            const tx = await wallet.sendTransaction({
                to: deployer.address,
                value: amountToSend,
                gasLimit: gasLimit,
                gasPrice: gasPrice
            });

            console.log(`-> Tx Sent: ${tx.hash}`);
            await tx.wait();
            console.log("-> Success!");

        } catch (error) {
            console.error(`-> Error processing key: ${error}`);
        }
        console.log("------------------------------------------------------------");
    }

    const finalBalance = await provider.getBalance(deployer.address);
    console.log("Final Deployer Balance:", ethers.formatEther(finalBalance), "MON");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
