import { ethers } from "hardhat";

/**
 * Script to claim KEEP tokens for all existing TavernKeeper NFTs
 *
 * This claims pending KEEP for all NFTs before we disable the claimTokens() function.
 *
 * Usage:
 *   npx hardhat run scripts/claim-all-nft-keep.ts --network monad
 *
 * Note: This requires the deployer to own all NFTs OR each owner to run this separately.
 * For automatic claiming during upgrade, see the upgrade contract.
 */

// Mainnet addresses
const TAVERNKEEPER_MAINNET = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const KEEP_TOKEN_MAINNET = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

// Testnet addresses
const TAVERNKEEPER_TESTNET = "0xFaC0786eF353583FBD43Ee7E7e84836c1857A381";
const KEEP_TOKEN_TESTNET = "0x96982EC3625145f098DCe06aB34E99E7207b0520";

const TAVERNKEEPER_ABI = [
    "function calculatePendingTokens(uint256 tokenId) view returns (uint256)",
    "function claimTokens(uint256 tokenId)",
    "function ownerOf(uint256 tokenId) view returns (address)",
];

const KEEP_TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
];

async function main() {
    const [deployer] = await ethers.getSigners();
    const provider = deployer.provider;
    if (!provider) {
        console.error("❌ No provider available");
        process.exit(1);
    }

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const isMainnet = chainId === 143;

    const tavernKeeperAddress = isMainnet ? TAVERNKEEPER_MAINNET : TAVERNKEEPER_TESTNET;
    const keepTokenAddress = isMainnet ? KEEP_TOKEN_MAINNET : KEEP_TOKEN_TESTNET;

    console.log("=== CLAIMING KEEP FOR ALL NFTs ===\n");
    console.log(`Network: ${isMainnet ? "Monad Mainnet" : "Monad Testnet"}`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`TavernKeeper: ${tavernKeeperAddress}\n`);

    try {
        const tavernKeeperContract = new ethers.Contract(tavernKeeperAddress, TAVERNKEEPER_ABI, deployer);
        const keepTokenContract = new ethers.Contract(keepTokenAddress, KEEP_TOKEN_ABI, provider);
        const decimals = await keepTokenContract.decimals();

        // Find all NFTs
        console.log("📊 Finding all NFTs...");
        const tokenIds: bigint[] = [];
        let tokenId = 0n;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 100;

        while (consecutiveErrors < maxConsecutiveErrors) {
            try {
                const owner = await tavernKeeperContract.ownerOf(tokenId);
                if (owner && owner !== ethers.ZeroAddress) {
                    tokenIds.push(tokenId);
                    consecutiveErrors = 0;
                }
            } catch (error: any) {
                consecutiveErrors++;
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    break;
                }
            }
            tokenId++;

            if (tokenId % 50n === 0n) {
                process.stdout.write(`   Checked ${tokenId} token IDs, found ${tokenIds.length} NFTs...\r`);
            }
        }

        console.log(`\n✅ Found ${tokenIds.length} NFTs\n`);

        if (tokenIds.length === 0) {
            console.log("✅ No NFTs found. Nothing to claim.");
            return;
        }

        // Check pending for each NFT and claim if deployer owns it
        console.log("📊 Checking and claiming pending KEEP...\n");
        let totalClaimed = 0n;
        let claimedCount = 0;
        let skippedCount = 0;

        for (const id of tokenIds) {
            try {
                const owner = await tavernKeeperContract.ownerOf(id);
                const pending = await tavernKeeperContract.calculatePendingTokens(id);

                if (pending === 0n) {
                    skippedCount++;
                    continue;
                }

                // Only claim if deployer owns the NFT
                if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
                    console.log(`   Token #${id}: Owned by ${owner}, skipping (not deployer)`);
                    skippedCount++;
                    continue;
                }

                console.log(`   Token #${id}: Claiming ${ethers.formatUnits(pending, decimals)} KEEP...`);

                const tx = await tavernKeeperContract.claimTokens(id);
                await tx.wait();

                totalClaimed += pending;
                claimedCount++;

                console.log(`   ✅ Claimed ${ethers.formatUnits(pending, decimals)} KEEP\n`);
            } catch (error: any) {
                console.error(`   ❌ Error claiming Token #${id}:`, error.message);
                skippedCount++;
            }
        }

        // Summary
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("SUMMARY");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        console.log(`✅ Successfully claimed: ${claimedCount} NFTs`);
        console.log(`⏭️  Skipped: ${skippedCount} NFTs (not owned by deployer or no pending)`);
        console.log(`💰 Total Claimed: ${ethers.formatUnits(totalClaimed, decimals)} KEEP\n`);

        if (skippedCount > 0) {
            console.log("⚠️  Note: Some NFTs were skipped because:");
            console.log("   - They are not owned by the deployer");
            console.log("   - They have no pending tokens");
            console.log("   - An error occurred during claiming");
            console.log("\n   Other NFT owners will need to claim their tokens themselves");
            console.log("   before the upgrade disables claimTokens().\n");
        }

        // Check deployer's KEEP balance
        const deployerBalance = await keepTokenContract.balanceOf(deployer.address);
        console.log(`📊 Deployer KEEP Balance: ${ethers.formatUnits(deployerBalance, decimals)} KEEP\n`);

    } catch (error) {
        console.error("❌ Error claiming KEEP:", error);
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

