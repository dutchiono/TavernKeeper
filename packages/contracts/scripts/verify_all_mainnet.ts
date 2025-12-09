import { execSync } from "child_process";
import { ethers } from "hardhat";

/**
 * Batch verify all mainnet contracts
 *
 * This script verifies all mainnet contracts on MonadScan.
 * Implementation contracts typically don't have constructor args (use initializers).
 *
 * Usage:
 *   $env:NEXT_PUBLIC_MONAD_CHAIN_ID="143"
 *   $env:ETHERSCAN_API_KEY="your-api-key"
 *   npx hardhat run scripts/verify_all_mainnet.ts --network monad
 */

interface ContractToVerify {
    name: string;
    address: string;
    type: "Implementation" | "Proxy" | "Contract" | "Infrastructure";
    constructorArgs?: string; // Constructor arguments if needed
    skip?: boolean; // Skip if deprecated or not needed
}

// Mainnet contracts to verify - prioritized by importance
const CONTRACTS_TO_VERIFY: ContractToVerify[] = [
    // Active Implementation Contracts (Priority 1 - Most Important)
    { name: "TheCellarV3 (Impl v1.5.0)", address: "0x85d081275254f39d31ebC7b5b5DCBD7276C4E9dF", type: "Implementation" },
    { name: "TavernKeeper (Impl v4.2.0)", address: "0x81146F855f5B0C567e9F0d3a2A082Aed81F34762", type: "Implementation" },
    { name: "Adventurer (Impl v4.1.0)", address: "0x961F7b389ebe40C61aE1b64425F23CFEA79a4458", type: "Implementation" },

    // Active Proxy Contracts (Priority 2)
    { name: "TheCellarV3 (Proxy)", address: "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0", type: "Proxy" },
    { name: "KeepToken (Proxy)", address: "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E", type: "Proxy" },
    { name: "TavernKeeper (Proxy)", address: "0x56B81A60Ae343342685911bd97D1331fF4fa2d29", type: "Proxy" },
    { name: "Adventurer (Proxy)", address: "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935", type: "Proxy" },
    { name: "CellarZapV4 (Proxy)", address: "0xf7248a01051bf297Aa56F12a05e7209C60Fc5863", type: "Proxy" },
    { name: "CellarToken", address: "0x6eF142a2203102F6c58b0C15006BF9F6F5CFe39E", type: "Contract" },

    // Other Active Contracts (Priority 3)
    { name: "Tavern Regulars Manager", address: "0x9f455Ad562e080CC745f9E97c469a86E1bBF8db8", type: "Proxy" },
    { name: "Town Posse Manager", address: "0xE46592D8185975888b4A301DBD9b24A49933CC7D", type: "Proxy" },
    { name: "Inventory (Proxy)", address: "0xcB11EFb6E697b5eD7841717b4C994D3edC8393b4", type: "Proxy" },
    { name: "DungeonGatekeeper (Proxy)", address: "0xf454A4A4f2F960a5d5b7583A289dCAE765d57355", type: "Proxy" },

    // Infrastructure (Priority 4)
    { name: "ERC6551 Registry", address: "0xE74D0b9372e81037e11B4DEEe27D063C24060Ea9", type: "Infrastructure" },
    { name: "ERC6551 Implementation", address: "0xb7160ebCd3C85189ee950570EABfA4dC22234Ec7", type: "Infrastructure" },

    // Older Implementation Versions (Priority 5 - For historical reference)
    { name: "TheCellarV3 (Impl v1.4.0)", address: "0x3Ae6fe0eD190Bd31bBE3fe7f91b310f9C8f45D5C", type: "Implementation" },
    { name: "TheCellarV3 (Impl v1.3.0)", address: "0x296d8B63c95013a6c972b3f08b0D52c859D37066", type: "Implementation" },

    // Deprecated Contracts (Skip by default)
    { name: "The Cellar (OLD - Broken Pool)", address: "0x6c7612F44B71E5E6E2bA0FEa799A23786A537755", type: "Proxy", skip: true },
    { name: "The Cellar (OLD - Impl)", address: "0xA349006F388DA608052395755d08E765b1960ecC", type: "Implementation", skip: true },
];

async function verifyContract(contract: ContractToVerify): Promise<{ success: boolean; error?: string }> {
    console.log(`\n📝 Verifying ${contract.name}...`);
    console.log(`   Address: ${contract.address}`);
    console.log(`   Type: ${contract.type}`);

    try {
        // Check if contract has code
        const code = await ethers.provider.getCode(contract.address);
        if (code === "0x") {
            return { success: false, error: "No contract code at address" };
        }

        // Build verify command
        let verifyCmd = `npx hardhat verify --network monad ${contract.address}`;

        // Add constructor args if provided
        if (contract.constructorArgs) {
            verifyCmd += ` ${contract.constructorArgs}`;
        }

        console.log(`   Command: ${verifyCmd}`);

        // Execute verification
        try {
            execSync(verifyCmd, {
                stdio: 'inherit',
                cwd: process.cwd(),
                env: { ...process.env }
            });

            console.log(`   ✅ Successfully verified ${contract.name}`);
            return { success: true };
        } catch (verifyError: any) {
            // Check if already verified
            if (verifyError.stdout?.toString().includes("Already Verified") ||
                verifyError.stderr?.toString().includes("Already Verified") ||
                verifyError.message?.includes("Already Verified")) {
                console.log(`   ✅ ${contract.name} is already verified`);
                return { success: true };
            }

            const errorMsg = verifyError.message || verifyError.stderr?.toString() || "Unknown error";
            console.error(`   ❌ Failed to verify ${contract.name}`);
            console.error(`   Error: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    } catch (error: any) {
        const errorMsg = error.message || "Unknown error";
        console.error(`   ❌ Error checking ${contract.name}: ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("=".repeat(80));
    console.log("BATCH VERIFY ALL MAINNET CONTRACTS");
    console.log("=".repeat(80));
    console.log(`Network: ${network.name}`);
    console.log(`Chain ID: ${network.chainId.toString()}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log("");

    // Check network
    if (Number(network.chainId) !== 143) {
        console.error("❌ ERROR: This script is for Monad Mainnet (Chain ID: 143)");
        console.error(`   Current chain ID: ${network.chainId.toString()}`);
        console.error("   Set NEXT_PUBLIC_MONAD_CHAIN_ID=143 to use mainnet");
        process.exit(1);
    }

    // Check API key
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey || apiKey === "empty") {
        console.error("❌ ERROR: ETHERSCAN_API_KEY not set!");
        console.error("   Set ETHERSCAN_API_KEY in .env file");
        console.error("   Example: $env:ETHERSCAN_API_KEY=\"your-api-key\"");
        process.exit(1);
    }

    console.log("✅ Network and API key configured correctly\n");

    // Filter out skipped contracts
    const contractsToProcess = CONTRACTS_TO_VERIFY.filter(c => !c.skip);
    const skippedContracts = CONTRACTS_TO_VERIFY.filter(c => c.skip);

    console.log(`📊 Total contracts: ${CONTRACTS_TO_VERIFY.length}`);
    console.log(`   To verify: ${contractsToProcess.length}`);
    console.log(`   Skipped: ${skippedContracts.length}`);
    console.log("");

    if (skippedContracts.length > 0) {
        console.log("⏭️  Skipped contracts (deprecated):");
        skippedContracts.forEach(c => {
            console.log(`   - ${c.name} (${c.address})`);
        });
        console.log("");
    }

    console.log("Starting verification process...\n");
    console.log("─".repeat(80));

    const results: Array<{
        contract: ContractToVerify;
        success: boolean;
        error?: string;
    }> = [];

    // Verify each contract
    for (let i = 0; i < contractsToProcess.length; i++) {
        const contract = contractsToProcess[i];
        console.log(`\n[${i + 1}/${contractsToProcess.length}]`);

        const result = await verifyContract(contract);
        results.push({
            contract,
            success: result.success,
            error: result.error,
        });

        // Add delay between verifications to avoid rate limiting
        if (i < contractsToProcess.length - 1) {
            console.log("   ⏳ Waiting 3 seconds before next verification...");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("VERIFICATION SUMMARY");
    console.log("=".repeat(80));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successfully verified: ${successful.length}/${contractsToProcess.length}`);
    console.log(`❌ Failed: ${failed.length}/${contractsToProcess.length}\n`);

    if (successful.length > 0) {
        console.log("✅ Verified Contracts:");
        successful.forEach(r => {
            console.log(`   ✓ ${r.contract.name}`);
        });
        console.log("");
    }

    if (failed.length > 0) {
        console.log("❌ Failed Contracts:");
        failed.forEach(r => {
            console.log(`   ✗ ${r.contract.name}`);
            console.log(`     Address: ${r.contract.address}`);
            if (r.error) {
                console.log(`     Error: ${r.error.substring(0, 100)}...`);
            }
            console.log("");
        });
        console.log("\n💡 Tip: Some contracts may need constructor arguments.");
        console.log("   Check the deployment script for constructor parameters.\n");
    }

    // Next steps
    console.log("=".repeat(80));
    console.log("NEXT STEPS");
    console.log("=".repeat(80));
    console.log("\n1. Check MonadScan to confirm verification:");
    console.log("   https://monadscan.com/address/<CONTRACT_ADDRESS>");
    console.log("\n2. For failed verifications:");
    console.log("   - Check if constructor arguments are needed");
    console.log("   - Verify contract name matches deployment");
    console.log("   - Check compiler settings match deployment");
    console.log("\n3. Re-run this script to retry failed verifications");
    console.log("   (Already verified contracts will be skipped)\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Fatal error:", error);
        process.exit(1);
    });

