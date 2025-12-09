import * as dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config({ path: "../../.env" });

/**
 * Verify TBA calculation for a TavernKeeper
 * Usage: npx tsx scripts/verify-tba-calculation.ts
 */

const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const TAVERNKEEPER_TOKEN_ID = 1; // Change this to the token ID you want to check
const CHAIN_ID = 143; // Monad mainnet

// Contract addresses (testnet)
const TAVERNKEEPER_CONTRACT = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const ERC6551_REGISTRY = "0xE74D0b9372e81037e11B4DEEe27D063C24060Ea9";
const ERC6551_IMPLEMENTATION = "0xb7160ebCd3C85189ee950570EABfA4dC22234Ec7";

const ERC6551_REGISTRY_ABI = [
    "function account(address implementation, bytes32 salt, uint256 chainId, address tokenContract, uint256 tokenId) view returns (address)"
];

const ADVENTURER_ABI = [
    "function erc6551Registry() view returns (address)",
    "function erc6551AccountImpl() view returns (address)",
    "function tavernKeeperContract() view returns (address)",
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(ERC6551_REGISTRY, ERC6551_REGISTRY_ABI, provider);

    console.log(`🔍 Verifying TBA calculation for TavernKeeper #${TAVERNKEEPER_TOKEN_ID}\n`);
    console.log(`   Registry: ${ERC6551_REGISTRY}`);
    console.log(`   Implementation: ${ERC6551_IMPLEMENTATION}`);
    console.log(`   Token Contract: ${TAVERNKEEPER_CONTRACT}`);
    console.log(`   Chain ID: ${CHAIN_ID}`);
    console.log(`   Salt: 0x${'0'.repeat(64)} (bytes32(0))\n`);

    // Calculate TBA using registry
    const salt = "0x" + "0".repeat(64);
    const tba = await registry.account(
        ERC6551_IMPLEMENTATION,
        salt,
        CHAIN_ID,
        TAVERNKEEPER_CONTRACT,
        TAVERNKEEPER_TOKEN_ID
    );

    console.log(`✅ Calculated TBA: ${tba}\n`);

    // Check if Adventurer contract has different addresses configured
    const ADVENTURER_CONTRACT = "0x4Fff2Ce5144989246186462337F0eE2C913F913E"; // testnet
    try {
        const adventurer = new ethers.Contract(ADVENTURER_CONTRACT, ADVENTURER_ABI, provider);
        const [contractRegistry, contractImpl, contractTavernKeeper] = await Promise.all([
            adventurer.erc6551Registry().catch(() => null),
            adventurer.erc6551AccountImpl().catch(() => null),
            adventurer.tavernKeeperContract().catch(() => null),
        ]);

        if (contractRegistry || contractImpl || contractTavernKeeper) {
            console.log(`📋 Addresses from Adventurer contract:`);
            if (contractRegistry) console.log(`   Registry: ${contractRegistry}`);
            if (contractImpl) console.log(`   Implementation: ${contractImpl}`);
            if (contractTavernKeeper) console.log(`   TavernKeeper: ${contractTavernKeeper}\n`);

            // Recalculate with contract addresses
            if (contractRegistry && contractImpl && contractTavernKeeper) {
                const contractRegistryContract = new ethers.Contract(contractRegistry, ERC6551_REGISTRY_ABI, provider);
                const contractTba = await contractRegistryContract.account(
                    contractImpl,
                    salt,
                    CHAIN_ID,
                    contractTavernKeeper,
                    TAVERNKEEPER_TOKEN_ID
                );
                console.log(`✅ TBA using contract addresses: ${contractTba}\n`);

                if (contractTba.toLowerCase() !== tba.toLowerCase()) {
                    console.log(`⚠️  MISMATCH! Frontend and contract calculate different TBAs!`);
                    console.log(`   Frontend TBA: ${tba}`);
                    console.log(`   Contract TBA: ${contractTba}`);
                } else {
                    console.log(`✅ Addresses match!`);
                }
            }
        }
    } catch (e) {
        console.log(`⚠️  Could not fetch addresses from Adventurer contract:`, e);
    }

    // Check if any heroes are owned by this TBA
    const ADVENTURER_CONTRACT_FIXED = "0x4Fff2Ce5144989246186462337F0eE2C086F913E"; // Fixed checksum
    const ADVENTURER_ABI_FULL = [
        "function balanceOf(address owner) view returns (uint256)",
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function getTokensOfOwner(address owner) view returns (uint256[])",
    ];
    const adventurer = new ethers.Contract(ADVENTURER_CONTRACT_FIXED, ADVENTURER_ABI_FULL, provider);

    try {
        const balance = await adventurer.balanceOf(tba);
        console.log(`\n📊 Hero Balance for TBA ${tba}: ${balance.toString()}`);

        if (balance > 0n) {
            console.log(`✅ Heroes found! This TBA owns ${balance.toString()} hero(es)`);

            // Try to get token IDs
            try {
                const tokenIds = await adventurer.getTokensOfOwner(tba);
                console.log(`   Token IDs: ${tokenIds.map((id: bigint) => id.toString()).join(', ')}`);
            } catch (e) {
                console.log(`   ⚠️  getTokensOfOwner not available, trying tokenOfOwnerByIndex...`);
                // Try tokenOfOwnerByIndex
                const ADVENTURER_ABI_ENUMERABLE = [
                    ...ADVENTURER_ABI_FULL,
                    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
                ];
                const adventurerEnumerable = new ethers.Contract(ADVENTURER_CONTRACT_FIXED, ADVENTURER_ABI_ENUMERABLE, provider);
                const tokenIds: bigint[] = [];
                for (let i = 0n; i < balance; i++) {
                    try {
                        const tokenId = await adventurerEnumerable.tokenOfOwnerByIndex(tba, i);
                        tokenIds.push(tokenId);
                    } catch (e2) {
                        console.log(`   ⚠️  Failed to get token at index ${i}`);
                    }
                }
                if (tokenIds.length > 0) {
                    console.log(`   Token IDs: ${tokenIds.map((id: bigint) => id.toString()).join(', ')}`);
                }
            }
        } else {
            console.log(`⚠️  No heroes found for this TBA address`);
            console.log(`   This could mean:`);
            console.log(`   1. The hero wasn't minted to this TBA`);
            console.log(`   2. The hero was minted to a different address`);
            console.log(`   3. The transaction hasn't been confirmed yet`);
        }
    } catch (e: any) {
        console.log(`❌ Error checking hero balance:`, e?.message || e);
    }
}

main().catch(console.error);

