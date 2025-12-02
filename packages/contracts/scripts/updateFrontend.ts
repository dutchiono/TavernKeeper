import fs from 'fs';
import path from 'path';

export function updateFrontendAddresses(addresses: {
    ERC6551_REGISTRY?: string;
    ERC6551_IMPLEMENTATION?: string;
    KEEP_TOKEN?: string;
    INVENTORY?: string;
    ADVENTURER?: string;
    TAVERNKEEPER?: string;
    THE_CELLAR?: string;
    TAVERNKEEPER_IMPL?: string;
    DUNGEON_GATEKEEPER?: string;
    CELLAR_ZAP?: string;
    POOL_MANAGER?: string;
    TAVERN_REGULARS_MANAGER?: string;
    TOWN_POSSE_MANAGER?: string;
}) {
    const addressesPath = path.join(__dirname, '../../../apps/web/lib/contracts/addresses.ts');

    if (!fs.existsSync(addressesPath)) {
        console.error(`Could not find addresses file at ${addressesPath}`);
        return;
    }

    let content = fs.readFileSync(addressesPath, 'utf8');

    // Helper to replace address in LOCALHOST_ADDRESSES section
    const replaceLocalhostAddr = (key: string, val: string | undefined) => {
        if (!val) return;
        // Match LOCALHOST_ADDRESSES section specifically
        const regex = new RegExp(`(LOCALHOST_ADDRESSES[\\s\\S]*?${key}:\\s*)'0x[a-fA-F0-9]{40}'`);
        content = content.replace(regex, `$1'${val}'`);
    };

    // Update LOCALHOST_ADDRESSES section
    replaceLocalhostAddr('ERC6551_REGISTRY', addresses.ERC6551_REGISTRY);
    replaceLocalhostAddr('ERC6551_IMPLEMENTATION', addresses.ERC6551_IMPLEMENTATION);
    replaceLocalhostAddr('KEEP_TOKEN', addresses.KEEP_TOKEN);
    replaceLocalhostAddr('INVENTORY', addresses.INVENTORY);
    replaceLocalhostAddr('ADVENTURER', addresses.ADVENTURER);
    replaceLocalhostAddr('TAVERNKEEPER', addresses.TAVERNKEEPER);
    replaceLocalhostAddr('THE_CELLAR', addresses.THE_CELLAR);
    replaceLocalhostAddr('DUNGEON_GATEKEEPER', addresses.DUNGEON_GATEKEEPER);
    replaceLocalhostAddr('CELLAR_ZAP', addresses.CELLAR_ZAP);
    replaceLocalhostAddr('POOL_MANAGER', addresses.POOL_MANAGER);
    replaceLocalhostAddr('TAVERN_REGULARS_MANAGER', addresses.TAVERN_REGULARS_MANAGER);
    replaceLocalhostAddr('TOWN_POSSE_MANAGER', addresses.TOWN_POSSE_MANAGER);

    // Special case for Fee Recipient if Cellar is updated
    if (addresses.THE_CELLAR) {
        const feeRecipientRegex = /(LOCALHOST_ADDRESSES[\s\S]*?FEE_RECIPIENT:\s*)'0x[a-fA-F0-9]{40}'/;
        content = content.replace(feeRecipientRegex, `$1'${addresses.THE_CELLAR}'`);
    }

    // Implementation addresses
    if (addresses.TAVERNKEEPER_IMPL) {
        content = content.replace(
            /(IMPLEMENTATION_ADDRESSES[\s\S]*?TAVERNKEEPER:\s*)'0x[a-fA-F0-9]{40}'/,
            `$1'${addresses.TAVERNKEEPER_IMPL}'`
        );
    }

    fs.writeFileSync(addressesPath, content);
    console.log(`Updated frontend addresses in ${addressesPath}`);
}
