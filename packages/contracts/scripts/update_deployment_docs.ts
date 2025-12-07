import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Update FIRSTDEPLOYMENT.md with new upgrade information
 *
 * Usage (using hardhat):
 *   npx hardhat run scripts/update_deployment_docs.ts -- <contractName> <oldImpl> <newImpl> <reason>
 *
 * Or with environment variables:
 *   CONTRACT_NAME=TavernKeeper OLD_IMPL=0x... NEW_IMPL=0x... REASON="Added updateTokenURI" npx hardhat run scripts/update_deployment_docs.ts
 *
 * Example:
 *   CONTRACT_NAME=TavernKeeper OLD_IMPL=0x48D8aeB5AD8175c701910A9Cf0aB25a9AeB048C6 NEW_IMPL=0x[NEW] REASON="Added updateTokenURI function" npx hardhat run scripts/update_deployment_docs.ts
 */

// Resolve path relative to scripts directory
// When running via hardhat, __dirname points to the compiled JS location
// So we need to resolve from the project root
const projectRoot = join(__dirname, '../..');
const FIRSTDEPLOYMENT_PATH = join(projectRoot, 'FIRSTDEPLOYMENT.md');

interface UpgradeInfo {
    contractName: string;
    oldImpl: string;
    newImpl: string;
    reason: string;
    proxyAddress: string;
}

const CONTRACT_PROXIES: Record<string, string> = {
    TavernKeeper: "0x56B81A60Ae343342685911bd97D1331fF4fa2d29",
    Adventurer: "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935",
    CellarHook: "0x6c7612F44B71E5E6E2bA0FEa799A23786A537755",
    "The Cellar": "0x6c7612F44B71E5E6E2bA0FEa799A23786A537755",
    CellarZapV4: "0xf7248a01051bf297Aa56F12a05e7209C60Fc5863",
    "CellarZap": "0xf7248a01051bf297Aa56F12a05e7209C60Fc5863",
    DungeonGatekeeper: "0xf454A4A4f2F960a5d5b7583A289dCAE765d57355",
};

function updateFirstDeployment(upgrade: UpgradeInfo) {
    const content = readFileSync(FIRSTDEPLOYMENT_PATH, 'utf-8');
    const lines = content.split('\n');

    // Find the Upgrade History section
    let upgradeHistoryStart = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('## Upgrade History (Mainnet)')) {
            upgradeHistoryStart = i;
            break;
        }
    }

    if (upgradeHistoryStart === -1) {
        throw new Error('Could not find Upgrade History section in FIRSTDEPLOYMENT.md');
    }

    // Find where to insert (after the last upgrade entry, before any other sections)
    let insertIndex = upgradeHistoryStart + 1;
    for (let i = upgradeHistoryStart + 1; i < lines.length; i++) {
        if (lines[i].startsWith('### ') && lines[i].includes(':')) {
            // Found an upgrade entry, continue
            insertIndex = i + 1;
        } else if (lines[i].startsWith('##') && !lines[i].includes('Upgrade History')) {
            // Found a different section, stop here
            break;
        }
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Create upgrade entry
    const upgradeEntry = [
        `### ${today}: ${upgrade.reason}`,
        `- **Reason**: ${upgrade.reason}`,
        `- **Contracts Upgraded**:`,
        `  - **${upgrade.contractName}**:`,
        `    - Proxy: \`${upgrade.proxyAddress}\``,
        `    - Old Impl: \`${upgrade.oldImpl}\``,
        `    - New Impl: \`${upgrade.newImpl}\``,
        `- **Status**: ✅ Success`,
        `- **Notes**: Frontend addresses unchanged (proxy address stays the same)`,
        '',
    ];

    // Insert the upgrade entry
    lines.splice(insertIndex, 0, ...upgradeEntry);

    // Write back to file
    writeFileSync(FIRSTDEPLOYMENT_PATH, lines.join('\n'), 'utf-8');

    console.log('✅ Updated FIRSTDEPLOYMENT.md with upgrade information');
    console.log(`   Added entry for ${upgrade.contractName} upgrade`);
    console.log(`   Old Impl: ${upgrade.oldImpl}`);
    console.log(`   New Impl: ${upgrade.newImpl}`);
}

async function main() {
    console.log('Script starting...');
    console.log('Environment variables:', {
        CONTRACT_NAME: process.env.CONTRACT_NAME,
        OLD_IMPL: process.env.OLD_IMPL,
        NEW_IMPL: process.env.NEW_IMPL,
        REASON: process.env.REASON,
    });

    // Support both command line args and environment variables
    let contractName: string;
    let oldImpl: string;
    let newImpl: string;
    let reason: string;

    if (process.env.CONTRACT_NAME && process.env.OLD_IMPL && process.env.NEW_IMPL && process.env.REASON) {
        // Use environment variables
        contractName = process.env.CONTRACT_NAME;
        oldImpl = process.env.OLD_IMPL;
        newImpl = process.env.NEW_IMPL;
        reason = process.env.REASON;
        console.log('Using environment variables');
    } else {
        // Use command line args (skip '--' if present from hardhat)
        const args = process.argv.slice(2).filter(arg => arg !== '--');

        if (args.length < 4) {
            console.error('Usage: npx hardhat run scripts/update_deployment_docs.ts -- <contractName> <oldImpl> <newImpl> <reason>');
            console.error('');
            console.error('Or use environment variables:');
            console.error('  CONTRACT_NAME=TavernKeeper OLD_IMPL=0x... NEW_IMPL=0x... REASON="..." npx hardhat run scripts/update_deployment_docs.ts');
            console.error('');
            console.error('Example:');
            console.error('  CONTRACT_NAME=TavernKeeper OLD_IMPL=0x48D8aeB5AD8175c701910A9Cf0aB25a9AeB048C6 NEW_IMPL=0x[NEW] REASON="Added updateTokenURI function" npx hardhat run scripts/update_deployment_docs.ts');
            process.exit(1);
        }

        contractName = args[0];
        oldImpl = args[1];
        newImpl = args[2];
        reason = args.slice(3).join(' ');
    }

    const proxyAddress = CONTRACT_PROXIES[contractName];
    if (!proxyAddress) {
        console.error(`Error: Unknown contract name "${contractName}"`);
        console.error(`Known contracts: ${Object.keys(CONTRACT_PROXIES).join(', ')}`);
        process.exit(1);
    }

    const upgrade: UpgradeInfo = {
        contractName,
        oldImpl,
        newImpl,
        reason,
        proxyAddress,
    };

    try {
        updateFirstDeployment(upgrade);
        console.log('\n✅ Documentation updated successfully!');
        console.log('\nNext steps:');
        console.log('1. Review the changes in FIRSTDEPLOYMENT.md');
        console.log('2. Update apps/web/lib/contracts/addresses.ts IMPLEMENTATION_ADDRESSES if needed');
        console.log('3. Verify the upgrade worked: npx hardhat run scripts/verify_deployed_state.ts --network monad');
    } catch (error: any) {
        console.error('Error updating documentation:', error.message);
        process.exit(1);
    }
}

main();
