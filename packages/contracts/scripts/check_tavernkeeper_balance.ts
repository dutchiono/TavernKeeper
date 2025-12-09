import { ethers } from "hardhat";

/**
 * Check TavernKeeper and Adventurer contract balances for stuck funds
 *
 * Usage:
 *   npx hardhat run scripts/check_tavernkeeper_balance.ts --network monad
 */

// Mainnet addresses
const TAVERN_KEEPER_MAINNET = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const ADVENTURER_MAINNET = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";

// Testnet addresses (if needed)
const TAVERN_KEEPER_TESTNET = "0xFaC0786eF353583FBD43Ee7E7e84836c1857A381";
const ADVENTURER_TESTNET = "0x4Fff2Ce5144989246186462337F0eE2C086F913E";

async function checkContract(name: string, address: string) {
    console.log(`\n--- ${name} ---`);
    console.log(`Address: ${address}`);

    try {
        // Check native MON balance
        const nativeBalance = await ethers.provider.getBalance(address);
        console.log(`Native Balance: ${ethers.formatEther(nativeBalance)} MON`);

        if (nativeBalance > 0n) {
            console.log(`⚠️  WARNING: Contract has ${ethers.formatEther(nativeBalance)} MON stuck!`);
        } else {
            console.log(`✅ No funds stuck`);
        }

        // Try to get contract instance and check treasury
        try {
            if (name.includes("TavernKeeper")) {
                const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
                const contract = TavernKeeper.attach(address);

                const treasury = await contract.treasury();
                console.log(`Treasury: ${treasury}`);

                if (treasury === ethers.ZeroAddress) {
                    console.log(`⚠️  Treasury not set - funds would go to owner`);
                } else {
                    console.log(`✅ Treasury set - funds should go to: ${treasury}`);
                }
            } else if (name.includes("Adventurer")) {
                const Adventurer = await ethers.getContractFactory("Adventurer");
                const contract = Adventurer.attach(address);

                try {
                    const treasury = await contract.treasury();
                    console.log(`Treasury: ${treasury}`);

                    if (treasury === ethers.ZeroAddress) {
                        console.log(`⚠️  Treasury not set - funds would go to owner`);
                    } else {
                        console.log(`✅ Treasury set - funds should go to: ${treasury}`);
                    }
                } catch (e: any) {
                    if (e.message.includes("treasury")) {
                        console.log(`(Adventurer contract - treasury not yet implemented in current version)`);
                    } else {
                        console.log(`(Could not read treasury: ${e.message})`);
                    }
                }
            }
        } catch (e: any) {
            console.log(`(Could not read contract state: ${e.message})`);
        }

        return {
            name,
            address,
            nativeBalance,
            hasStuckFunds: nativeBalance > 0n
        };
    } catch (error: any) {
        console.error(`❌ Error checking ${name}:`, error.message);
        return {
            name,
            address,
            nativeBalance: 0n,
            hasStuckFunds: false,
            error: error.message
        };
    }
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== CHECKING NFT MINT CONTRACT BALANCES ===\n");
    console.log("Deployer:", deployer.address);
    console.log("Network:", (await ethers.provider.getNetwork()).name);
    console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);

    const chainId = (await ethers.provider.getNetwork()).chainId;

    // Determine which addresses to use based on chain
    const isMainnet = chainId === 143n; // Monad mainnet
    const tavernKeeperAddress = isMainnet ? TAVERN_KEEPER_MAINNET : TAVERN_KEEPER_TESTNET;
    const adventurerAddress = isMainnet ? ADVENTURER_MAINNET : ADVENTURER_TESTNET;

    console.log(`\nUsing ${isMainnet ? 'MAINNET' : 'TESTNET'} addresses`);

    const results = [];

    // Check TavernKeeper
    const tkResult = await checkContract("TavernKeeper", tavernKeeperAddress);
    results.push(tkResult);

    // Check Adventurer
    const advResult = await checkContract("Adventurer", adventurerAddress);
    results.push(advResult);

    // Summary
    console.log("\n============================================");
    console.log("SUMMARY");
    console.log("============================================");

    const stuckFunds = results.filter(r => r.hasStuckFunds);
    const totalStuck = results.reduce((sum, r) => sum + r.nativeBalance, 0n);

    if (stuckFunds.length === 0) {
        console.log("✅ No stuck funds found in NFT mint contracts");
    } else {
        console.log(`⚠️  Found ${stuckFunds.length} contract(s) with stuck funds:\n`);

        for (const r of stuckFunds) {
            console.log(`  ${r.name}:`);
            console.log(`    Address: ${r.address}`);
            console.log(`    Amount: ${ethers.formatEther(r.nativeBalance)} MON`);
        }

        console.log(`\n  Total Stuck: ${ethers.formatEther(totalStuck)} MON`);
        console.log(`\n  ⚠️  ACTION REQUIRED: Funds need to be withdrawn using withdrawFunds() function`);
    }
}

main().catch((error) => {
    console.error("❌ Check failed:", error);
    process.exitCode = 1;
});

