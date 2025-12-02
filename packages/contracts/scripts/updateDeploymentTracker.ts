import fs from 'fs';
import path from 'path';

export function updateDeploymentTracker(addresses: {
    POOL_MANAGER: string;
    KEEP_TOKEN: string;
    CELLAR_HOOK: string;
    TAVERNKEEPER: string;
    DUNGEON_GATEKEEPER: string;
    CELLAR_ZAP: string;
    CREATE2_FACTORY: string;
}) {
    const trackerPath = path.join(__dirname, '../DEPLOYMENT_TRACKER.md');

    if (!fs.existsSync(trackerPath)) {
        console.error(`Could not find DEPLOYMENT_TRACKER.md at ${trackerPath}`);
        return;
    }

    let content = fs.readFileSync(trackerPath, 'utf8');

    // Helper to replace address in markdown list
    const replaceAddr = (name: string, addr: string) => {
        const regex = new RegExp(`- \\*\\*${name}\\*\\*: \`0x[a-fA-F0-9]{40}\``, 'g');
        content = content.replace(regex, `- **${name}**: \`${addr}\``);

        // Also try to replace in the table if possible (more complex regex)
        // | Contract | Type | Address |
        // | KeepToken | Proxy | `0x...` |
        // This is harder to match reliably without strict formatting, so we focus on the list first.
    };

    replaceAddr('PoolManager', addresses.POOL_MANAGER);
    replaceAddr('KeepToken \\(Proxy\\)', addresses.KEEP_TOKEN);
    replaceAddr('CellarHook', addresses.CELLAR_HOOK);
    replaceAddr('TavernKeeper \\(Proxy\\)', addresses.TAVERNKEEPER);
    replaceAddr('DungeonGatekeeper \\(Proxy\\)', addresses.DUNGEON_GATEKEEPER);
    replaceAddr('CellarZapV4', addresses.CELLAR_ZAP);
    replaceAddr('Create2Factory', addresses.CREATE2_FACTORY);

    fs.writeFileSync(trackerPath, content);
    console.log(`Updated DEPLOYMENT_TRACKER.md at ${trackerPath}`);
}
