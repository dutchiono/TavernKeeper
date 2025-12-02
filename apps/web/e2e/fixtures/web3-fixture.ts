import { test as base, Page } from '@playwright/test';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, localhost } from 'viem/chains';

// Hardhat Default Accounts
// Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
export const PRIVATE_KEY_A = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
export const PRIVATE_KEY_B = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

// Define custom fixture type
type Web3Fixtures = {
    injectWallet: (privateKey: `0x${string}`) => Promise<void>;
};

export const test = base.extend<Web3Fixtures>({
    injectWallet: async ({ page }, use) => {
        // Define the injection function
        const injectWallet = async (privateKey: `0x${string}`) => {
            await page.addInitScript(({ pk }) => {
                // Simple EIP-1193 Provider Mock
                // This is a minimal implementation sufficient for most dApps using viem/wagmi
                class MockProvider {
                    isMetaMask = true;
                    chainId = '0x7a69'; // 31337 (Hardhat Localhost)
                    selectedAddress: string | null = null;

                    // We'll use a simple message passing to the node context for signing if needed,
                    // but for now let's try to mock the basic RPC requests directly or 
                    // use a library if we can bundle it. 
                    // actually, bundling viem into the browser context is hard.
                    // Better approach: Expose a binding function `window.signTransaction` that calls back to Node.js

                    // WAIT: A simpler approach for Playwright is to use `synpress` or just mock the window.ethereum 
                    // and forward requests to the real node via fetch, handling signing locally in the mock?
                    // No, signing needs the private key.

                    // Let's use a simpler approach: 
                    // We will mock `window.ethereum` and forward 'eth_requestAccounts' and 'eth_accounts'.
                    // For signing, we will throw or try to handle it if we can.
                    // Actually, for full E2E, we need real signing.

                    // Let's try to use a pre-made mock or just basic injection.
                    // Since we can't easily bundle viem into the init script without a bundler,
                    // we will assume the dApp uses `window.ethereum`.

                    // REVISED STRATEGY: 
                    // We will use a simplified mock that forwards everything to a local proxy 
                    // OR we just use the `page.exposeFunction` to handle signing in Node.js!

                    constructor() {
                        // @ts-ignore
                        this.selectedAddress = null; // Will be set after 'enable'
                    }

                    async request(args: { method: string, params?: any[] }) {
                        // Forward to Node.js handler
                        // @ts-ignore
                        return await window.handleEthereumRequest(args);
                    }

                    on() { }
                    removeListener() { }
                }

                // @ts-ignore
                window.ethereum = new MockProvider();
            }, { pk: privateKey });

            // Expose the handler in Node.js
            const account = privateKeyToAccount(privateKey);
            const client = createWalletClient({
                account,
                chain: localhost,
                transport: http('http://127.0.0.1:8545')
            });

            await page.exposeFunction('handleEthereumRequest', async (args: { method: string, params?: any[] }) => {
                const { method, params } = args;
                console.log(`[Web3] ${method}`, params);

                switch (method) {
                    case 'eth_requestAccounts':
                    case 'eth_accounts':
                        return [account.address];

                    case 'eth_chainId':
                        return '0x7a69'; // 31337

                    case 'net_version':
                        return '31337';

                    case 'eth_sendTransaction':
                        // Sign and send
                        // params[0] is the transaction object
                        return await client.sendTransaction(params![0] as any);

                    case 'personal_sign':
                        // params: [message, address]
                        return await client.signMessage({ message: { raw: params![0] } }); // Check format

                    default:
                        // Forward read-only requests to the node directly via client (or just fetch)
                        // But client.request is easier
                        return await client.request(args as any);
                }
            });
        };

        await use(injectWallet);
    },
});

export { expect } from '@playwright/test';
