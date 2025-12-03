import { ethers } from "hardhat";

/**
 * Check if deployed contracts have updateTokenURI function
 *
 * Usage:
 *   npx hardhat run scripts/check_updateTokenURI.ts --network monad
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking contracts with account:", deployer.address);
    console.log("\n");

    // Adventurer addresses
    const adventurerProxy = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";

    // TavernKeeper addresses
    const tavernKeeperProxy = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";

    // Get contract factories
    const AdventurerFactory = await ethers.getContractFactory("Adventurer");
    const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");

    // Check Adventurer
    console.log("=== Checking Adventurer ===");
    console.log("Proxy Address:", adventurerProxy);
    try {
        const adventurer = AdventurerFactory.attach(adventurerProxy);

        // Try to encode the function call - this will fail if function doesn't exist on-chain
        try {
            // Encode the function call
            const functionData = adventurer.interface.encodeFunctionData("updateTokenURI", [0, ""]);

            // Try to call it (will fail but confirms function exists on-chain)
            try {
                await deployer.call({
                    to: adventurerProxy,
                    data: functionData
                });
                console.log("✅ Function is callable");
            } catch (e: any) {
                const errorMsg = e.message || e.toString();
                if (errorMsg.includes("Only token owner") ||
                    errorMsg.includes("Metadata URI cannot be empty") ||
                    errorMsg.includes("Adventurer:")) {
                    console.log("✅ Adventurer HAS updateTokenURI function (deployed)");
                    console.log("   → Function exists on-chain, validation working correctly");
                } else if (errorMsg.includes("function selector was not recognized") ||
                          errorMsg.includes("execution reverted: function selector") ||
                          errorMsg.includes("invalid opcode")) {
                    console.log("❌ Adventurer DOES NOT have updateTokenURI function (not deployed)");
                    console.log("   → NEEDS UPGRADE");
                } else {
                    console.log("⚠️  Unexpected error:", errorMsg.substring(0, 100));
                    console.log("   → Check manually on block explorer");
                }
            }
        } catch (encodeError: any) {
            if (encodeError.message.includes("no matching function")) {
                console.log("❌ Adventurer DOES NOT have updateTokenURI function (not in interface)");
                console.log("   → NEEDS UPGRADE");
            } else {
                console.log("❌ Error encoding function:", encodeError.message);
            }
        }
    } catch (error: any) {
        console.log("❌ Error checking Adventurer:", error.message);
        console.log("   → May need to verify contract on block explorer manually");
    }

    console.log("\n");

    // Check TavernKeeper
    console.log("=== Checking TavernKeeper ===");
    console.log("Proxy Address:", tavernKeeperProxy);
    try {
        const tavernKeeper = TavernKeeperFactory.attach(tavernKeeperProxy);

        // Try to encode the function call - this will fail if function doesn't exist on-chain
        try {
            // Encode the function call
            const functionData = tavernKeeper.interface.encodeFunctionData("updateTokenURI", [0, ""]);

            // Try to call it (will fail but confirms function exists on-chain)
            try {
                await deployer.call({
                    to: tavernKeeperProxy,
                    data: functionData
                });
                console.log("✅ Function is callable");
            } catch (e: any) {
                const errorMsg = e.message || e.toString();
                if (errorMsg.includes("Only token owner") ||
                    errorMsg.includes("Metadata URI cannot be empty") ||
                    errorMsg.includes("TavernKeeper:")) {
                    console.log("✅ TavernKeeper HAS updateTokenURI function (deployed)");
                    console.log("   → Function exists on-chain, validation working correctly");
                } else if (errorMsg.includes("function selector was not recognized") ||
                          errorMsg.includes("execution reverted: function selector") ||
                          errorMsg.includes("invalid opcode")) {
                    console.log("❌ TavernKeeper DOES NOT have updateTokenURI function (not deployed)");
                    console.log("   → NEEDS UPGRADE");
                } else {
                    console.log("⚠️  Unexpected error:", errorMsg.substring(0, 100));
                    console.log("   → Check manually on block explorer");
                    console.log("   → Full error:", errorMsg);
                }
            }
        } catch (encodeError: any) {
            if (encodeError.message.includes("no matching function")) {
                console.log("❌ TavernKeeper DOES NOT have updateTokenURI function (not in interface)");
                console.log("   → NEEDS UPGRADE");
            } else {
                console.log("❌ Error encoding function:", encodeError.message);
            }
        }
    } catch (error: any) {
        console.log("❌ Error checking TavernKeeper:", error.message);
        console.log("   → May need to verify contract on block explorer manually");
    }

    console.log("\n=== Summary ===");
    console.log("NOTE: This script checks the LOCAL contract interface, not the deployed contract.");
    console.log("If it shows ✅, the function exists in your local code.");
    console.log("To verify on-chain deployment, check the block explorer:");
    console.log(`  Adventurer: https://explorer.monad.xyz/address/${adventurerProxy}#code`);
    console.log(`  TavernKeeper: https://explorer.monad.xyz/address/${tavernKeeperProxy}#code`);
    console.log("\nOr try calling the function on-chain - if it fails with 'function selector not found',");
    console.log("then the function is NOT deployed and needs an upgrade.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
