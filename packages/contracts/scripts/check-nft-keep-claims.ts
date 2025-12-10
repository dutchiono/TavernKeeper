import { ethers } from "hardhat";

/**
 * Script to check existing TavernKeeper NFTs and how much KEEP they could claim
 *
 * Usage:
 *   npx hardhat run scripts/check-nft-keep-claims.ts --network monad
 */

// Mainnet addresses
const TAVERNKEEPER_MAINNET = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const KEEP_TOKEN_MAINNET = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

// Testnet addresses
const TAVERNKEEPER_TESTNET = "0xFaC0786eF353583FBD43Ee7E7e84836c1857A381";
const KEEP_TOKEN_TESTNET = "0x96982EC3625145f098DCe06aB34E99E7207b0520";

const TAVERNKEEPER_ABI = [
    "function calculatePendingTokens(uint256 tokenId) view returns (uint256)",
    "function lastClaimTime(uint256 tokenId) view returns (uint256)",
    "function mintingRate(uint256 tokenId) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
];

const KEEP_TOKEN_ABI = [
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
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

    const tavernKeeperAddress = isMainnet ? TAVERNKEEPER_MAINNET : TAVERNKEEPER_TESTNET;
    const keepTokenAddress = isMainnet ? KEEP_TOKEN_MAINNET : KEEP_TOKEN_TESTNET;

    console.log("=== CHECKING NFT KEEP CLAIMS ===\n");
    console.log(`Network: ${isMainnet ? "Monad Mainnet" : "Monad Testnet"}`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`TavernKeeper: ${tavernKeeperAddress}`);
    console.log(`KeepToken: ${keepTokenAddress}\n`);

    try {
        const tavernKeeperContract = new ethers.Contract(tavernKeeperAddress, TAVERNKEEPER_ABI, provider);
        const keepTokenContract = new ethers.Contract(keepTokenAddress, KEEP_TOKEN_ABI, provider);

        // Get current total supply
        const totalSupply = await keepTokenContract.totalSupply();
        const decimals = await keepTokenContract.decimals();
        const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

        console.log(`📊 Current KEEP Total Supply: ${totalSupplyFormatted} KEEP\n`);

        // Find all NFTs by trying token IDs (start from 0, go up until we get errors)
        console.log("📊 Scanning for existing NFTs...");
        const tokenIds: bigint[] = [];
        let tokenId = 0n;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 100; // Stop after 100 consecutive errors

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

            if (tokenId % 100n === 0n) {
                process.stdout.write(`   Checked ${tokenId} token IDs, found ${tokenIds.length} NFTs...\r`);
            }
        }

        console.log(`\n✅ Found ${tokenIds.length} TavernKeeper NFTs\n`);

        if (tokenIds.length === 0) {
            console.log("✅ No NFTs found. No claims possible.");
            return;
        }

        // Check each NFT for pending claims
        console.log("📊 Calculating pending KEEP for each NFT...\n");
        let totalPending = 0n;
        let activeNFTs = 0;
        const nftDetails: Array<{
            tokenId: string;
            pending: bigint;
            pendingFormatted: string;
            lastClaimTime: bigint;
            rate: bigint;
            owner: string;
        }> = [];

        for (const id of tokenIds) {
            try {
                const pending = await tavernKeeperContract.calculatePendingTokens(id);
                const lastClaim = await tavernKeeperContract.lastClaimTime(id);
                const rate = await tavernKeeperContract.mintingRate(id);
                const owner = await tavernKeeperContract.ownerOf(id);

                if (pending > 0n) {
                    totalPending += pending;
                    activeNFTs++;
                    nftDetails.push({
                        tokenId: id.toString(),
                        pending,
                        pendingFormatted: ethers.formatUnits(pending, decimals),
                        lastClaimTime: lastClaim,
                        rate,
                        owner,
                    });
                }
            } catch (error) {
                // Skip errors
            }
        }

        const totalPendingFormatted = ethers.formatUnits(totalPending, decimals);

        // Summary
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("SUMMARY");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        console.log(`📈 Current Total Supply: ${totalSupplyFormatted} KEEP`);
        console.log(`⏳ Total Pending (Claimable by NFTs): ${totalPendingFormatted} KEEP`);
        console.log(`🎫 NFTs with Pending Claims: ${activeNFTs} out of ${tokenIds.length}\n`);

        if (activeNFTs > 0) {
            console.log("⚠️  WARNING: These NFTs can claim KEEP tokens RIGHT NOW!");
            console.log("   Upgrade TavernKeeper contract ASAP to disable claimTokens()\n");

            // Show top 10 by pending amount
            const sorted = nftDetails.sort((a, b) => {
                if (b.pending > a.pending) return 1;
                if (b.pending < a.pending) return -1;
                return 0;
            });

            console.log("Top NFTs by Pending Amount:");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            for (let i = 0; i < Math.min(10, sorted.length); i++) {
                const nft = sorted[i];
                const daysSinceClaim = Number((BigInt(Math.floor(Date.now() / 1000)) - nft.lastClaimTime) / 86400n);
                console.log(`Token #${nft.tokenId}:`);
                console.log(`  Pending: ${nft.pendingFormatted} KEEP`);
                console.log(`  Owner: ${nft.owner}`);
                console.log(`  Days since last claim: ${daysSinceClaim}`);
                console.log(`  Rate: ${ethers.formatUnits(nft.rate, decimals)} KEEP/sec\n`);
            }
        }

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    } catch (error) {
        console.error("❌ Error checking NFT claims:", error);
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

