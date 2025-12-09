import { createPublicClient, http, decodeEventLog } from 'viem';
import { parseUnits } from 'viem';
import * as dotenv from 'dotenv';
dotenv.config();

// Define monad chain config inline
const monad = {
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Monad',
        symbol: 'MON',
    },
    rpcUrls: {
        default: {
            http: ['https://testnet-rpc.monad.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'MonadScan',
            url: 'https://monadscan.com',
        },
    },
} as const;

// Adventurer contract address (testnet)
const ADVENTURER_ADDRESS = '0x4Fff2Ce5144989246186462337F0eE2C913F913E' as const;

const TX_HASH = '0x048b8e168bf813f3c16f487518831990a683b50304d667a6564d00f145b9d687';

async function main() {
    const rpcUrl = process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';

    const publicClient = createPublicClient({
        chain: monad,
        transport: http(rpcUrl),
    });

    console.log(`🔍 Checking transaction: ${TX_HASH}\n`);

    try {
        // Get transaction receipt
        const receipt = await publicClient.getTransactionReceipt({ hash: TX_HASH as `0x${string}` });

        console.log(`✅ Transaction Status: ${receipt.status}`);
        console.log(`   Block Number: ${receipt.blockNumber}`);
        console.log(`   From: ${receipt.from}`);
        console.log(`   To: ${receipt.to}`);
        console.log(`\n📋 Logs (${receipt.logs.length}):\n`);

        // Get Adventurer contract address
        const adventurerConfig = CONTRACT_REGISTRY.ADVENTURER;
        const adventurerAddress = getContractAddress(adventurerConfig);
        console.log(`   Adventurer Contract: ${ADVENTURER_ADDRESS}\n`);

        // Check for HeroClaimed event
        const heroClaimedAbi = {
            anonymous: false,
            inputs: [
                { indexed: true, name: 'tavernKeeperId', type: 'uint256' },
                { indexed: true, name: 'heroTokenId', type: 'uint256' },
                { indexed: true, name: 'tba', type: 'address' },
            ],
            name: 'HeroClaimed',
            type: 'event',
        };

        // Check for HeroMinted event
        const heroMintedAbi = {
            anonymous: false,
            inputs: [
                { indexed: true, name: 'to', type: 'address' },
                { indexed: true, name: 'tokenId', type: 'uint256' },
                { indexed: false, name: 'metadataUri', type: 'string' },
            ],
            name: 'HeroMinted',
            type: 'event',
        };

        let foundHeroClaimed = false;
        let foundHeroMinted = false;

        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === ADVENTURER_ADDRESS.toLowerCase()) {
                console.log(`   📝 Log from Adventurer contract:`);
                console.log(`      Address: ${log.address}`);
                console.log(`      Topics: ${log.topics.length}`);

                // Try to decode HeroClaimed
                try {
                    const decoded = decodeEventLog({
                        abi: [heroClaimedAbi],
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === 'HeroClaimed') {
                        foundHeroClaimed = true;
                        console.log(`\n   ✅ HERO CLAIMED EVENT FOUND!`);
                        console.log(`      TavernKeeper ID: ${decoded.args.tavernKeeperId}`);
                        console.log(`      Hero Token ID: ${decoded.args.heroTokenId}`);
                        console.log(`      TBA Address: ${decoded.args.tba}`);
                    }
                } catch (e) {
                    // Not HeroClaimed, try HeroMinted
                    try {
                        const decoded = decodeEventLog({
                            abi: [heroMintedAbi],
                            data: log.data,
                            topics: log.topics,
                        });
                        if (decoded.eventName === 'HeroMinted') {
                            foundHeroMinted = true;
                            console.log(`\n   ✅ HERO MINTED EVENT FOUND!`);
                            console.log(`      To: ${decoded.args.to}`);
                            console.log(`      Hero Token ID: ${decoded.args.tokenId}`);
                            console.log(`      Metadata URI: ${decoded.args.metadataUri}`);
                        }
                    } catch (e2) {
                        // Not a hero event
                    }
                }
            }
        }

        if (!foundHeroClaimed && !foundHeroMinted) {
            console.log(`\n   ⚠️  No HeroClaimed or HeroMinted events found in this transaction`);
            console.log(`   This might not be a hero mint transaction, or the contract address doesn't match`);
        }

        // Check what the transaction actually called
        const tx = await publicClient.getTransaction({ hash: TX_HASH as `0x${string}` });
        console.log(`\n📞 Transaction Call:`);
        console.log(`   To: ${tx.to}`);
        console.log(`   Function: ${tx.input.slice(0, 10)}`);

    } catch (error: any) {
        console.error(`❌ Error checking transaction:`, error);
    }
}

main().catch(console.error);

