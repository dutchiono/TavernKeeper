import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config({ path: "../../.env" });

// Robinhood Chain: Arbitrum L2 on Ethereum, ETH as native gas.
// Mainnet 4663 / Testnet 46630. Default is TESTNET - mainnet must be opted into
// explicitly, unlike the Monad package where config files disagreed on the default.
const MAINNET_ID = 4663;
const TESTNET_ID = 46630;

const CHAIN_ID = parseInt(process.env.ROBINHOOD_CHAIN_ID || String(TESTNET_ID));
const IS_MAINNET = CHAIN_ID === MAINNET_ID;

function getRpcUrl(): string {
    // PRIORITY 1: Alchemy (Robinhood's recommended provider) if a key is present.
    const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
    if (alchemyApiKey) {
        return IS_MAINNET
            ? `https://robinhood-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
            : `https://robinhood-testnet.g.alchemy.com/v2/${alchemyApiKey}`;
    }

    // PRIORITY 2: Explicit override.
    if (process.env.ROBINHOOD_RPC_URL) return process.env.ROBINHOOD_RPC_URL;

    // PRIORITY 3: Public endpoint - rate limited, unsuitable for deploys.
    console.warn(
        "No ALCHEMY_API_KEY or ROBINHOOD_RPC_URL set. Falling back to the public endpoint, " +
        "which is rate limited and not recommended for deployment."
    );
    return IS_MAINNET
        ? "https://rpc.mainnet.chain.robinhood.com"
        : "https://rpc.testnet.chain.robinhood.com";
}

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: { enabled: true, runs: 200 },
            viaIR: true,
            evmVersion: "cancun",
        },
    },
    networks: {
        // Local only - no forking. The office has no external dependencies to fork.
        hardhat: { chainId: 31337 },
        localhost: {
            url: "http://127.0.0.1:8545",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
        robinhood: {
            url: getRpcUrl(),
            chainId: CHAIN_ID,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
    // Robinhood Chain uses Blockscout, which accepts any non-empty API key.
    etherscan: {
        apiKey: { robinhood: process.env.BLOCKSCOUT_API_KEY || "empty" },
        customChains: [
            {
                network: "robinhood",
                chainId: CHAIN_ID,
                urls: IS_MAINNET
                    ? {
                          apiURL: "https://robinhoodchain.blockscout.com/api",
                          browserURL: "https://robinhoodchain.blockscout.com",
                      }
                    : {
                          apiURL: "https://explorer.testnet.chain.robinhood.com/api",
                          browserURL: "https://explorer.testnet.chain.robinhood.com",
                      },
            },
        ],
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};

export default config;
