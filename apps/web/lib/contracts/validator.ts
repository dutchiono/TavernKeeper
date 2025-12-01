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

    if (implementationSlot && implementationSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      // Extract implementation address from storage slot
      const implAddress = getAddress(`0x${implementationSlot.slice(-40)}` as `0x${string}`);

      // Check for UUPS (has proxiableUUID)
      try {
        await publicClient.readContract({
          address,
          abi: PROXY_ABIS.UUPS,
          functionName: 'proxiableUUID',
        });
        return {
          isProxy: true,
          proxyType: 'UUPS',
          implementationAddress: implAddress,
        };
      } catch {
        // Not UUPS, check for Transparent
        try {
          const admin = await publicClient.readContract({
            address,
            abi: PROXY_ABIS.Transparent,
            functionName: 'admin',
          });
          return {
            isProxy: true,
            proxyType: 'Transparent',
            implementationAddress: implAddress,
            adminAddress: admin as Address,
          };
        } catch {
          // Could be Beacon or other proxy type
          return {
            isProxy: true,
            proxyType: 'Minimal',
            implementationAddress: implAddress,
          };
        }
      }
    }

    // Check for Beacon proxy
    const beaconSlot = await publicClient.getStorageAt({
      address,
      slot: PROXY_ABIS.EIP1967_BEACON as `0x${string}`,
    });

    if (beaconSlot && beaconSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const beaconAddress = getAddress(`0x${beaconSlot.slice(-40)}` as `0x${string}`);
      return {
        isProxy: true,
        proxyType: 'Beacon',
        implementationAddress: beaconAddress,
      };
    }

    return { isProxy: false };
  } catch (error) {
    console.warn(`Could not detect proxy for ${address}:`, error);
    return { isProxy: false };
  }
}

/**
 * Validate that a contract has the required functions
 */
export async function validateContractABI(
  address: Address,
  requiredFunctions: string[],
  chainId: number = monad.id,
  rpcUrl?: string
): Promise<{ isValid: boolean; missingFunctions: string[] }> {
  const url = rpcUrl || process.env.NEXT_PUBLIC_MONAD_RPC_URL;
  if (!url) {
    // Skip if RPC not configured
    return { isValid: true, missingFunctions: [] };
  }

  try {
    const publicClient = createPublicClient({
      chain: monad,
      transport: http(url),
    });

    // For now, we'll just check if contract has code
    // Full ABI validation would require the contract ABI and checking each function
    const code = await publicClient.getBytecode({ address });
    if (!code || code === '0x') {
      return {
        isValid: false,
        missingFunctions: requiredFunctions, // Can't validate if no code
      };
    }

    // TODO: Implement full ABI validation by trying to call each function
    // This would require the full ABI and proper error handling

    return { isValid: true, missingFunctions: [] };
  } catch (error) {
    console.warn(`Could not validate ABI for ${address}:`, error);
    return { isValid: false, missingFunctions: [] };
  }
}

/**
 * Validate a single contract configuration
 */
export async function validateContract(
  contractKey: string,
  config: ContractConfig,
  options: ContractValidationOptions = {}
): Promise<ValidationResult> {
  const result: ValidationResult = {
    contractKey,
    contractName: config.name,
    isValid: true,
    errors: [],
    warnings: [],
  };

  const address = getContractAddress(config);

  // 1. Check address is configured
  if (!address) {
    result.isValid = false;
    result.errors.push(`Contract address not configured`);
    return result;
  }

  // 2. Validate address format
  if (!isAddress(address)) {
    result.isValid = false;
    result.errors.push(`Invalid address format: ${address}`);
    return result;
  }

  // 3. Normalize address (checksum)
  const normalizedAddress = getAddress(address);
  if (address !== normalizedAddress) {
    result.warnings.push(`Address should be checksummed: ${address} → ${normalizedAddress}`);
  }

  // 4. Check for placeholder addresses
  const placeholders = ['0x...', '0x0000000000000000000000000000000000000000'];
  if (placeholders.some(p => address.toLowerCase() === p.toLowerCase())) {
    result.isValid = false;
    result.errors.push(`Address is a placeholder: ${address}`);
    return result;
  }

  // 5. Validate proxy if configured
  if (options.validateProxy !== false && config.proxyType && config.proxyType !== 'None') {
    if (!config.proxyAddress) {
      result.warnings.push(`Contract should use proxy pattern (${config.proxyType}) but proxyAddress not configured`);
    } else {
      const proxyInfo = await detectProxy(config.proxyAddress, config.chainId, options.rpcUrl);
      result.proxyInfo = proxyInfo;

      if (proxyInfo.isProxy) {
        // 'Minimal' in this validator means "Generic EIP-1967 Proxy" (fallback if UUPS/Transparent checks fail)
        // So we accept it if it matches, or if it's Minimal
        if (proxyInfo.proxyType !== config.proxyType && proxyInfo.proxyType !== 'Minimal') {
          result.warnings.push(
            `Expected proxy type ${config.proxyType} but detected ${proxyInfo.proxyType || 'unknown'}`
          );
        }

        if (config.implementationAddress && proxyInfo.implementationAddress) {
          const expectedImpl = getAddress(config.implementationAddress);
          const actualImpl = getAddress(proxyInfo.implementationAddress);
          if (expectedImpl.toLowerCase() !== actualImpl.toLowerCase()) {
            result.errors.push(
              `Implementation address mismatch: expected ${expectedImpl}, got ${actualImpl}`
            );
            result.isValid = false;
          }
        }
      } else {
        result.warnings.push(`Contract configured as proxy but proxy not detected on-chain`);
      }
    }
  }

  // 6. Validate on-chain existence
  if (options.validateOnChain !== false) {
    const url = options.rpcUrl || process.env.NEXT_PUBLIC_MONAD_RPC_URL;
    if (url) {
      try {
        const publicClient = createPublicClient({
          chain: monad,
          transport: http(url),
        });

        const code = await publicClient.getBytecode({ address });
        if (!code || code === '0x') {
          result.isValid = false;
          result.errors.push(`Contract has no code at address ${address}`);
        } else {
          result.onChainValidated = true;
        }
      } catch (error) {
        result.warnings.push(`Could not validate on-chain: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // 7. Validate ABI if configured
  if (options.validateABI !== false && config.requiredFunctions.length > 0) {
    const abiValidation = await validateContractABI(
      address,
      config.requiredFunctions,
      config.chainId,
      options.rpcUrl
    );

    if (!abiValidation.isValid) {
      result.warnings.push(`Could not validate ABI compatibility`);
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

  for (const [key, config] of Object.entries(CONTRACT_REGISTRY)) {
    const result = await validateContract(key, config, options);
    results.push(result);
  }

  return results;
}

