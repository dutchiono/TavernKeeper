import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3 = process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const DEPLOYER_ADDRESS_ENV = process.env.DEPLOYER_ADDRESS || "";

const CELLAR_ABI = [
    'function deployerAddress() view returns (address)',
    'function owner() view returns (address)',
    'function tokenId() view returns (uint256)',
];

async function main() {
    console.log("🔍 CHECKING DEPLOYER ADDRESS ON CONTRACT\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Your address: ${deployer.address}`);
    console.log(`DEPLOYER_ADDRESS from .env: ${DEPLOYER_ADDRESS_ENV || 'not set'}\n`);

    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);

    const owner = await cellar.owner();
    const deployerAddress = await cellar.deployerAddress();
    const tokenId = await cellar.tokenId();

    console.log(`📋 On-Chain State:`);
    console.log(`   Contract: ${THE_CELLAR_V3}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   deployerAddress: ${deployerAddress}`);
    console.log(`   tokenId: ${tokenId.toString()}\n`);

    // Check if deployerAddress is actually 0x0 or if it's set
    if (deployerAddress === ethers.ZeroAddress) {
        console.log(`⚠️  deployerAddress IS 0x0 on-chain`);
        console.log(`   This means it was either:`);
        console.log(`   1. Initialized with 0x0 during deployment`);
        console.log(`   2. Never initialized (but that's impossible if tokenId exists)`);
    } else {
        console.log(`✅ deployerAddress IS SET on-chain: ${deployerAddress}`);
        if (DEPLOYER_ADDRESS_ENV && deployerAddress.toLowerCase() !== DEPLOYER_ADDRESS_ENV.toLowerCase()) {
            console.log(`   ⚠️  Mismatch with .env:`);
            console.log(`   - On-chain: ${deployerAddress}`);
            console.log(`   - .env: ${DEPLOYER_ADDRESS_ENV}`);
        } else if (DEPLOYER_ADDRESS_ENV && deployerAddress.toLowerCase() === DEPLOYER_ADDRESS_ENV.toLowerCase()) {
            console.log(`   ✅ Matches DEPLOYER_ADDRESS from .env`);
        }
    }

    console.log(`\n💡 Next steps:`);
    if (deployerAddress === ethers.ZeroAddress) {
        console.log(`   You need to set deployerAddress on the contract.`);
        console.log(`   This requires upgrading the contract to add a setDeployerAddress() function.`);
    } else {
        console.log(`   You should be able to call harvest() successfully.`);
        console.log(`   Try running: npx hardhat run scripts/harvest-fees.ts --network monad`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

