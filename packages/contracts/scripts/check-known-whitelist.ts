import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

// Contract addresses (Mainnet)
const TAVERNKEEPER_PROXY = '0x56B81A60Ae343342685911bd97D1331fF4fa2d29';
const ADVENTURER_PROXY = '0xb138Bf579058169e0657c12Fd9cc1267CAFcb935';

const WHITELIST_ABI = [
    'function whitelist(address) view returns (bool)',
    'function whitelistMinted(address) view returns (bool)',
];

// Known addresses from scripts
const ADDRESSES_TO_CHECK = [
    '0x3ec3a92e44952bae7ea96fd9c1c3f6b65c9a1b6d', // From add_to_whitelist.ts
    '0xd515674a7fe63dfdfd43fb5647e8b04eefcedcaa', // Test address from whitelist_test_address.ts
];

async function main() {
    console.log("📋 CHECKING KNOWN WHITELISTED ADDRESSES\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    const tk = new ethers.Contract(TAVERNKEEPER_PROXY, WHITELIST_ABI, deployer);
    const adv = new ethers.Contract(ADVENTURER_PROXY, WHITELIST_ABI, deployer);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const tkWhitelisted: string[] = [];
    const advWhitelisted: string[] = [];

    for (const addr of ADDRESSES_TO_CHECK) {
        try {
            const tkStatus = await tk.whitelist(addr);
            const tkMinted = await tk.whitelistMinted(addr);
            const advStatus = await adv.whitelist(addr);
            const advMinted = await adv.whitelistMinted(addr);

            console.log(`Address: ${addr}`);
            console.log(`   TavernKeeper: ${tkStatus ? '✅ Whitelisted' : '❌ Not whitelisted'} ${tkMinted ? '(Already minted)' : ''}`);
            console.log(`   Adventurer: ${advStatus ? '✅ Whitelisted' : '❌ Not whitelisted'} ${advMinted ? '(Already minted)' : ''}`);
            console.log();

            if (tkStatus) tkWhitelisted.push(addr);
            if (advStatus) advWhitelisted.push(addr);
        } catch (error: any) {
            console.log(`   Error checking ${addr}: ${error.message}\n`);
        }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`📊 SUMMARY:`);
    console.log(`   TavernKeeper whitelisted: ${tkWhitelisted.length} addresses`);
    if (tkWhitelisted.length > 0) {
        tkWhitelisted.forEach(addr => console.log(`     - ${addr}`));
    }
    console.log(`   Adventurer whitelisted: ${advWhitelisted.length} addresses`);
    if (advWhitelisted.length > 0) {
        advWhitelisted.forEach(addr => console.log(`     - ${addr}`));
    }
    console.log("\n⚠️  NOTE: Contracts can't enumerate mappings. To find ALL whitelisted addresses,");
    console.log("   you need to query WhitelistUpdated events (slow) or maintain a list manually.");
    console.log("\n💡 To check a specific address:");
    console.log(`   $env:CHECK_ADDRESS="0x..."; npx hardhat run scripts/check-whitelist.ts --network monad`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

