import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading contracts to signature-based pricing with account:", deployer.address);

    // Get signer address from environment or use deployer as fallback
    const signerAddress = process.env.PRICING_SIGNER_ADDRESS || deployer.address;
    console.log("Using signer address:", signerAddress);

    if (!signerAddress || signerAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error("PRICING_SIGNER_ADDRESS must be set in environment. This is the address that will sign prices.");
    }

    // Addresses from DEPLOYMENT_TRACKER.md
    // Update these with actual deployed addresses
    const TAVERN_KEEPER_PROXY = process.env.TAVERN_KEEPER_PROXY || "0x311d8722A5cE11DF157D7a9d414bbeC2640c5Fb2";
    const ADVENTURER_PROXY = process.env.ADVENTURER_PROXY || "0x67e27a22B64385e0110e69Dceae7d394D2C87B06";

    console.log("\n=== Upgrading TavernKeeper ===");
    const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = await upgrades.upgradeProxy(TAVERN_KEEPER_PROXY, TavernKeeperFactory);
    await tavernKeeper.waitForDeployment();
    console.log("✓ TavernKeeper upgraded");

    // Set signer address
    console.log("Setting signer address on TavernKeeper...");
    const setSignerTx = await tavernKeeper.setSigner(signerAddress);
    await setSignerTx.wait();
    console.log("✓ Signer set on TavernKeeper");

    // Verify signer was set
    const tavernKeeperSigner = await tavernKeeper.signer();
    if (tavernKeeperSigner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error(`Signer verification failed. Expected ${signerAddress}, got ${tavernKeeperSigner}`);
    }
    console.log("✓ Signer verified on TavernKeeper:", tavernKeeperSigner);

    console.log("\n=== Upgrading Adventurer ===");
    const AdventurerFactory = await ethers.getContractFactory("Adventurer");
    const adventurer = await upgrades.upgradeProxy(ADVENTURER_PROXY, AdventurerFactory);
    await adventurer.waitForDeployment();
    console.log("✓ Adventurer upgraded");

    // Set signer address
    console.log("Setting signer address on Adventurer...");
    const setSignerTx2 = await adventurer.setSigner(signerAddress);
    await setSignerTx2.wait();
    console.log("✓ Signer set on Adventurer");

    // Verify signer was set
    const adventurerSigner = await adventurer.signer();
    if (adventurerSigner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error(`Signer verification failed. Expected ${signerAddress}, got ${adventurerSigner}`);
    }
    console.log("✓ Signer verified on Adventurer:", adventurerSigner);

    // Get new implementation addresses
    const tavernKeeperImpl = await upgrades.erc1967.getImplementationAddress(TAVERN_KEEPER_PROXY);
    const adventurerImpl = await upgrades.erc1967.getImplementationAddress(ADVENTURER_PROXY);

    console.log("\n=== Upgrade Summary ===");
    console.log("TavernKeeper Proxy:", TAVERN_KEEPER_PROXY);
    console.log("TavernKeeper Implementation:", tavernKeeperImpl);
    console.log("TavernKeeper Signer:", signerAddress);
    console.log("\nAdventurer Proxy:", ADVENTURER_PROXY);
    console.log("Adventurer Implementation:", adventurerImpl);
    console.log("Adventurer Signer:", signerAddress);

    // Note: updateDeploymentTracker has a specific interface, so we'll update manually
    // The implementation addresses are logged above for manual update to DEPLOYMENT_TRACKER.md
    console.log("\n⚠️  Please manually update DEPLOYMENT_TRACKER.md with:");
    console.log(`- TavernKeeper Implementation: ${tavernKeeperImpl}`);
    console.log(`- Adventurer Implementation: ${adventurerImpl}`);
    console.log(`- Add upgrade entry documenting signature-based pricing upgrade`);

    console.log("\n✅ Signature-based pricing upgrade complete!");
    console.log("\n⚠️  IMPORTANT:");
    console.log("1. Ensure PRICING_SIGNER_PRIVATE_KEY is set in backend .env");
    console.log("2. The signer address must match the private key");
    console.log("3. Test minting on testnet before mainnet");
    console.log("4. Update frontend to use new signature-based minting");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
