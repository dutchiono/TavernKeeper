import { ethers, upgrades } from "hardhat";

/**
 * Verify On-Chain Contract State Against Documentation
 *
 * This script queries the actual on-chain implementation addresses and verifies
 * if updateTokenURI function exists, comparing against documented state from FIRSTDEPLOYMENT.md
 *
 * Usage:
 *   npx hardhat run scripts/verify_deployed_state.ts --network monad
 */

// Documented addresses from FIRSTDEPLOYMENT.md (Monad Mainnet)
// These are the EXACT addresses documented in FIRSTDEPLOYMENT.md
const DOCUMENTED_ADDRESSES = {
    Adventurer: {
        proxy: "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935", // Line 30
        knownImpls: [
            "0x71fb2B063569dD5B91c6241A9d6A41536894835A", // Line 70 - Initial deployment
            // NOTE: No upgrades documented for Adventurer in FIRSTDEPLOYMENT.md Upgrade History section
        ],
        latestImpl: "0x71fb2B063569dD5B91c6241A9d6A41536894835A", // Current documented implementation
    },
    TavernKeeper: {
        proxy: "0x56B81A60Ae343342685911bd97D1331fF4fa2d29", // Line 33
        knownImpls: [
            "0xA33dF761f3A72eDe5D38310a17fc8CF70798e0Be", // Line 71 - Initial deployment
            "0x48D8aeB5AD8175c701910A9Cf0aB25a9AeB048C6", // Line 114 - Upgraded 2025-12-03 (Pricing Logic Fix)
            "0xF65f10Eb3c01ee75024E048dfF8c3E618dA9E0d7", // Upgraded 2025-01-XX (Added updateTokenURI function)
        ],
        latestImpl: "0xF65f10Eb3c01ee75024E048dfF8c3E618dA9E0d7", // Current documented implementation (after updateTokenURI upgrade)
    },
};

interface VerificationResult {
    contractName: string;
    proxyAddress: string;
    documentedImpl: string;
    onChainImpl: string;
    implMatch: boolean;
    updateTokenURIExists: boolean;
    needsUpgrade: boolean;
    error?: string;
}

async function checkUpdateTokenURI(
    proxyAddress: string,
    contractFactory: any,
    contractName: string
): Promise<{ exists: boolean; error?: string }> {
    try {
        const contract = contractFactory.attach(proxyAddress);

        // Encode the function call
        const functionData = contract.interface.encodeFunctionData("updateTokenURI", [0, ""]);

        // Get provider and signer
        const [signer] = await ethers.getSigners();
        const provider = signer.provider;
        if (!provider) {
            return { exists: false, error: "No provider available" };
        }

        // Attempt low-level call to check if function exists
        try {
            await provider.call({
                to: proxyAddress,
                data: functionData,
            });
            // If call succeeds (unlikely), function exists
            return { exists: true };
        } catch (callError: any) {
            const errorMsg = callError.message || callError.toString();

            // Check for contract-specific validation errors (function exists)
            if (errorMsg.includes("Only token owner") ||
                errorMsg.includes("Metadata URI cannot be empty") ||
                errorMsg.includes(`${contractName}:`) ||
                errorMsg.includes("Not token owner") ||
                errorMsg.includes("cannot be empty")) {
                return { exists: true };
            }

            // Check for function selector errors (function does NOT exist)
            if (errorMsg.includes("function selector was not recognized") ||
                errorMsg.includes("execution reverted: function selector") ||
                errorMsg.includes("invalid opcode") ||
                errorMsg.includes("revert") && errorMsg.length < 100) {
                return { exists: false };
            }

            // Unknown error - return with error message
            return { exists: false, error: errorMsg.substring(0, 200) };
        }
    } catch (encodeError: any) {
        if (encodeError.message && encodeError.message.includes("no matching function")) {
            return { exists: false };
        }
        return { exists: false, error: encodeError.message || "Unknown error" };
    }
}

async function verifyContract(
    contractName: "Adventurer" | "TavernKeeper",
    documented: typeof DOCUMENTED_ADDRESSES.Adventurer | typeof DOCUMENTED_ADDRESSES.TavernKeeper
): Promise<VerificationResult> {
    const proxyAddress = documented.proxy;

    try {
        // Get contract factory
        const ContractFactory = await ethers.getContractFactory(contractName);

        // Query on-chain implementation address using ERC1967
        const onChainImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Check if on-chain implementation matches any documented implementation
        const implMatch = documented.knownImpls.some(
            impl => impl.toLowerCase() === onChainImpl.toLowerCase()
        );

        // Use latest documented implementation for display
        const documentedImpl = documented.latestImpl;

        // Check if updateTokenURI exists on-chain
        const uriCheck = await checkUpdateTokenURI(proxyAddress, ContractFactory, contractName);

        // Determine if upgrade is needed
        // Upgrade needed if: updateTokenURI doesn't exist
        // Note: Implementation mismatch alone doesn't mean upgrade needed (could be undocumented upgrade)
        // But if updateTokenURI is missing, upgrade is definitely needed
        const needsUpgrade = !uriCheck.exists;

        return {
            contractName,
            proxyAddress,
            documentedImpl,
            onChainImpl,
            implMatch,
            updateTokenURIExists: uriCheck.exists,
            needsUpgrade,
            error: uriCheck.error,
        };
    } catch (error: any) {
        return {
            contractName,
            proxyAddress,
            documentedImpl: documented.latestImpl,
            onChainImpl: "ERROR",
            implMatch: false,
            updateTokenURIExists: false,
            needsUpgrade: true,
            error: error.message || "Failed to query contract",
        };
    }
}

async function main() {
    console.log("=== Contract Verification Report ===\n");
    console.log("Verifying on-chain state against FIRSTDEPLOYMENT.md documentation...\n");

    const results: VerificationResult[] = [];

    // Verify Adventurer
    console.log("Checking Adventurer...");
    const adventurerResult = await verifyContract("Adventurer", DOCUMENTED_ADDRESSES.Adventurer);
    results.push(adventurerResult);

    // Verify TavernKeeper
    console.log("Checking TavernKeeper...");
    const tavernKeeperResult = await verifyContract("TavernKeeper", DOCUMENTED_ADDRESSES.TavernKeeper);
    results.push(tavernKeeperResult);

    // Print results
    console.log("\n" + "=".repeat(80));
    console.log("VERIFICATION RESULTS");
    console.log("=".repeat(80) + "\n");

    for (const result of results) {
        const documented = result.contractName === "Adventurer"
            ? DOCUMENTED_ADDRESSES.Adventurer
            : DOCUMENTED_ADDRESSES.TavernKeeper;

        console.log(`${result.contractName}:`);
        console.log(`  Proxy Address:     ${result.proxyAddress}`);
        console.log(`  Documented Impls:   ${documented.knownImpls.join(", ")}`);
        console.log(`  Latest Doc Impl:   ${result.documentedImpl} (from FIRSTDEPLOYMENT.md)`);
        console.log(`  On-Chain Impl:     ${result.onChainImpl}`);
        console.log(`  Implementation:    ${result.implMatch ? "✅ MATCHES DOCUMENTED" : "❌ NOT IN DOCUMENTATION"}`);
        console.log(`  updateTokenURI:    ${result.updateTokenURIExists ? "✅ EXISTS" : "❌ MISSING"}`);

        if (result.error && !result.updateTokenURIExists) {
            console.log(`  Error Details:     ${result.error}`);
        }

        if (!result.implMatch && result.onChainImpl !== "ERROR") {
            console.log(`  ⚠️  WARNING: On-chain implementation (${result.onChainImpl}) is NOT in documented addresses`);
            console.log(`     Documented addresses: ${documented.knownImpls.join(", ")}`);
            console.log(`     This indicates an UNDOCUMENTED upgrade or documentation is out of date`);
            console.log(`     ACTION REQUIRED: Update FIRSTDEPLOYMENT.md with this implementation address`);
        }
        console.log(`  Status:            ${result.needsUpgrade ? "⚠️  NEEDS UPGRADE" : "✅ NO UPGRADE NEEDED"}`);
        console.log();
    }

    // Summary
    console.log("=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));

    const needsUpgrade = results.filter(r => r.needsUpgrade);
    if (needsUpgrade.length === 0) {
        console.log("\n✅ All contracts are up-to-date. No upgrades needed.");
    } else {
        console.log(`\n⚠️  ${needsUpgrade.length} contract(s) need upgrade:`);
        for (const result of needsUpgrade) {
            const documented = result.contractName === "Adventurer"
                ? DOCUMENTED_ADDRESSES.Adventurer
                : DOCUMENTED_ADDRESSES.TavernKeeper;

            console.log(`  - ${result.contractName}`);
            if (!result.updateTokenURIExists) {
                console.log(`    Reason: updateTokenURI function is MISSING on-chain`);
                console.log(`    Action: Upgrade contract to add updateTokenURI function`);
            }
            if (!result.implMatch && result.onChainImpl !== "ERROR") {
                console.log(`    Reason: On-chain implementation NOT documented`);
                console.log(`      On-Chain:   ${result.onChainImpl}`);
                console.log(`      Documented: ${documented.knownImpls.join(", ")}`);
                console.log(`    Action: Update FIRSTDEPLOYMENT.md with current implementation OR upgrade to documented version`);
            }
        }
        console.log("\nTo upgrade, run:");
        for (const result of needsUpgrade) {
            console.log(`  CONTRACT_NAME=${result.contractName} PROXY_ADDRESS=${result.proxyAddress} npx hardhat run scripts/upgrade.ts --network monad`);
        }
    }

    console.log("\n" + "=".repeat(80));
    console.log("Block Explorer Links:");
    for (const result of results) {
        console.log(`  ${result.contractName}: https://explorer.monad.xyz/address/${result.proxyAddress}#code`);
    }
    console.log("=".repeat(80));
}

main().catch((error) => {
    console.error("Verification failed:", error);
    process.exitCode = 1;
});
