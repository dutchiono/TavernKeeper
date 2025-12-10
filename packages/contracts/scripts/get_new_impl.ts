import { ethers, upgrades } from "hardhat";

const PROXY = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    const impl = await upgrades.erc1967.getImplementationAddress(PROXY);
    console.log(impl);
}

main().catch(console.error);

