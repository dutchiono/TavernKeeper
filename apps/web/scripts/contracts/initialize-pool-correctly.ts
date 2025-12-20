
import { createWalletClient, createPublicClient, http, parseEther, encodeAbiParameters, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad } from '../lib/chains';
import { CONTRACT_ADDRESSES } from '../lib/contracts/addresses';
import fs from 'fs';
import path from 'path';

// Load deployer key
const keyPath = path.join(__dirname, '../../../packages/contracts/wallets/testnet-keys.json');
const keys = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const deployerKey = keys.privateKeys[0] as `0x${string}`;

const CONFIG = {
    ...CONTRACT_ADDRESSES,
    FEE: 10000,
    TICK_SPACING: 200,
    THE_CELLAR: '0xe71CAf7162dd81a4A9C0c6BD25ED02C26F492DC0', // Explicitly use the one from addresses.ts
};

async function main() {
    console.log('🚀 Initializing Pool & Adding Liquidity...');

    const account = privateKeyToAccount(deployerKey);
    const client = createWalletClient({
        account,
        chain: monad,
        transport: http('https://rpc.monad.xyz'),
    });

    const publicClient = createPublicClient({
        chain: monad,
        transport: http('https://rpc.monad.xyz'),
    });

    console.log(`Deployer: ${account.address}`);
    console.log(`Hook: ${CONFIG.THE_CELLAR}`);

    // 1. Initialize Pool
    const poolKey = {
        currency0: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        currency1: CONFIG.KEEP_TOKEN as `0x${string}`,
        fee: CONFIG.FEE,
        tickSpacing: CONFIG.TICK_SPACING,
        hooks: CONFIG.THE_CELLAR as `0x${string}`,
    };

    console.log('Initializing Pool with Key:', poolKey);

    try {
        const { request } = await publicClient.simulateContract({
            address: CONFIG.THE_CELLAR as `0x${string}`,
            abi: [{
                name: 'initializePool',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [{
                    type: 'tuple',
                    name: 'key',
                    components: [
                        { type: 'address', name: 'currency0' },
                        { type: 'address', name: 'currency1' },
                        { type: 'uint24', name: 'fee' },
                        { type: 'int24', name: 'tickSpacing' },
                        { type: 'address', name: 'hooks' }
                    ]
                }],
                outputs: []
            }],
            functionName: 'initializePool',
            args: [poolKey],
            account
        });

        const hash = await client.writeContract(request);
        console.log(`✅ Initialize TX sent: ${hash}`);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log('✅ Pool Initialized!');
    } catch (e: any) {
        console.log(`⚠️  Initialization skipped/failed (might be already initialized?): ${e.message || e}`);
    }

    // 2. Add Liquidity
    console.log('\n💧 Adding Liquidity...');
    const amountMON = parseEther('0.1');
    const amountKEEP = parseEther('0.3'); // 1:3 ratio required

    // Approve KEEP
    console.log('Approving KEEP...');
    try {
        const { request: approveReq } = await publicClient.simulateContract({
            address: CONFIG.KEEP_TOKEN as `0x${string}`,
            abi: [{ name: 'approve', type: 'function', inputs: [{ type: 'address', name: 'spender' }, { type: 'uint256', name: 'amount' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' }],
            functionName: 'approve',
            args: [CONFIG.THE_CELLAR as `0x${string}`, amountKEEP],
            account
        });
        const approveHash = await client.writeContract(approveReq);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log('✅ KEEP Approved');
    } catch (e) {
        console.error('Approval failed:', e);
    }

    // Add Liquidity via CellarHook
    try {
        const { request: addLiqReq } = await publicClient.simulateContract({
            address: CONFIG.THE_CELLAR as `0x${string}`,
            abi: [{
                name: 'addLiquidity',
                type: 'function',
                stateMutability: 'payable',
                inputs: [
                    {
                        type: 'tuple',
                        name: 'key',
                        components: [
                            { type: 'address', name: 'currency0' },
                            { type: 'address', name: 'currency1' },
                            { type: 'uint24', name: 'fee' },
                            { type: 'int24', name: 'tickSpacing' },
                            { type: 'address', name: 'hooks' }
                        ]
                    },
                    { type: 'uint256', name: 'amountMON' },
                    { type: 'uint256', name: 'amountKEEP' },
                    { type: 'int24', name: 'tickLower' },
                    { type: 'int24', name: 'tickUpper' }
                ],
                outputs: []
            }],
            functionName: 'addLiquidity',
            args: [poolKey, amountMON, amountKEEP, 0, 0], // 0,0 for auto-range
            value: amountMON,
            account
        });

        const addHash = await client.writeContract(addLiqReq);
        console.log(`✅ Add Liquidity TX sent: ${addHash}`);
        await publicClient.waitForTransactionReceipt({ hash: addHash });
        console.log('✅ Liquidity Added Successfully!');

    } catch (e: any) {
        console.error(`❌ Add Liquidity Failed: ${e.message || e}`);
    }

    // 3. Verify State
    console.log('\n🔍 Final Verification...');
    // (Re-run check logic inline)
    // ... logic to check slot0 ...
}

main().catch(console.error);
