import { ethers, upgrades } from "hardhat";

const PROXY = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    console.log("=== VERIFYING DEPLOYED CONTRACT STORAGE ===\n");

    const impl = await upgrades.erc1967.getImplementationAddress(PROXY);
    console.log("Current implementation:", impl);
    console.log("");

    // Try to read storage slots to see what's actually there
    // Storage layout for upgradeable contracts:
    // Slot 0: _initialized (uint8)
    // Slot 1: _initializing (bool)
    // Slot 2+: OwnableUpgradeable storage
    // Then: contract-specific storage

    const cellar = await ethers.getContractAt(
        [
            "function deployerAddress() view returns (address)",
            "function totalLiquidity() view returns (uint256)",
            "function epochPeriod() view returns (uint256)",
            "function priceMultiplier() view returns (uint256)",
            "function minInitPrice() view returns (uint256)",
            "function potPriceCoefficient() view returns (uint256)",
        ],
        PROXY
    );

    console.log("--- Reading Storage Variables ---");
    try {
        const deployerAddr = await cellar.deployerAddress();
        console.log("deployerAddress:", deployerAddr);
    } catch (e: any) {
        console.log("deployerAddress: ERROR -", e.message);
    }

    try {
        const totalLiq = await cellar.totalLiquidity();
        console.log("totalLiquidity:", totalLiq.toString());
    } catch (e: any) {
        console.log("totalLiquidity: ERROR -", e.message);
    }

    try {
        const epoch = await cellar.epochPeriod();
        console.log("epochPeriod:", epoch.toString());
    } catch (e: any) {
        console.log("epochPeriod: ERROR -", e.message);
    }

    try {
        const multiplier = await cellar.priceMultiplier();
        console.log("priceMultiplier:", multiplier.toString());
    } catch (e: any) {
        console.log("priceMultiplier: ERROR -", e.message);
    }

    try {
        const minPrice = await cellar.minInitPrice();
        console.log("minInitPrice:", minPrice.toString());
    } catch (e: any) {
        console.log("minInitPrice: ERROR -", e.message);
    }

    try {
        const coeff = await cellar.potPriceCoefficient();
        console.log("potPriceCoefficient:", coeff.toString());
    } catch (e: any) {
        console.log("potPriceCoefficient: ERROR -", e.message);
    }

    // Try to read staking contracts (these should NOT exist in deployed version)
    console.log("\n--- Checking for Staking Variables (should NOT exist) ---");
    try {
        const lpStaking = await cellar.lpStakingContract();
        console.log("❌ lpStakingContract EXISTS (shouldn't!):", lpStaking);
    } catch (e: any) {
        console.log("✅ lpStakingContract does NOT exist (correct)");
    }

    try {
        const keepStaking = await cellar.keepStakingContract();
        console.log("❌ keepStakingContract EXISTS (shouldn't!):", keepStaking);
    } catch (e: any) {
        console.log("✅ keepStakingContract does NOT exist (correct)");
    }
}

main().catch(console.error);

