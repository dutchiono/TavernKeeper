import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

/**
 * Script to check if a TavernKeeper NFT was successfully minted on-chain
 * Usage: npx hardhat run scripts/check-mint-status.ts --network monad
 *
 * Set USER_ADDRESS environment variable to check a specific address
 * Example: $env:USER_ADDRESS="0xd515674a7fe63dfdfd43fb5647e8b04eefcedcaa"; npx hardhat run scripts/check-mint-status.ts --network monad
 */

// Mainnet addresses
const TAVERNKEEPER = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const ADVENTURER = "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935";
const ERC6551_REGISTRY = "0xE74D0b9372e81037e11B4DEEe27D063C24060Ea9";
const ERC6551_IMPLEMENTATION = "0xb7160ebCd3C85189ee950570EABfA4dC22234Ec7";
const MONAD_CHAIN_ID = 143;

const TAVERNKEEPER_ABI = [
    "function getTokensOfOwner(address owner) view returns (uint256[])",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
];

const ADVENTURER_ABI = [
    "function getTokensOfOwner(address owner) view returns (uint256[])",
];

const ERC6551_REGISTRY_ABI = [
    "function account(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt) view returns (address)",
];

async function main() {
    const userAddress = process.env.USER_ADDRESS || "";

    if (!userAddress) {
        console.error('❌ Please set USER_ADDRESS environment variable');
        console.error('Example: $env:USER_ADDRESS="0xd515674a7fe63dfdfd43fb5647e8b04eefcedcaa"; npx hardhat run scripts/check-mint-status.ts --network monad');
        process.exit(1);
    }

    console.log('🔍 Checking mint status for:', userAddress);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const [signer] = await ethers.getSigners();
    const provider = signer.provider;
    if (!provider) {
        console.error('❌ No provider available');
        process.exit(1);
    }

    try {
        const tavernKeeperContract = new ethers.Contract(TAVERNKEEPER, TAVERNKEEPER_ABI, provider);

        // Check if user owns any TavernKeeper NFTs
        const tokenIds = await tavernKeeperContract.getTokensOfOwner(userAddress);

        console.log(`📊 Found ${tokenIds.length} TavernKeeper NFT(s) owned by ${userAddress}\n`);

        if (tokenIds.length === 0) {
            console.log('⚠️  No TavernKeeper NFTs found for this address.');
            console.log('   This could mean:');
            console.log('   1. The mint transaction failed or was rejected');
            console.log('   2. The NFT was transferred to another address');
            console.log('   3. The transaction is still pending');
            console.log('\n   Check your wallet transaction history to verify the mint status.');
            return;
        }

        const registryContract = new ethers.Contract(ERC6551_REGISTRY, ERC6551_REGISTRY_ABI, provider);
        const adventurerContract = new ethers.Contract(ADVENTURER, ADVENTURER_ABI, provider);

        // Check each token
        for (const tokenIdBigInt of tokenIds) {
            const tokenId = tokenIdBigInt.toString();
            console.log(`\n🎫 Token ID: ${tokenId}`);

            // Get owner
            const owner = await tavernKeeperContract.ownerOf(tokenIdBigInt);
            console.log(`   Owner: ${owner}`);
            console.log(`   Matches user: ${owner.toLowerCase() === userAddress.toLowerCase() ? '✅ YES' : '❌ NO'}`);

            // Get token URI
            try {
                const tokenURI = await tavernKeeperContract.tokenURI(tokenIdBigInt);
                console.log(`   Token URI: ${tokenURI}`);
            } catch (e) {
                console.log(`   Token URI: ❌ Failed to fetch (${e instanceof Error ? e.message : 'unknown error'})`);
            }

            // Check TBA (Token Bound Account)
            try {
                const tba = await registryContract.account(
                    ERC6551_IMPLEMENTATION,
                    MONAD_CHAIN_ID,
                    TAVERNKEEPER,
                    tokenIdBigInt,
                    0
                );
                console.log(`   TBA Address: ${tba}`);

                // Check if TBA has any heroes
                try {
                    const heroTokenIds = await adventurerContract.getTokensOfOwner(tba);
                    console.log(`   Heroes in TBA: ${heroTokenIds.length}`);
                } catch (e) {
                    console.log(`   Heroes in TBA: ❌ Failed to check`);
                }
            } catch (e) {
                console.log(`   TBA: ⚠️  Not created yet (this is normal if TBA hasn't been initialized)`);
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Mint verification complete!');
        console.log('\n💡 Note: If you see NFTs here, the mint was successful on-chain.');
        console.log('   If the UI is not showing them, it may be a frontend caching issue.');

    } catch (error) {
        console.error('❌ Error checking mint status:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
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

