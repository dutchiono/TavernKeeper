import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

// Contract addresses (from DEPLOYMENT_TRACKER.md - Mainnet proxies)
const TAVERNKEEPER_PROXY = '0x56B81A60Ae343342685911bd97D1331fF4fa2d29'; // Mainnet proxy
const ADVENTURER_PROXY = '0xb138Bf579058169e0657c12Fd9cc1267CAFcb935'; // Mainnet proxy

// ABI for whitelist functions
const WHITELIST_ABI = [
    'function whitelist(address) view returns (bool)',
    'function whitelistMinted(address) view returns (bool)',
    'event WhitelistUpdated(address indexed account, bool isWhitelisted)'
];

async function main() {
    console.log("🔍 CHECKING WHITELIST STATUS\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // Check if address provided as env var
    const addressToCheck = process.env.CHECK_ADDRESS || deployer.address;
    console.log(`Checking whitelist for: ${addressToCheck}\n`);

    // TavernKeeper whitelist
    const tk = new ethers.Contract(TAVERNKEEPER_PROXY, WHITELIST_ABI, deployer);
    const tkWhitelisted = await tk.whitelist(addressToCheck);
    const tkMinted = await tk.whitelistMinted(addressToCheck);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 TAVERNKEEPER WHITELIST:");
    console.log(`   Address: ${addressToCheck}`);
    console.log(`   Whitelisted: ${tkWhitelisted ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has Minted: ${tkMinted ? '✅ YES' : '❌ NO'}`);
    if (tkWhitelisted && !tkMinted) {
        console.log(`   Status: ✅ Can mint for FREE`);
    } else if (tkWhitelisted && tkMinted) {
        console.log(`   Status: ⚠️  Already used whitelist mint`);
    } else {
        console.log(`   Status: ❌ Not whitelisted - must pay to mint`);
    }

    // Adventurer whitelist
    const adv = new ethers.Contract(ADVENTURER_PROXY, WHITELIST_ABI, deployer);
    const advWhitelisted = await adv.whitelist(addressToCheck);
    const advMinted = await adv.whitelistMinted(addressToCheck);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 ADVENTURER WHITELIST:");
    console.log(`   Address: ${addressToCheck}`);
    console.log(`   Whitelisted: ${advWhitelisted ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has Minted: ${advMinted ? '✅ YES' : '❌ NO'}`);
    if (advWhitelisted && !advMinted) {
        console.log(`   Status: ✅ Can mint for FREE`);
    } else if (advWhitelisted && advMinted) {
        console.log(`   Status: ⚠️  Already used whitelist mint`);
    } else {
        console.log(`   Status: ❌ Not whitelisted - must pay to mint`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`✅ Whitelist check complete!`);
    console.log(`\n💡 To check a specific address:`);
    console.log(`   $env:CHECK_ADDRESS="0x..."; npx hardhat run scripts/check-whitelist.ts --network monad`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

