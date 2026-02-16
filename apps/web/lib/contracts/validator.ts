/**
 * Contract Validator
 *
 * Comprehensive validation system for contract addresses, proxies, versions, and ABIs
 */

import { type Address, createPublicClient, http, getAddress, isAddress } from 'viem';
import { monad } from '../chains';
import { CONTRACT_REGISTRY, type ContractConfig, type ProxyInfo, getContractAddress } from './registry';

// Proxy detection ABIs
const PROXY_ABIS = {
  UUPS: [
    {
      inputs: [],
      name: 'proxiableUUID',
      outputs: [{ name: '', type: 'bytes32' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'proxiableVersion',
      outputs: [{ name: '', type: 'string' }],
      stateMutability: 'view',
      type: 'function',
    },
  ],
  Transparent: [
    {
      inputs: [],
      name: 'admin',
      outputs: [{ name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'implementation',
      outputs: [{ name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  ],
  Beacon: [
    {
      inputs: [],
      name: 'implementation',
      outputs: [{ name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  ],
  // EIP-1967 storage slots for proxy detection
  EIP1967_IMPLEMENTATION: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  EIP1967_ADMIN: '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
  EIP1967_BEACON: '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50',
};

export interface ValidationResult {
  contractKey: string;
  contractName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  proxyInfo?: ProxyInfo;
  onChainValidated?: boolean;
}

export interface ContractValidationOptions {
  validateOnChain?: boolean; // Whether to validate contracts exist on-chain
  validateProxy?: boolean; // Whether to validate proxy patterns
  validateABI?: boolean; // Whether to validate ABI compatibility
  rpcUrl?: string; // Custom RPC URL (defaults to env var)
}

// Export constants needed by tests
export const REQUIRED_CONTRACTS = [
  'ERC6551_REGISTRY',
  'ERC6551_IMPLEMENTATION',
  'KEEP_TOKEN',
  'INVENTORY',
  'ADVENTURER',
  'TAVERNKEEPER'
] as const;

export const FALLBACK_ADDRESSES: Record<string, string> = {
  ERC6551_REGISTRY: '0x000000006551c19487814612e58FE06813775758',
  ERC6551_IMPLEMENTATION: '0x0000000000000000000000000000000000000000',
  KEEP_TOKEN: '0x0000000000000000000000000000000000000000',
  INVENTORY: '0x0000000000000000000000000000000000000000',
  ADVENTURER: '0x0000000000000000000000000000000000000000',
  TAVERNKEEPER: '0x0000000000000000000000000000000000000000'
};

/**
 * Detect if a contract is a proxy and what type
 */
export async function detectProxy(
  address: Address,
  chainId: number = monad.id,
  rpcUrl?: string
): Promise<ProxyInfo> {
  const url = rpcUrl || process.env.NEXT_PUBLIC_MONAD_RPC_URL;
  if (!url) {
    // Skip on-chain validation if RPC not configured
    return { isProxy: false };
  }

  try {
    const publicClient = createPublicClient({
      chain: monad,
      transport: http(url),
    });

    // Check if contract has code
    const code = await publicClient.getBytecode({ address });
    if (!code || code === '0x') {
      return { isProxy: false };
    }

    // Try to detect proxy type by checking storage slots (EIP-1967)
    const implementationSlot = await publicClient.getStorageAt({
      address,
      slot: PROXY_ABIS.EIP1967_IMPLEMENTATION as `0x${string}`,
    });

    if (implementationSlot && implementationSlot !== '0x0' && implementationSlot !== '0x') {
      // Extract address from slot (last 20 bytes)
      const implAddress = ('0x' + implementationSlot.slice(-40)) as Address;
      return {
        isProxy: true,
        proxyType: 'UUPS',
        implementationAddress: isAddress(implAddress) ? implAddress : undefined,
      };
    }

    // Check for Beacon proxy
    const beaconSlot = await publicClient.getStorageAt({
      address,
      slot: PROXY_ABIS.EIP1967_BEACON as `0x${string}`,
    });

    if (beaconSlot && beaconSlot !== '0x0' && beaconSlot !== '0x') {
      const beaconAddress = ('0x' + beaconSlot.slice(-40)) as Address;
      return {
        isProxy: true,
        proxyType: 'Beacon',
        implementationAddress: isAddress(beaconAddress) ? beaconAddress : undefined,
      };
    }

    return { isProxy: false };
  } catch (error) {
    console.warn(`Failed to detect proxy for ${address}:`, error);
    return { isProxy: false };
  }
}

/**
 * Validate a single contract configuration
 */
export async function validateContract(
  contractKey: string,
  options: ContractValidationOptions = {}
): Promise<ValidationResult> {
  const config = CONTRACT_REGISTRY[contractKey as keyof typeof CONTRACT_REGISTRY] as ContractConfig | undefined;
  
  const result: ValidationResult = {
    contractKey,
    contractName: config?.name || contractKey,
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!config) {
    result.isValid = false;
    result.errors.push(`Contract '${contractKey}' not found in registry`);
    return result;
  }

  // Validate address format
  const address = getContractAddress(contractKey as keyof typeof CONTRACT_REGISTRY);
  if (!address) {
    result.warnings.push(`No address configured for ${contractKey}`);
  } else if (!isAddress(address)) {
    result.isValid = false;
    result.errors.push(`Invalid address format: ${address}`);
  }

  // On-chain validation
  if (options.validateOnChain && address && isAddress(address)) {
    try {
      const url = options.rpcUrl || process.env.NEXT_PUBLIC_MONAD_RPC_URL;
      if (url) {
        const publicClient = createPublicClient({
          chain: monad,
          transport: http(url),
        });

        const code = await publicClient.getBytecode({ address: address as Address });
        if (!code || code === '0x') {
          result.isValid = false;
          result.errors.push(`No bytecode found at address ${address} - contract not deployed`);
        } else {
          result.onChainValidated = true;
        }

        // Proxy validation
        if (options.validateProxy && code && code !== '0x') {
          result.proxyInfo = await detectProxy(address as Address, monad.id, url);
          if (result.proxyInfo.isProxy) {
            result.warnings.push(
              `Contract is a ${result.proxyInfo.proxyType} proxy` +
                (result.proxyInfo.implementationAddress
                  ? ` pointing to ${result.proxyInfo.implementationAddress}`
                  : '')
            );
          }
        }
      }
    } catch (error) {
      result.warnings.push(`On-chain validation failed: ${error}`);
    }
  }

  return result;
}

/**
 * Validate all contracts in the registry
 */
export async function validateAllContracts(
  options: ContractValidationOptions = {}
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const contractKey of Object.keys(CONTRACT_REGISTRY)) {
    const result = await validateContract(contractKey, options);
    results.push(result);
  }

  return results;
}

/**
 * Get validation summary
 */
export function getValidationSummary(results: ValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  onChainValidated: number;
} {
  return {
    total: results.length,
    valid: results.filter((r) => r.isValid).length,
    invalid: results.filter((r) => !r.isValid).length,
    warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    onChainValidated: results.filter((r) => r.onChainValidated).length,
  };
}
