import { ethers, upgrades } from "hardhat";
import { updateFrontendAddresses } from "./updateFrontend";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=== UPGRADING V4 CONTRACTS ===");

    // Parse args
    const args = process.argv.slice(2);
    const contractArgIndex = args.indexOf("--contract");
    if (contractArgIndex === -1) {
        console.error("Usage: npx hardhat run scripts/upgrade_v4_contracts.ts --contract <ContractName>");
        console.error("Available: CellarHook, DungeonGatekeeper, KeepToken, CellarZapV4");
        return;
    }
    const contractName = args[contractArgIndex + 1];

    // Load Info
    const infoPath = path.join(__dirname, "../deployment-info-v4.json");
    if (!fs.existsSync(infoPath)) {
        console.error("Error: deployment-info-v4.json not found.");
        return;
    }
    const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));

    if (contractName === "DungeonGatekeeper") {
        console.log("Upgrading DungeonGatekeeper (Proxy)...");
        const DungeonGatekeeper = await ethers.getContractFactory("DungeonGatekeeper");
        const gatekeeper = await upgrades.upgradeProxy(info.contracts.dungeonGatekeeper, DungeonGatekeeper);
        await gatekeeper.waitForDeployment();
        const address = await gatekeeper.getAddress();
        console.log("Upgraded DungeonGatekeeper:", address);
        // Address shouldn't change for proxy, but good to log.
    }
    else if (contractName === "KeepToken") {
        console.log("Upgrading KeepToken (Proxy)...");
        const KeepToken = await ethers.getContractFactory("KeepToken");
        const keepToken = await upgrades.upgradeProxy(info.contracts.keepToken, KeepToken);
        await keepToken.waitForDeployment();
        const address = await keepToken.getAddress();
        console.log("Upgraded KeepToken:", address);
    }
    else if (contractName === "CellarZapV4") {
        console.log("Redeploying CellarZapV4...");
        // Not a proxy, so redeploy.
        const CellarZapV4 = await ethers.getContractFactory("CellarZapV4");
        const zap = await CellarZapV4.deploy(
            info.contracts.poolManager,
            info.contracts.cellarHook,
            "0x0000000000000000000000000000000000000000",
            info.contracts.keepToken
        );
        await zap.waitForDeployment();
        const address = await zap.getAddress();
        console.log("New CellarZapV4:", address);

        info.contracts.cellarZap = address;
        updateFrontendAddresses({ CELLAR_ZAP: address });
    }
    else if (contractName === "CellarHook") {
        console.log("Redeploying CellarHook...");
        // Need to re-mine salt or just deploy new one.
        const PoolManager = info.contracts.poolManager;
        const KeepToken = info.contracts.keepToken;
        const Factory = info.contracts.create2Factory;

        if (!PoolManager || !KeepToken || !Factory) {
            console.error("Missing dependencies in deployment-info-v4.json");
            return;
        }

        const CellarHook = await ethers.getContractFactory("CellarHook");
        const initPrice = ethers.parseEther("100");
        const epochPeriod = 3600;
        const priceMultiplier = ethers.parseEther("1.1");
        const minInitPrice = ethers.parseEther("1");

        const constructorArgs = [
            PoolManager,
            "0x0000000000000000000000000000000000000000",
            KeepToken,
            initPrice,
            epochPeriod,
            priceMultiplier,
            minInitPrice
        ];

        const creationCode = CellarHook.bytecode;
        const encodedArgs = CellarHook.interface.encodeDeploy(constructorArgs);
        const initCode = creationCode + encodedArgs.slice(2);
        const initCodeHash = ethers.keccak256(initCode);

        const targetFlags = 0xAC0;
        let salt = 0n;
        let hookAddress = "";

        console.log("Mining salt...");
        while (true) {
            const saltHex = ethers.toBeHex(salt, 32);
            const computed = ethers.getCreate2Address(Factory, saltHex, initCodeHash);
            const addrInt = BigInt(computed);
            if ((addrInt & BigInt(targetFlags)) === BigInt(targetFlags)) {
                hookAddress = computed;
                console.log(`Found salt: ${saltHex}`);
                break;
            }
            salt++;
            if (salt % 100000n === 0n) console.log(`Checked ${salt} salts...`);
        }

        const Create2Factory = await ethers.getContractAt("Create2Factory", Factory);
        const tx = await Create2Factory.deploy(salt, initCode);
        await tx.wait();
        console.log("New CellarHook:", hookAddress);

        info.contracts.cellarHook = hookAddress;
        updateFrontendAddresses({ THE_CELLAR: hookAddress });
    }
    else {
        console.error("Unknown contract:", contractName);
        return;
    }

    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
    console.log("Upgrade Complete!");
    console.log("Please update DEPLOYMENT_TRACKER.md if any addresses changed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
