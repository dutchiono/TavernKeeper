/**
 * Loot Claiming Service
 * Handles claiming loot from completed dungeon runs
 */

import { type Address, type PublicClient, type WalletClient, parseUnits } from 'viem';
import { supabase } from '../supabase';
import { getAdventurerTBA } from '../inventory';
import { estimateMintGas } from './gasEstimator';
import { getTestnetWalletAddress } from '../wallet/testnetWallet';

export interface LootItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  tokenId: string; // ERC-1155 token ID
  amount: string; // Amount to mint (usually 1 for unique items)
  properties?: Record<string, unknown>;
}

export interface LootClaim {
  id: string;
  runId: string;
  adventurerId: string;
  adventurerContract: Address;
  adventurerTokenId: bigint;
  items: LootItem[];
  claimed: boolean;
  claimTxHash?: string;
}

/**
 * Get a single loot claim by ID
 */
export async function getLootClaim(claimId: string): Promise<LootClaim | null> {
  const { data, error } = await supabase
    .from('loot_claims')
    .select('*')
    .eq('id', claimId)
    .single();

  if (error || !data) {
    return null;
  }

  const claimData = data as any;

  return {
    id: claimData.id,
    runId: claimData.run_id,
    adventurerId: claimData.adventurer_id,
    adventurerContract: claimData.adventurer_contract as Address,
    adventurerTokenId: BigInt(claimData.adventurer_token_id),
    items: claimData.items as LootItem[],
    claimed: claimData.claimed,
    claimTxHash: claimData.claim_tx_hash || undefined,
  };
}

/**
 * Get unclaimed loot for a run
 */
export async function getUnclaimedLoot(runId: string): Promise<LootClaim[]> {
  const { data, error } = await (supabase
    .from('loot_claims')
    .select('*') as any)
    .eq('run_id', runId)
    .eq('claimed', false);

  if (error) {
    throw new Error(`Failed to fetch loot claims: ${error.message}`);
  }

  return (data || []).map((claim: any) => ({
    id: claim.id,
    runId: claim.run_id,
    adventurerId: claim.adventurer_id,
    adventurerContract: claim.adventurer_contract as Address,
    adventurerTokenId: BigInt(claim.adventurer_token_id),
    items: claim.items as LootItem[],
    claimed: claim.claimed,
    claimTxHash: claim.claim_tx_hash || undefined,
  }));
}

/**
 * Create loot claims for a completed run
 * Called when a run completes
 */
export async function createLootClaims(
  runId: string,
  adventurerLoot: Array<{
    adventurerId: string;
    adventurerContract: Address;
    adventurerTokenId: bigint;
    items: LootItem[];
  }>
): Promise<void> {
  const claims = adventurerLoot.map((loot) => ({
    run_id: runId,
    adventurer_id: loot.adventurerId,
    adventurer_contract: loot.adventurerContract,
    adventurer_token_id: loot.adventurerTokenId.toString(),
    items: loot.items,
    claimed: false,
  }));

  const { error } = await (supabase.from('loot_claims').insert(claims) as any);

  if (error) {
    throw new Error(`Failed to create loot claims: ${error.message}`);
  }
}

/**
 * Claim loot for an adventurer
 * Mints items to the Adventurer's TBA
 */
export async function claimLoot(
  claimId: string,
  publicClient: PublicClient,
  walletClient: WalletClient,
  chainId: number,
  inventoryContract: Address
): Promise<{ txHash: `0x${string}` }> {
  // Fetch the claim
  const { data: claim, error: fetchError } = await (supabase
    .from('loot_claims')
    .select('*') as any)
    .eq('id', claimId)
    .eq('claimed', false)
    .single();

  if (fetchError || !claim) {
    throw new Error('Loot claim not found or already claimed');
  }

  // Get the Adventurer's TBA
  const tbaAddress = await getAdventurerTBA(
    chainId,
    claim.adventurer_contract as Address,
    BigInt(claim.adventurer_token_id)
  );

  // Prepare mint data
  const items = claim.items as LootItem[];
  const itemIds = items.map((item) => BigInt(item.tokenId));
  const amounts = items.map((item) => BigInt(item.amount || '1'));

  // Get the account address
  const [account] = await walletClient.getAddresses();
  if (!account) {
    throw new Error('No wallet connected');
  }

  // Estimate gas
  const gasEstimate = await estimateMintGas(
    publicClient,
    account,
    inventoryContract,
    tbaAddress,
    itemIds,
    amounts
  );

  // Use claimLootWithFee function which handles both transfer and fee collection
  const hash = await walletClient.writeContract({
    account,
    chain: null,
    address: inventoryContract,
    abi: [
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
    ],
    functionName: 'claimLootWithFee',
    args: [account, tbaAddress, itemIds, amounts, '0x' as `0x${string}`],
    value: gasEstimate.protocolFee, // Protocol fee sent as value - Inventory contract forwards to fee recipient
    gas: gasEstimate.gasLimit + 30000n, // Add buffer for fee forwarding
    gasPrice: gasEstimate.gasPrice,
  });

  // Wait for transaction
  await publicClient.waitForTransactionReceipt({ hash });

  // Update claim in database
  const { error: updateError } = await supabase
    .from('loot_claims')
    .update({
      claimed: true,
      claim_tx_hash: hash,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (updateError) {
    console.error('Failed to update loot claim:', updateError);
    // Transaction succeeded but DB update failed - this is recoverable
  }

  return { txHash: hash };
}

/**
 * Get gas estimate for claiming loot
 */
export async function estimateClaimGas(
  claimId: string,
  publicClient: PublicClient,
  chainId: number,
  inventoryContract: Address
): Promise<import('./gasEstimator').GasEstimate> {
  // Fetch the claim
  const { data: claim, error } = await (supabase
    .from('loot_claims')
    .select('*') as any)
    .eq('id', claimId)
    .eq('claimed', false)
    .single();

  if (error || !claim) {
    throw new Error('Loot claim not found or already claimed');
  }

  // Get the Adventurer's TBA
  const tbaAddress = await getAdventurerTBA(
    chainId,
    claim.adventurer_contract as Address,
    BigInt(claim.adventurer_token_id)
  );

  // Prepare mint data
  const items = claim.items as LootItem[];
  const itemIds = items.map((item) => BigInt(item.tokenId));
  const amounts = items.map((item) => BigInt(item.amount || '1'));

  // For estimation, we need a from address - use a placeholder
  // In practice, this will be the user's wallet address
  const placeholderFrom = '0x0000000000000000000000000000000000000000' as Address;

  return estimateMintGas(
    publicClient,
    placeholderFrom,
    inventoryContract,
    tbaAddress,
    itemIds,
    amounts
  );
}

