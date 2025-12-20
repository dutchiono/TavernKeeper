const fs = require('fs');
const path = require('path');

const mode = process.argv[2]; // 'local' or 'testnet'
const envPath = path.join(__dirname, '../.env.local');

const CONFIGS = {
    local: {
        NEXT_PUBLIC_MONAD_RPC_URL: 'http://127.0.0.1:8545',
        NEXT_PUBLIC_MONAD_CHAIN_ID: '31337',
        NEXT_PUBLIC_USE_LOCALHOST: 'true'
    },
    testnet: {
        NEXT_PUBLIC_MONAD_RPC_URL: 'https://testnet-rpc.monad.xyz',
        NEXT_PUBLIC_MONAD_CHAIN_ID: '10143',
        NEXT_PUBLIC_USE_LOCALHOST: 'false'
    },
    mainnet: {
        NEXT_PUBLIC_MONAD_RPC_URL: 'https://rpc.monad.xyz',
        NEXT_PUBLIC_MONAD_CHAIN_ID: '143',
        NEXT_PUBLIC_USE_LOCALHOST: 'false'
    }
};

if (!CONFIGS[mode]) {
    console.error(`Usage: node set-network.js [local|testnet]`);
    process.exit(1);
}

let content = '';
if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
}

// Helper to update or append a key
function updateKey(key, value) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content += `\n${key}=${value}`;
    }
}

const config = CONFIGS[mode];
Object.keys(config).forEach(key => {
    updateKey(key, config[key]);
});

fs.writeFileSync(envPath, content.trim() + '\n');
console.log(`✅ Switched to ${mode.toUpperCase()} network!`);
console.log(`Updated .env.local with:`);
console.log(JSON.stringify(config, null, 2));
