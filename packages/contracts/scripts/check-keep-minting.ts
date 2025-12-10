import { ethers } from "hardhat";

/**
 * Script to check KEEP token minting statistics
 *
 * Shows:
 * - Current total supply (already minted)
 * - Maximum supply cap (4 billion KEEP)
 * - Remaining mintable supply
 *
 * Note: Only the Office (King of the Hill) mints KEEP tokens.
 * NFTs do NOT mint KEEP (claimTokens() is disabled).
 *
 * Usage:
 *   npx hardhat run scripts/check-keep-minting.ts --network monad
 */

// Mainnet addresses
const KEEP_TOKEN_MAINNET = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

// Testnet addresses
const KEEP_TOKEN_TESTNET = "0x96982EC3625145f098DCe06aB34E99E7207b0520";

const KEEP_TOKEN_ABI = [
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function MAX_SUPPLY() view returns (uint256)",
    "function getRemainingSupply() view returns (uint256)",
];

async function main() {
    const [signer] = await ethers.getSigners();
    const provider = signer.provider;
    if (!provider) {
        console.error("❌ No provider available");
        process.exit(1);
    }

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const isMainnet = chainId === 143;

    const keepTokenAddress = isMainnet ? KEEP_TOKEN_MAINNET : KEEP_TOKEN_TESTNET;

    console.log("=== KEEP TOKEN MINTING STATISTICS ===\n");
    console.log(`Network: ${isMainnet ? "Monad Mainnet" : "Monad Testnet"}`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`KeepToken: ${keepTokenAddress}\n`);

    try {
        const keepTokenContract = new ethers.Contract(keepTokenAddress, KEEP_TOKEN_ABI, provider);

        // Get current total supply
        console.log("📊 Fetching current total supply...");
        const totalSupply = await keepTokenContract.totalSupply();
        const decimals = await keepTokenContract.decimals();
        const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

        // Try to get MAX_SUPPLY (may not exist in old version)
        let maxSupply: bigint | null = null;
        let remainingSupply: bigint | null = null;
        try {
            maxSupply = await keepTokenContract.MAX_SUPPLY();
            remainingSupply = await keepTokenContract.getRemainingSupply();
        } catch (error) {
            console.log("   ⚠️  MAX_SUPPLY not available (contract may need upgrade)\n");
        }

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("SUMMARY");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        console.log(`📈 Currently Minted:`);
        console.log(`   ${totalSupplyFormatted} KEEP`);
        console.log(`   (${totalSupply.toString()} wei)\n`);

        if (maxSupply !== null && remainingSupply !== null) {
            const maxSupplyFormatted = ethers.formatUnits(maxSupply, decimals);
            const remainingFormatted = ethers.formatUnits(remainingSupply, decimals);
            const percentage = (Number(totalSupply) / Number(maxSupply)) * 100;

            console.log(`📊 Maximum Supply Cap:`);
            console.log(`   ${maxSupplyFormatted} KEEP (4 billion)\n`);

            console.log(`📊 Remaining Mintable:`);
            console.log(`   ${remainingFormatted} KEEP\n`);

            console.log(`📊 Progress:`);
            console.log(`   ${percentage.toFixed(2)}% of max supply minted\n`);
        } else {
            console.log(`📊 Maximum Supply Cap:`);
            console.log(`   ⚠️  Not set (contract needs upgrade to add 4 billion cap)\n`);
        }

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("ℹ️  Note: Only the Office (King of the Hill) mints KEEP tokens.");
        console.log("   NFTs do NOT mint KEEP (claimTokens() is disabled).");
        console.log("   Office minting rate starts at 4 KEEP/second and halves every 30 days.\n");

    } catch (error) {
        console.error("❌ Error checking KEEP minting stats:", error);
        if (error instanceof Error) {
            console.error("   Message:", error.message);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
