import * as fs from "fs";
import { ethers } from "hardhat";
import * as path from "path";

/**
 * Complete Testnet Workflow Test
 *
 * Tests the full game workflow on Monad testnet:
 * 1. Mint NFTs (Adventurer, TavernKeeper)
 * 2. Create TBAs for NFTs
 * 3. Mint items to TBAs
 * 4. Transfer items between TBAs
 * 5. Test fee collection
 *
 * Usage:
 *   npx hardhat run scripts/testnetWorkflow.ts --network monad
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing workflow with deployer:", deployer.address);

    // Load deployment info
    const deploymentFile = path.join(__dirname, "..", "wallets", "deployment-info.json");
    let deployedAddresses: any;

    if (fs.existsSync(deploymentFile)) {
        deployedAddresses = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    } else {
        // Use hardcoded addresses from deployment
        deployedAddresses = {
            contracts: {
                erc6551Registry: "0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C",
                erc6551AccountImplementation: "0x9B5980110654dcA57a449e2D6BEc36fE54123B0F",
                keepTokenProxy: "0x96982EC3625145f098DCe06aB34E99E7207b0520",
                inventoryProxy: "0xA43034595E2d1c52Ab08a057B95dD38bCbFf87dC",
                adventurerProxy: "0x2ABb5F58DE56948dD0E06606B88B43fFe86206c2",
                tavernKeeperProxy: "0x4Fff2Ce5144989246186462337F0eE2C086F913E",
            },
        };
    }

    // Connect to contracts
    const KeepToken = await ethers.getContractFactory("KeepToken");
    const keepToken = KeepToken.attach(deployedAddresses.contracts.keepTokenProxy);

    const Inventory = await ethers.getContractFactory("Inventory");
    const inventory = Inventory.attach(deployedAddresses.contracts.inventoryProxy);

    const Adventurer = await ethers.getContractFactory("Adventurer");
    const adventurer = Adventurer.attach(deployedAddresses.contracts.adventurerProxy);

    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(deployedAddresses.contracts.tavernKeeperProxy);

    const ERC6551Registry = await ethers.getContractFactory("ERC6551Registry");
    const registry = ERC6551Registry.attach(deployedAddresses.contracts.erc6551Registry);

    const ERC6551Account = await ethers.getContractFactory("ERC6551Account");
    const accountImpl = ERC6551Account.attach(deployedAddresses.contracts.erc6551AccountImplementation);

    // Load test wallet
    const keysFile = path.join(__dirname, "..", "wallets", "testnet-keys.json");
    if (!fs.existsSync(keysFile)) {
        throw new Error("testnet-keys.json not found. Run generateTestWallets.ts first.");
    }
    const keysData = JSON.parse(fs.readFileSync(keysFile, "utf8"));
    const testWallet = keysData.testWallets[0];
    const testSigner = new ethers.Wallet(testWallet.privateKey, ethers.provider);

    console.log("\n=== Starting Workflow Test ===");
    console.log("Test wallet:", testWallet.address);

    // 1. Mint Adventurer NFT
    console.log("\n1. Minting Adventurer NFT...");
    const adventurerTx = await adventurer.safeMint(testWallet.address, "https://example.com/adventurer/1");
    await adventurerTx.wait();
    const adventurerTokenId = 0n;
    console.log("  ✓ Adventurer NFT minted (tokenId: 0)");

    // 2. Create TBA for Adventurer
    console.log("\n2. Creating TBA for Adventurer...");
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const salt = ethers.ZeroHash;
    const implAddress = await accountImpl.getAddress();
    const adventurerAddress = await adventurer.getAddress();

    const tbaAddress = await registry.account(
        implAddress,
        salt,
        chainId,
        adventurerAddress,
        adventurerTokenId
    );
    console.log("  TBA address:", tbaAddress);

    // Create the TBA
    const createTx = await registry.createAccount(
        implAddress,
        salt,
        chainId,
        adventurerAddress,
        adventurerTokenId
    );
    await createTx.wait();
    console.log("  ✓ TBA created");

    // 3. Mint items to TBA (via owner)
    console.log("\n3. Minting items to TBA...");
    const itemId = 1n;
    const itemAmount = 10n;
    const mintTx = await inventory.mint(tbaAddress, itemId, itemAmount, "0x");
    await mintTx.wait();
    console.log("  ✓ Items minted to TBA");

    // Verify items are in TBA
    const balance = await inventory.balanceOf(tbaAddress, itemId);
    console.log("  TBA item balance:", balance.toString());

    // 4. Test fee collection with claimLootWithFee
    console.log("\n4. Testing fee collection...");
    const feeAmount = ethers.parseEther("0.0001"); // Small test fee
    const deployerBalanceBefore = await ethers.provider.getBalance(deployer.address);

    // Transfer items with fee
    const claimTx = await inventory.claimLootWithFee(
        deployer.address, // from (owner has items)
        tbaAddress, // to (TBA)
        [itemId],
        [5n], // transfer 5 items
        "0x",
        { value: feeAmount }
    );
    await claimTx.wait();
    console.log("  ✓ Items transferred with fee collected");

    const deployerBalanceAfter = await ethers.provider.getBalance(deployer.address);
    const feeReceived = deployerBalanceAfter - deployerBalanceBefore + (await claimTx.wait())!.gasUsed * (await ethers.provider.getFeeData()).gasPrice!;
    console.log("  Fee received (approx):", ethers.formatEther(feeReceived), "MON");

    // 5. Mint KeepToken to test wallet (via TavernKeeper NFT)
    console.log("\n5. Minting KeepToken to test wallet...");
    // Mint a TavernKeeper NFT to test wallet
    const keeperMintTx = await tavernKeeper.safeMint(testWallet.address, "https://example.com/keeper/1");
    await keeperMintTx.wait();
    const keeperTokenId = 0n;

    // Fast-forward time to accumulate tokens (100 hours)
    await ethers.provider.send("evm_increaseTime", [360000]);
    await ethers.provider.send("evm_mine", []);

    // Claim tokens
    const keepTx = await tavernKeeper.connect(testSigner).claimTokens(keeperTokenId);
    await keepTx.wait();
    console.log("  ✓ KeepToken minted via claimTokens");

    // 6. Verify everything
    console.log("\n=== Verification ===");
    const finalBalance = await inventory.balanceOf(tbaAddress, itemId);
    console.log("Final TBA item balance:", finalBalance.toString());
    console.log("Expected: 15 (10 initial + 5 transferred)");

    const keepBalance = await keepToken.balanceOf(testWallet.address);
    console.log("Test wallet KeepToken balance:", ethers.formatEther(keepBalance), "KEEP");

    console.log("\n=== Workflow Test Complete ===");
    console.log("All operations successful!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


