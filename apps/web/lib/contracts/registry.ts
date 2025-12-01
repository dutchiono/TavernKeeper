/**
 * Contract Registry & Versioning System
 *
 * Tracks contract addresses, implementations, versions, and ABIs
 * to ensure game code stays aligned with deployed contracts.
 */

import { type Address, isAddress, getAddress } from 'viem';
import { monad } from '../chains';

export interface ContractConfig {
  name: string;
  proxyAddress?: Address; // Proxy address (if using proxy pattern)
  implementationAddress?: Address; // Implementation address (for proxies)
  directAddress?: Address; // Direct contract address (if not using proxy)
  version: string; // Semantic version (e.g., "1.0.0")
  proxyType?: 'UUPS' | 'Transparent' | 'Beacon' | 'Minimal' | 'None';
  chainId: number;
  abi: readonly any[]; // Contract ABI
  requiredFunctions: string[]; // Function signatures that must exist
  deploymentBlock?: number;
  lastVerified?: Date;
}

export interface ProxyInfo {
  isProxy: boolean;
  proxyType?: 'UUPS' | 'Transparent' | 'Beacon' | 'Minimal';
  implementationAddress?: Address;
  adminAddress?: Address;
  version?: string;
}

// Contract registry - defines expected contracts and their configurations
export const CONTRACT_REGISTRY: Record<string, ContractConfig> = {
  ERC6551_REGISTRY: {
    name: 'ERC6551 Registry',
    directAddress: (process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS ||
      '0x000000006551c19487814612e58FE06813775758') as Address,
    version: '1.0.0',
    proxyType: 'None', // Registry is typically not upgradeable
    chainId: monad.id,
    abi: [
      {
        inputs: [
          { name: 'implementation', type: 'address' },
          { name: 'chainId', type: 'uint256' },
          { name: 'tokenContract', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'salt', type: 'uint256' },
        ],
        name: 'account',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          { name: 'implementation', type: 'address' },
          { name: 'salt', type: 'bytes32' },
          { name: 'chainId', type: 'uint256' },
          { name: 'tokenContract', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
        ],
        name: 'createAccount',
        outputs: [{ name: 'account', type: 'address' }],
        stateMutability: 'payable',
        type: 'function',
      },
    ],
    requiredFunctions: ['account', 'createAccount'],
  },
  ERC6551_IMPLEMENTATION: {
    name: 'ERC6551 Account Implementation',
    directAddress: (process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS ||
      '0x55266d75D1a14E4572138116aF39863Ed6596E7F') as Address,
    version: '1.0.0',
    proxyType: 'None', // Implementation itself is not a proxy
    chainId: monad.id,
    abi: [
      {
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'operation', type: 'uint8' },
        ],
        name: 'execute',
        outputs: [{ name: 'result', type: 'bytes' }],
        stateMutability: 'payable',
        type: 'function',
      },
      {
        inputs: [],
        name: 'token',
        outputs: [
          { name: 'chainId', type: 'uint256' },
          { name: 'tokenContract', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'owner',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    requiredFunctions: ['execute', 'token', 'owner'],
  },
  KEEP_TOKEN: {
    name: 'Keep Token (ERC-20)',
    proxyAddress: process.env.NEXT_PUBLIC_KEEP_TOKEN_ADDRESS as Address | undefined,
    implementationAddress: process.env.NEXT_PUBLIC_KEEP_TOKEN_IMPLEMENTATION_ADDRESS as Address | undefined,
    version: '1.0.0',
    proxyType: 'UUPS', // Should be upgradeable
    chainId: monad.id,
    abi: [
      {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        name: 'mint',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          { name: 'from', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        name: 'burn',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    requiredFunctions: ['totalSupply', 'balanceOf', 'mint', 'burn'],
  },
  INVENTORY: {
    name: 'Inventory (ERC-1155)',
    proxyAddress: process.env.NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS as Address | undefined,
    implementationAddress: process.env.NEXT_PUBLIC_INVENTORY_IMPLEMENTATION_ADDRESS as Address | undefined,
    version: '1.0.0',
    proxyType: 'UUPS', // Should be upgradeable
    chainId: monad.id,
    abi: [
      {
        inputs: [
          { name: 'account', type: 'address' },
          { name: 'id', type: 'uint256' },
        ],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'ids', type: 'uint256[]' },
          { name: 'amounts', type: 'uint256[]' },
          { name: 'data', type: 'bytes' },
        ],
        name: 'claimLootWithFee',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
      },
      {
        inputs: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'ids', type: 'uint256[]' },
          { name: 'amounts', type: 'uint256[]' },
          { name: 'data', type: 'bytes' },
        ],
        name: 'safeBatchTransferFrom',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          { name: 'account', type: 'address' },
          { name: 'id', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
        name: 'safeTransferFrom',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          { name: 'account', type: 'address' },
          { name: 'id', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
        name: 'mint',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
      },
      {
        inputs: [],
        name: 'feeRecipient',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    requiredFunctions: ['balanceOf', 'claimLootWithFee', 'safeBatchTransferFrom', 'mint', 'feeRecipient'],
  },
  ADVENTURER: {
    name: 'Adventurer (ERC-721)',
    proxyAddress: process.env.NEXT_PUBLIC_ADVENTURER_CONTRACT_ADDRESS as Address | undefined,
    implementationAddress: process.env.NEXT_PUBLIC_ADVENTURER_IMPLEMENTATION_ADDRESS as Address | undefined,
    version: '1.0.0',
    proxyType: 'UUPS', // Should be upgradeable
    chainId: monad.id,
    abi: [
      {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'ownerOf',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'uri', type: 'string' },
        ],
        name: 'safeMint',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    requiredFunctions: ['ownerOf', 'safeMint'],
  },
  TAVERNKEEPER: {
    name: 'TavernKeeper (ERC-721)',
    proxyAddress: process.env.NEXT_PUBLIC_TAVERNKEEPER_CONTRACT_ADDRESS as Address | undefined,
    implementationAddress: process.env.NEXT_PUBLIC_TAVERNKEEPER_IMPLEMENTATION_ADDRESS as Address | undefined,
    version: '1.0.0',
    proxyType: 'UUPS', // Should be upgradeable
    chainId: monad.id,
    abi: [
      {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'ownerOf',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'uri', type: 'string' },
        ],
        name: 'safeMint',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'claimTokens',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'calculatePendingTokens',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      // The Office Functions (V2)
      {
        inputs: [],
        name: 'getSlot0',
        outputs: [
          {
            components: [
              { name: 'locked', type: 'uint8' },
              { name: 'epochId', type: 'uint16' },
              { name: 'initPrice', type: 'uint192' },
              { name: 'startTime', type: 'uint40' },
              { name: 'dps', type: 'uint256' },
              { name: 'miner', type: 'address' },
              { name: 'uri', type: 'string' },
            ],
            internalType: 'struct TavernKeeper.Slot0',
            name: '',
            type: 'tuple',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'getPrice',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'getDps',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          { name: 'epochId', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'maxPrice', type: 'uint256' },
          { name: 'uri', type: 'string' },
        ],
        name: 'takeOffice',
        outputs: [{ name: 'price', type: 'uint256' }],
        stateMutability: 'payable',
        type: 'function',
      },
    ],
    requiredFunctions: ['ownerOf', 'safeMint', 'claimTokens', 'calculatePendingTokens', 'takeOffice', 'getSlot0'],
  },
};

/**
 * Get the fee recipient address (treasury wallet)
 */
export function getFeeRecipientAddress(): Address | null {
  // First check for explicit fee recipient
  if (process.env.NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS) {
    const address = process.env.NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS as Address;
    if (isAddress(address)) {
      return getAddress(address);
    }
  }

  // Fallback to testnet wallet if configured (for development)
  if (process.env.TESTNET_PRIVATE_KEY) {
    // Import dynamically to avoid circular dependency
    try {
      const { getTestnetWalletAddress } = require('../wallet/testnetWallet');
      return getTestnetWalletAddress();
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get the active contract address (proxy if exists, otherwise direct)
 */
export function getContractAddress(config: ContractConfig): Address | undefined {
  if (config.proxyAddress) {
    return config.proxyAddress;
  }
  return config.directAddress;
}

/**
 * Get all contract addresses that should be configured
 */
export function getRequiredContractAddresses(): Record<string, Address | undefined> {
  const addresses: Record<string, Address | undefined> = {};

  for (const [key, config] of Object.entries(CONTRACT_REGISTRY)) {
    addresses[key] = getContractAddress(config);
  }

  return addresses;
}

