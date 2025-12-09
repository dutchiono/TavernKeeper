import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3 = process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const KEEP_TOKEN = process.env.KEEP_TOKEN || "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

async function main() {
    console.log("🚀 DEPLOYING STAKING CONTRACTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    // Get TheCellarV3 to get CellarToken address
    const CELLAR_ABI = [
        'function cellarToken() view returns (address)',
        'function keepToken() view returns (address)',
    ];
    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);

    let cellarTokenAddress: string;
    let keepTokenAddress: string;

    try {
        cellarTokenAddress = await cellar.cellarToken();
        keepTokenAddress = await cellar.keepToken();
        console.log(`✅ Connected to TheCellarV3: ${THE_CELLAR_V3}`);
        console.log(`   CellarToken (CLP): ${cellarTokenAddress}`);
        console.log(`   KeepToken: ${keepTokenAddress}\n`);
    } catch (error: any) {
        console.error(`❌ Failed to connect to TheCellarV3: ${error.message}`);
        console.log(`   Using environment variables instead...`);
        cellarTokenAddress = process.env.CELLAR_TOKEN || "";
        keepTokenAddress = KEEP_TOKEN;

        if (!cellarTokenAddress) {
            console.error(`❌ CELLAR_TOKEN not set in .env`);
            process.exit(1);
        }
    }

    // Deploy LPStaking
    console.log("📦 Deploying LPStaking contract...");
    const LPStakingFactory = await ethers.getContractFactory("LPStaking");
    const lpStaking = await LPStakingFactory.deploy(
        cellarTokenAddress,
        keepTokenAddress,
        THE_CELLAR_V3
    );
    await lpStaking.waitForDeployment();
    const lpStakingAddress = await lpStaking.getAddress();
    console.log(`✅ LPStaking deployed: ${lpStakingAddress}`);

    // Deploy KEEPStaking
    console.log("\n📦 Deploying KEEPStaking contract...");
    const KEEPStakingFactory = await ethers.getContractFactory("KEEPStaking");
    const keepStaking = await KEEPStakingFactory.deploy(
        keepTokenAddress,
        keepTokenAddress,
        THE_CELLAR_V3
    );
    await keepStaking.waitForDeployment();
    const keepStakingAddress = await keepStaking.getAddress();
    console.log(`✅ KEEPStaking deployed: ${keepStakingAddress}`);

    // Set staking contracts in TheCellarV3 (optional, for reference)
    console.log("\n🔗 Setting staking contracts in TheCellarV3...");
    try {
        const TheCellarV3Factory = await ethers.getContractFactory("TheCellarV3");
        const cellarContract = TheCellarV3Factory.attach(THE_CELLAR_V3);
        const tx = await cellarContract.setStakingContracts(lpStakingAddress, keepStakingAddress);
        await tx.wait();
        console.log(`✅ Staking contracts set in TheCellarV3`);
    } catch (error: any) {
        console.log(`⚠️  Could not set staking contracts in TheCellarV3: ${error.message}`);
        console.log(`   This is optional - contracts will work without it`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n📋 Contract Addresses:`);
    console.log(`   LPStaking:    ${lpStakingAddress}`);
    console.log(`   KEEPStaking:  ${keepStakingAddress}`);
    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Add these addresses to your .env file:`);
    console.log(`      LP_STAKING_CONTRACT=${lpStakingAddress}`);
    console.log(`      KEEP_STAKING_CONTRACT=${keepStakingAddress}`);
    console.log(`   2. Update frontend contract registry with these addresses`);
    console.log(`   3. Test the contracts with test scripts`);
    console.log(`   4. Configure auto-harvest script to use these addresses`);
    console.log(`\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

