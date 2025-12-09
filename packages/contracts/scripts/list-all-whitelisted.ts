import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

// Contract addresses (from DEPLOYMENT_TRACKER.md - Mainnet proxies)
const TAVERNKEEPER_PROXY = '0x56B81A60Ae343342685911bd97D1331fF4fa2d29'; // Mainnet proxy
const ADVENTURER_PROXY = '0xb138Bf579058169e0657c12Fd9cc1267CAFcb935'; // Mainnet proxy

// Known addresses from scripts (check these first)
const KNOWN_ADDRESSES = [
    '0x3ec3a92e44952bae7ea96fd9c1c3f6b65c9a1b6d', // From add_to_whitelist.ts
    '0xd515674a7fe63dfdfd43fb5647e8b04eefcedcaa', // Test address
];

const WHITELIST_ABI = [
    'function whitelist(address) view returns (bool)',
    'function whitelistMinted(address) view returns (bool)',
    'event WhitelistUpdated(address indexed account, bool isWhitelisted)'
];

async function main() {
    console.log("📋 LISTING ALL WHITELISTED ADDRESSES\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    const tk = new ethers.Contract(TAVERNKEEPER_PROXY, WHITELIST_ABI, deployer);
    const adv = new ethers.Contract(ADVENTURER_PROXY, WHITELIST_ABI, deployer);

    const currentBlock = await ethers.provider.getBlockNumber();
    const chunkSize = 100;
    const maxBlocks = 20000;
    const fromBlock = Math.max(0, currentBlock - maxBlocks);

    // First check known addresses
    console.log("Checking known addresses from scripts...\n");
    const tkVerified: string[] = [];
    const advVerified: string[] = [];

    for (const addr of KNOWN_ADDRESSES) {
        try {
            const tkStatus = await tk.whitelist(addr);
            const advStatus = await adv.whitelist(addr);
            if (tkStatus) {
                tkVerified.push(addr);
                console.log(`   ✅ ${addr} - TavernKeeper whitelisted`);
            }
            if (advStatus) {
                advVerified.push(addr);
                console.log(`   ✅ ${addr} - Adventurer whitelisted`);
            }
        } catch {
            // Skip
        }
    }

    console.log(`\nQuerying WhitelistUpdated events from block ${fromBlock} to ${currentBlock}...\n`);

    const tkWhitelisted = new Map<string, boolean>();
    const advWhitelisted = new Map<string, boolean>();

    // Query TavernKeeper events
    const tkFilter = tk.filters.WhitelistUpdated();
    let tkProcessed = 0;
    for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);
        try {
            const events = await tk.queryFilter(tkFilter, start, end);
            for (const event of events) {
                if (event.args) {
                    const addr = event.args[0].toLowerCase();
                    const isWhitelisted = event.args[1];
                    tkWhitelisted.set(addr, isWhitelisted);
                }
            }
            tkProcessed += chunkSize;
            if (tkProcessed % 1000 === 0) {
                process.stdout.write(`   TK: ${tkProcessed} blocks...\r`);
            }
        } catch (error: any) {
            // Skip errors
        }
    }

    // Query Adventurer events
    const advFilter = adv.filters.WhitelistUpdated();
    let advProcessed = 0;
    for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);
        try {
            const events = await adv.queryFilter(advFilter, start, end);
            for (const event of events) {
                if (event.args) {
                    const addr = event.args[0].toLowerCase();
                    const isWhitelisted = event.args[1];
                    advWhitelisted.set(addr, isWhitelisted);
                }
            }
            advProcessed += chunkSize;
            if (advProcessed % 1000 === 0) {
                process.stdout.write(`   ADV: ${advProcessed} blocks...\r`);
            }
        } catch (error: any) {
            // Skip errors
        }
    }

    console.log(`\n`);

    // Filter to only currently whitelisted (last event was true)
    const tkActive: string[] = [];
    const advActive: string[] = [];

    for (const [addr, status] of tkWhitelisted.entries()) {
        if (status) {
            tkActive.push(addr);
        }
    }

    for (const [addr, status] of advWhitelisted.entries()) {
        if (status) {
            advActive.push(addr);
        }
    }

    // Verify on-chain status for event-found addresses
    console.log("\nVerifying event-found addresses on-chain...\n");
    for (const addr of tkActive) {
        if (!tkVerified.includes(addr)) {
            try {
                const isWhitelisted = await tk.whitelist(addr);
                if (isWhitelisted) {
                    tkVerified.push(addr);
                }
            } catch {
                // Skip
            }
        }
    }

    for (const addr of advActive) {
        if (!advVerified.includes(addr)) {
            try {
                const isWhitelisted = await adv.whitelist(addr);
                if (isWhitelisted) {
                    advVerified.push(addr);
                }
            } catch {
                // Skip
            }
        }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📋 TAVERNKEEPER Whitelisted Addresses (${tkVerified.length}):\n`);
    if (tkVerified.length > 0) {
        tkVerified.forEach((addr, i) => {
            console.log(`   ${i + 1}. ${addr}`);
        });
    } else {
        console.log(`   (None found)`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📋 ADVENTURER Whitelisted Addresses (${advVerified.length}):\n`);
    if (advVerified.length > 0) {
        advVerified.forEach((addr, i) => {
            console.log(`   ${i + 1}. ${addr}`);
        });
    } else {
        console.log(`   (None found)`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`✅ Found ${tkVerified.length} TavernKeeper and ${advVerified.length} Adventurer whitelisted addresses`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

