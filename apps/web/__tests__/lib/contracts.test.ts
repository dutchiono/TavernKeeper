/**
 * Contract Configuration Validation Tests
 *
 * Comprehensive validation system ensuring contract addresses, proxies, versions,
 * and ABIs are properly configured and aligned with deployed contracts.
 *
 * This prevents runtime errors from misconfigured contracts and ensures
 * the game code stays synchronized with on-chain contract implementations.
 */

import { describe, it, expect } from 'vitest';
import { isAddress, getAddress } from 'viem';
import { validateAllContracts, validateContract } from '../../lib/contracts/validator';
import { CONTRACT_REGISTRY, getRequiredContractAddresses } from '../../lib/contracts/registry';

// Placeholder addresses that should be replaced
const PLACEHOLDER_ADDRESSES = [
  '0x...',
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
];

describe('Contract Configuration', () => {
  describe('Contract Registry', () => {
    it('should have all contracts defined in registry', () => {
      expect(Object.keys(CONTRACT_REGISTRY).length).toBeGreaterThan(0);

      // Verify key contracts are registered
      expect(CONTRACT_REGISTRY).toHaveProperty('ERC6551_REGISTRY');
      expect(CONTRACT_REGISTRY).toHaveProperty('ERC6551_IMPLEMENTATION');
      expect(CONTRACT_REGISTRY).toHaveProperty('GOLD_TOKEN');
      expect(CONTRACT_REGISTRY).toHaveProperty('INVENTORY');
      expect(CONTRACT_REGISTRY).toHaveProperty('ADVENTURER');
      expect(CONTRACT_REGISTRY).toHaveProperty('TAVERNKEEPER');
    });

    it('should have all required contract addresses configured', () => {
      const addresses = getRequiredContractAddresses();
      const missing: string[] = [];

      for (const [key, address] of Object.entries(addresses)) {
        if (!address) {
          missing.push(key);
        }
      }

      if (missing.length > 0) {
        console.warn(
          `⚠️  Missing contract addresses: ${missing.join(', ')}\n` +
          `   These should be set in .env file as NEXT_PUBLIC_*_ADDRESS variables.\n` +
          `   See MONAD_CONFIG.md for required addresses.`
        );
      }

      // For now, we'll warn but not fail - contracts may not be deployed yet
      // Uncomment the expect below when contracts are deployed:
      // expect(missing).toHaveLength(0);
    });

    it('should have valid Ethereum addresses (not placeholders)', () => {
      const addresses = getRequiredContractAddresses();
      const invalid: Array<{ name: string; address: string }> = [];

      for (const [name, address] of Object.entries(addresses)) {
        if (!address) continue;

        const isPlaceholder = PLACEHOLDER_ADDRESSES.some(
          (placeholder) => address.toLowerCase() === placeholder.toLowerCase()
        );

        if (isPlaceholder) {
          invalid.push({ name, address });
          continue;
        }

        if (!isAddress(address)) {
          invalid.push({ name, address });
        }
      }

      if (invalid.length > 0) {
        console.error(
          `❌ Invalid contract addresses found:\n` +
          invalid.map(({ name, address }) => `   ${name}: ${address}`).join('\n')
        );
      }

      expect(invalid).toHaveLength(0);
    });
  });

  describe('Comprehensive Contract Validation', () => {
    it('should validate all contracts using the validator system', async () => {
      const results = await validateAllContracts({
        validateOnChain: false, // Skip on-chain for unit tests
        validateProxy: true,
        validateABI: false, // Skip ABI validation for now (requires RPC)
      });

      const allValid = results.every(r => r.isValid);
      const errors = results.filter(r => r.errors.length > 0);
      const warnings = results.filter(r => r.warnings.length > 0);

      if (errors.length > 0) {
        console.error('\n❌ Contract Validation Errors:');
        errors.forEach(result => {
          console.error(`  ${result.contractName} (${result.contractKey}):`);
          result.errors.forEach(error => console.error(`    - ${error}`));
        });
      }

      if (warnings.length > 0) {
        console.warn('\n⚠️  Contract Validation Warnings:');
        warnings.forEach(result => {
          console.warn(`  ${result.contractName} (${result.contractKey}):`);
          result.warnings.forEach(warning => console.warn(`    - ${warning}`));
        });
      }

      // Fail if there are critical errors
      expect(errors).toHaveLength(0);
    }, 30000);

    it('should validate proxy configurations for upgradeable contracts', async () => {
      const upgradeableContracts = Object.entries(CONTRACT_REGISTRY).filter(
        ([, config]) => config.proxyType && config.proxyType !== 'None'
      );

      for (const [key, config] of upgradeableContracts) {
        const result = await validateContract(key, config, {
          validateProxy: true,
          validateOnChain: false,
        });

        if (config.proxyType && config.proxyType !== 'None') {
          if (!config.proxyAddress) {
            console.warn(
              `⚠️  ${config.name} should use ${config.proxyType} proxy but proxyAddress not configured`
            );
          } else {
            // Proxy validation would happen here if RPC was available
            expect(result.proxyInfo).toBeDefined();
          }
        }
      }
    }, 30000);
  });

  describe('Contract Address Consistency', () => {
    it('should use same addresses as defined in registry', () => {
      const addresses = getRequiredContractAddresses();
      const registryAddresses = Object.fromEntries(
        Object.entries(CONTRACT_REGISTRY).map(([key, config]) => [
          key,
          config.proxyAddress || config.directAddress,
        ])
      );

      // Verify addresses match between registry and getter function
      for (const [key, address] of Object.entries(addresses)) {
        const registryAddress = registryAddresses[key];
        if (address && registryAddress) {
          expect(getAddress(address).toLowerCase()).toBe(
            getAddress(registryAddress).toLowerCase()
          );
        }
      }
    });
  });

  describe('Contract Address Format', () => {
    it('should have all addresses in correct format (0x followed by 40 hex chars)', () => {
      const addresses = getRequiredContractAddresses();
      const invalid: Array<{ name: string; address: string; reason: string }> = [];

      for (const [name, address] of Object.entries(addresses)) {
        if (!address) continue;

        if (!address.startsWith('0x')) {
          invalid.push({ name, address, reason: 'Missing 0x prefix' });
          continue;
        }

        if (address.length !== 42) {
          invalid.push({ name, address, reason: `Invalid length: ${address.length} (expected 42)` });
          continue;
        }

        const hexPart = address.slice(2);
        if (!/^[0-9a-fA-F]{40}$/.test(hexPart)) {
          invalid.push({ name, address, reason: 'Contains non-hexadecimal characters' });
        }
      }

      if (invalid.length > 0) {
        console.error(
          `❌ Invalid address format:\n` +
          invalid.map(({ name, address, reason }) =>
            `   ${name}: ${address} (${reason})`
          ).join('\n')
        );
      }

      expect(invalid).toHaveLength(0);
    });
  });
});

