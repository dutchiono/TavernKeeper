/**
 * Inventory Service for ERC-6551 Token Bound Accounts
 *
 * Architecture:
 * - TavernKeeper NFT → TBA (main account)
 * - Adventurer NFT → TBA → Inventory Items
 */

import { type Address, createPublicClient, http, getAddress } from 'viem';
import { monad } from './chains';
import type { Item } from '@innkeeper/lib';

// ERC-6551 Registry address for Monad
// TODO: Update with actual deployed registry address on Monad
const ERC6551_REGISTRY_ADDRESS = {
  [monad.id]: (process.env.NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS || '0x000000006551c19487814612e58FE06813775758') as Address,
} as const;

// ERC-6551 Account Implementation for Monad
// TODO: Update with actual deployed implementation address on Monad
const ERC6551_ACCOUNT_IMPLEMENTATION = {
  [monad.id]: (process.env.NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS || '0x55266d75D1a14E4572138116aF39863Ed6596E7F') as Address,
} as const;

// ERC-6551 Account Proxy for Monad
// TODO: Update with actual deployed proxy address on Monad
const ERC6551_ACCOUNT_PROXY = {
  [monad.id]: (process.env.NEXT_PUBLIC_ERC6551_PROXY_ADDRESS || '0x55266d75D1a14E4572138116aF39863Ed6596E7F') as Address,
} as const;

// ERC-6551 Registry ABI (simplified - just the account function)
// CORRECT ORDER: implementation, salt (bytes32), chainId, tokenContract, tokenId
const ERC6551_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'implementation', type: 'address' },
      { name: 'salt', type: 'bytes32' },
      { name: 'chainId', type: 'uint256' },
      { name: 'tokenContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'account',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC-721 ABI (for checking NFT ownership)
const ERC721_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC-1155 ABI (for inventory items)
const ERC1155_ABI = [
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
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOfBatch',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get the TBA address for an NFT using ERC-6551
 */
export async function getTBAAddress(
  chainId: number,
  tokenContract: Address,
  tokenId: bigint,
  salt: bigint = 0n
): Promise<Address> {
  const publicClient = createPublicClient({
    chain: monad,
    transport: http(),
  });

  const registryAddress = ERC6551_REGISTRY_ADDRESS[monad.id];
  const implementation = ERC6551_ACCOUNT_IMPLEMENTATION[monad.id];

  if (!registryAddress || !implementation) {
    throw new Error(`ERC-6551 not configured for Monad chain`);
  }

  // Convert salt to bytes32 - CORRECT ORDER: implementation, salt (bytes32), chainId, tokenContract, tokenId
  const saltBytes32 = typeof salt === 'bigint'
    ? ('0x' + salt.toString(16).padStart(64, '0')) as `0x${string}`
    : (salt === 0n ? '0x' + '0'.repeat(64) : salt) as `0x${string}`;

  const tbaAddress = await publicClient.readContract({
    address: registryAddress,
    abi: ERC6551_REGISTRY_ABI,
    functionName: 'account',
    args: [implementation, saltBytes32, BigInt(chainId), tokenContract, tokenId],
  });

  return getAddress(tbaAddress);
}

/**
 * Get the TavernKeeper NFT's TBA address (main account)
 */
export async function getTavernKeeperTBA(
  chainId: number,
  tavernKeeperContract: Address,
  tavernKeeperTokenId: bigint
): Promise<Address> {
  return getTBAAddress(chainId, tavernKeeperContract, tavernKeeperTokenId);
}

/**
 * Get an Adventurer NFT's TBA address
 */
export async function getAdventurerTBA(
  chainId: number,
  adventurerContract: Address,
  adventurerTokenId: bigint
): Promise<Address> {
  return getTBAAddress(chainId, adventurerContract, adventurerTokenId);
}

/**
 * Fetch ERC-1155 items from a TBA address
 * This assumes inventory items are ERC-1155 tokens
 */
export async function fetchInventoryFromTBA(
  chainId: number,
  tbaAddress: Address,
  inventoryContract: Address,
  itemIds: bigint[]
): Promise<Item[]> {
  const publicClient = createPublicClient({
    chain: monad,
    transport: http(),
  });

  // Check balances for each item
  const balances = await Promise.all(
    itemIds.map((itemId) =>
      publicClient.readContract({
        address: inventoryContract,
        abi: ERC1155_ABI,
        functionName: 'balanceOf',
        args: [tbaAddress, itemId],
      })
    )
  );

  // Map to inventory items (only include items with balance > 0)
  const items: Item[] = [];
  for (let i = 0; i < itemIds.length; i++) {
    if (balances[i] > 0n) {
      // TODO: Fetch item metadata from contract or IPFS
      // For now, create a basic item structure
      items.push({
        id: `item-${itemIds[i].toString()}`,
        name: `Item #${itemIds[i].toString()}`,
        type: 'misc', // TODO: Determine type from metadata
        properties: {
          tokenId: itemIds[i].toString(),
          balance: balances[i].toString(),
          contract: inventoryContract,
        },
      });
    }
  }

  return items;
}

/**
 * Sync on-chain inventory to game engine state
 * This fetches items from an Adventurer's TBA and returns them in the engine's Item format
 */
export async function syncAdventurerInventory(
  chainId: number,
  adventurerContract: Address,
  adventurerTokenId: bigint,
  inventoryContract: Address,
  itemIds: bigint[]
): Promise<Item[]> {
  // Get the Adventurer's TBA
  const tbaAddress = await getAdventurerTBA(chainId, adventurerContract, adventurerTokenId);

  // Fetch items from the TBA
  return fetchInventoryFromTBA(chainId, tbaAddress, inventoryContract, itemIds);
}

/**
 * Mock function for testing - returns empty inventory
 * Use this while contracts are being developed
 */
export function mockAdventurerInventory(adventurerId: string): Item[] {
  // Return empty inventory for now
  // TODO: Replace with actual on-chain data once contracts are deployed
  return [];
}

