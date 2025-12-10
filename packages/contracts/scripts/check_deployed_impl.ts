import { ethers, upgrades } from "hardhat";

const PROXY = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    const impl = await upgrades.erc1967.getImplementationAddress(PROXY);
    console.log("Current implementation:", impl);

    // Try to read some state variables to determine version
    const cellar = await ethers.getContractAt(
        [
            "function potPriceCoefficient() view returns (uint256)",
            "function minInitPrice() view returns (uint256)",
        ],
        PROXY
    );

    try {
        const coeff = await cellar.potPriceCoefficient();
        console.log("Has potPriceCoefficient:", coeff.toString());
    } catch (e) {
        console.log("No potPriceCoefficient (not TheCellarV3PotPrice)");
    }
}

main().catch(console.error);

