import { ethers, upgrades } from "hardhat";

const PROXY = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    const impl = await upgrades.erc1967.getImplementationAddress(PROXY);
    console.log("Current implementation address:", impl);

    // Check what functions/variables exist
    const cellar = await ethers.getContractAt(
        [
            "function potPriceCoefficient() view returns (uint256)",
            "function minInitPrice() view returns (uint256)",
            "function setPotPriceCoefficient(uint256) external",
        ],
        PROXY
    );

    try {
        const coeff = await cellar.potPriceCoefficient();
        console.log("✅ Has potPriceCoefficient:", coeff.toString());
        console.log("   This means it's TheCellarV3PotPrice");
    } catch (e: any) {
        console.log("❌ No potPriceCoefficient:", e.message);
    }

    const minPrice = await cellar.minInitPrice();
    console.log("Current minInitPrice:", ethers.formatEther(minPrice), "CLP");
}

main().catch(console.error);

