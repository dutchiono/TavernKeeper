import { ethers } from "hardhat";

/**
 * Check verification status of all mainnet contracts
 *
 * This script queries MonadScan API to check if contracts are verified.
 *
 * Usage:
 *   $env:NEXT_PUBLIC_MONAD_CHAIN_ID="143"
 *   npx hardhat run scripts/check_verification_status.ts --network monad
 */

// Mainnet contract addresses from DEPLOYMENT_TRACKER.md
const MAINNET_CONTRACTS = [
    { name: "TheCellarV3 (Proxy)", address: "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0", type: "Proxy" },
    { name: "TheCellarV3 (Impl v1.5.0)", address: "0x85d081275254f39d31ebC7b5b5DCBD7276C4E9dF", type: "Implementation" },
    { name: "TheCellarV3 (Impl v1.4.0)", address: "0x3Ae6fe0eD190Bd31bBE3fe7f91b310f9C8f45D5C", type: "Implementation" },
    { name: "TheCellarV3 (Impl v1.3.0)", address: "0x296d8B63c95013a6c972b3f08b0D52c859D37066", type: "Implementation" },
    { name: "CellarToken", address: "0x6eF142a2203102F6c58b0C15006BF9F6F5CFe39E", type: "Contract" },
    { name: "KeepToken (Proxy)", address: "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E", type: "Proxy" },
    { name: "TavernKeeper (Proxy)", address: "0x56B81A60Ae343342685911bd97D1331fF4fa2d29", type: "Proxy" },
    { name: "TavernKeeper (Impl v4.2.0)", address: "0x81146F855f5B0C567e9F0d3a2A082Aed81F34762", type: "Implementation" },
    { name: "Adventurer (Proxy)", address: "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935", type: "Proxy" },
    { name: "Adventurer (Impl v4.1.0)", address: "0x961F7b389ebe40C61aE1b64425F23CFEA79a4458", type: "Implementation" },
    { name: "CellarZapV4 (Proxy)", address: "0xf7248a01051bf297Aa56F12a05e7209C60Fc5863", type: "Proxy" },
    { name: "Tavern Regulars Manager", address: "0x9f455Ad562e080CC745f9E97c469a86E1bBF8db8", type: "Proxy" },
    { name: "Town Posse Manager", address: "0xE46592D8185975888b4A301DBD9b24A49933CC7D", type: "Proxy" },
    { name: "Inventory (Proxy)", address: "0xcB11EFb6E697b5eD7841717b4C994D3edC8393b4", type: "Proxy" },
    { name: "DungeonGatekeeper (Proxy)", address: "0xf454A4A4f2F960a5d5b7583A289dCAE765d57355", type: "Proxy" },
    { name: "ERC6551 Registry", address: "0xE74D0b9372e81037e11B4DEEe27D063C24060Ea9", type: "Infrastructure" },
    { name: "ERC6551 Implementation", address: "0xb7160ebCd3C85189ee950570EABfA4dC22234Ec7", type: "Infrastructure" },
    // Old deprecated contracts
    { name: "The Cellar (OLD - Broken Pool)", address: "0x6c7612F44B71E5E6E2bA0FEa799A23786A537755", type: "Proxy (Deprecated)" },
    { name: "The Cellar (OLD - Impl)", address: "0xA349006F388DA608052395755d08E765b1960ecC", type: "Implementation (Deprecated)" },
];

const MONADSCAN_API_URL = "https://api.monadscan.com/api";

async function checkVerificationStatus(address: string): Promise<{ verified: boolean; error?: string }> {
    try {
        // Check if contract has code
        const provider = ethers.provider;
        const code = await provider.getCode(address);

        if (code === "0x") {
            return { verified: false, error: "No contract code at address" };
        }

        // Try to query MonadScan API for verification status
        // Note: This is a simplified check - actual API may differ
        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey || apiKey === "empty") {
            // Without API key, we can only check if code exists
            return { verified: false, error: "Cannot verify without ETHERSCAN_API_KEY" };
        }

        try {
            const response = await fetch(
                `${MONADSCAN_API_URL}?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`
            );

            if (!response.ok) {
                return { verified: false, error: `API request failed: ${response.statusText}` };
            }

            const data = await response.json();

            if (data.status === "1" && data.result && data.result.length > 0) {
                const contractInfo = data.result[0];
                const isVerified = contractInfo.SourceCode && contractInfo.SourceCode !== "";
                return { verified: isVerified };
            } else {
                return { verified: false, error: "Contract not found in API" };
            }
        } catch (apiError: any) {
            // If API fails, fall back to checking if code exists
            return { verified: false, error: `API error: ${apiError.message}` };
        }
    } catch (error: any) {
        return { verified: false, error: error.message };
    }
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("=== MAINNET CONTRACT VERIFICATION STATUS ===\n");
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId.toString());
    console.log("Deployer:", deployer.address);
    console.log("MonadScan API:", MONADSCAN_API_URL);
    console.log("");

    if (Number(network.chainId) !== 143) {
        console.error("⚠️  WARNING: This script is for Monad Mainnet (Chain ID: 143)");
        console.error("   Current chain ID:", network.chainId.toString());
        console.error("   Set NEXT_PUBLIC_MONAD_CHAIN_ID=143 to use mainnet\n");
    }

    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey || apiKey === "empty") {
        console.warn("⚠️  WARNING: ETHERSCAN_API_KEY not set. Verification status may be incomplete.");
        console.warn("   Set ETHERSCAN_API_KEY in .env to get accurate verification status.\n");
    }

    console.log("Checking verification status for all mainnet contracts...\n");
    console.log("─".repeat(80));

    const results: Array<{
        name: string;
        address: string;
        type: string;
        verified: boolean;
        error?: string;
    }> = [];

    for (const contract of MAINNET_CONTRACTS) {
        process.stdout.write(`Checking ${contract.name}... `);
        const status = await checkVerificationStatus(contract.address);
        results.push({
            name: contract.name,
            address: contract.address,
            type: contract.type,
            verified: status.verified,
            error: status.error,
        });

        if (status.verified) {
            console.log("✅ VERIFIED");
        } else if (status.error?.includes("No contract code")) {
            console.log("❌ NO CODE");
        } else if (status.error?.includes("ETHERSCAN_API_KEY")) {
            console.log("⚠️  UNKNOWN (API key needed)");
        } else {
            console.log("❌ NOT VERIFIED");
        }
    }

    console.log("\n" + "─".repeat(80));
    console.log("\n=== SUMMARY ===\n");

    const verified = results.filter(r => r.verified);
    const notVerified = results.filter(r => !r.verified && !r.error?.includes("No contract code"));
    const noCode = results.filter(r => r.error?.includes("No contract code"));
    const unknown = results.filter(r => r.error?.includes("API key") || r.error?.includes("API error"));

    console.log(`✅ Verified: ${verified.length}`);
    console.log(`❌ Not Verified: ${notVerified.length}`);
    console.log(`⚠️  Unknown (need API key): ${unknown.length}`);
    console.log(`🚫 No Code: ${noCode.length}`);
    console.log(`📊 Total: ${results.length}\n`);

    if (notVerified.length > 0) {
        console.log("=== CONTRACTS NEEDING VERIFICATION ===\n");
        notVerified.forEach(contract => {
            console.log(`❌ ${contract.name}`);
            console.log(`   Address: ${contract.address}`);
            console.log(`   Type: ${contract.type}`);
            console.log(`   Verify: npx hardhat verify --network monad ${contract.address}`);
            console.log("");
        });
    }

    if (unknown.length > 0 && (!apiKey || apiKey === "empty")) {
        console.log("=== CONTRACTS WITH UNKNOWN STATUS (Need API Key) ===\n");
        unknown.forEach(contract => {
            console.log(`⚠️  ${contract.name}`);
            console.log(`   Address: ${contract.address}`);
            console.log(`   Type: ${contract.type}`);
            console.log("");
        });
    }

    console.log("\n=== VERIFICATION COMMANDS ===\n");
    console.log("To verify contracts, run:");
    console.log("  cd packages/contracts");
    console.log("  $env:NEXT_PUBLIC_MONAD_CHAIN_ID=\"143\"");
    console.log("  $env:ETHERSCAN_API_KEY=\"your-api-key\"");
    console.log("  npx hardhat verify --network monad <CONTRACT_ADDRESS>\n");

    console.log("For implementation contracts (no constructor args):");
    console.log("  npx hardhat verify --network monad <IMPL_ADDRESS>\n");

    console.log("For proxy contracts, verify the implementation address, not the proxy.\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

