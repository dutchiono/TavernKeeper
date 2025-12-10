import { ethers } from "hardhat";

const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    const cellar = await ethers.getContractAt(
        ["function minInitPrice() view returns (uint256)"],
        THE_CELLAR_V3
    );

    const minInitPrice = await cellar.minInitPrice();
    console.log("Current minInitPrice:", ethers.formatEther(minInitPrice), "CLP");
}

main().catch(console.error);

