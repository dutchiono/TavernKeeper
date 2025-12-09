import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3 = process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const KEEP_TOKEN = process.env.KEEP_TOKEN || "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

async function main() {
    console.log("🚀 DEPLOYING KEEP STAKING CONTRACT (ONLY)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    // Get TheCellarV3 to get KEEP token address
    const CELLAR_ABI = [
        'function keepToken() view returns (address)',
    ];
    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);

    let keepTokenAddress: string;

    try {
        keepTokenAddress = await cellar.keepToken();
        console.log(`✅ Connected to TheCellarV3: ${THE_CELLAR_V3}`);
        console.log(`   KeepToken: ${keepTokenAddress}\n`);
    } catch (error: any) {
        console.error(`❌ Failed to connect to TheCellarV3: ${error.message}`);
        console.log(`   Using environment variable instead...`);
        keepTokenAddress = KEEP_TOKEN;

        if (!keepTokenAddress || keepTokenAddress === "0x0000000000000000000000000000000000000000") {
            console.error(`❌ KEEP_TOKEN not set in .env`);
            process.exit(1);
        }
    }

    // Deploy KEEPStaking only
    console.log("📦 Deploying KEEPStaking contract...");
    const KEEPStakingFactory = await ethers.getContractFactory("KEEPStaking");
    const keepStaking = await KEEPStakingFactory.deploy(
        keepTokenAddress,
        keepTokenAddress,
        THE_CELLAR_V3
    );
    await keepStaking.waitForDeployment();
    const keepStakingAddress = await keepStaking.getAddress();
    console.log(`✅ KEEPStaking deployed: ${keepStakingAddress}`);

    // Set staking contract in TheCellarV3 (optional, for reference)
    // Note: We set LP_STAKING to zero address since we're only deploying KEEP
    console.log("\n🔗 Setting staking contracts in TheCellarV3...");
    try {
        const TheCellarV3Factory = await ethers.getContractFactory("TheCellarV3");
        const cellarContract = TheCellarV3Factory.attach(THE_CELLAR_V3);
        const tx = await cellarContract.setStakingContracts(
            ethers.ZeroAddress, // LP staking not deployed yet
            keepStakingAddress
        );
        await tx.wait();
        console.log(`✅ KEEP staking contract set in TheCellarV3`);
    } catch (error: any) {
        console.log(`⚠️  Could not set staking contract in TheCellarV3: ${error.message}`);
        console.log(`   This is optional - contract will work without it`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n📋 Contract Address:`);
    console.log(`   KEEPStaking:  ${keepStakingAddress}`);
    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Add this address to your .env file:`);
    console.log(`      KEEP_STAKING_CONTRACT=${keepStakingAddress}`);
    console.log(`   2. Update frontend contract registry with this address`);
    console.log(`   3. Test the contract: pnpm test-staking`);
    console.log(`   4. Configure auto-harvest script to use this address`);
    console.log(`   5. Set up auto-harvest to run on Render or as cron job`);
    console.log(`\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

