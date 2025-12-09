import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_PROXY = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";

async function main() {
    console.log("🗑️  ORPHANING OLD POOL (Removing All Liquidity)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Check current pool state
    const poolABI = [
        "function liquidity() external view returns (uint128)"
    ];
    const pool = new ethers.Contract(V3_POOL, poolABI, deployer);
    const poolLiquidity = await pool.liquidity();
    console.log(`📊 Current Pool Liquidity: ${poolLiquidity.toString()}\n`);

    if (poolLiquidity === 0n) {
        console.log("✅ Pool already has no liquidity - it's already orphaned!");
        return;
    }

    // Get TheCellarV3's tokenId
    const cellarABI = [
        "function tokenId() external view returns (uint256)"
    ];
    const cellar = new ethers.Contract(THE_CELLAR_PROXY, cellarABI, deployer);
    const tokenId = await cellar.tokenId();
    console.log(`📌 TheCellarV3 Position Token ID: ${tokenId.toString()}\n`);

    if (tokenId === 0n) {
        console.log("⚠️  TheCellarV3 has no position - liquidity might be owned elsewhere");
        return;
    }

    // Check position details
    const positionManagerABI = [
        "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
    ];
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, positionManagerABI, deployer);
    const position = await positionManager.positions(tokenId);

    console.log(`📋 Position Details:`);
    console.log(`   Liquidity: ${position.liquidity.toString()}`);
    console.log(`   Token0: ${position.token0}`);
    console.log(`   Token1: ${position.token1}\n`);

    // Upgrade TheCellarV3 to add emergency function
    console.log("🔧 Upgrading TheCellarV3 to add emergency liquidity removal function...");
    const TheCellarV3Emergency = await ethers.getContractFactory("TheCellarV3Emergency");

    const upgradedCellar = await upgrades.upgradeProxy(THE_CELLAR_PROXY, TheCellarV3Emergency);
    await upgradedCellar.waitForDeployment();
    console.log("✅ Contract upgraded!\n");

    // Attach to upgraded contract
    const cellarEmergency = TheCellarV3Emergency.attach(THE_CELLAR_PROXY);

    // Call emergency function to remove all liquidity
    console.log("🗑️  Removing all liquidity from the old pool...");
    console.log(`   Recipient: ${deployer.address} (will receive WMON and KEEP)\n`);

    const tx = await cellarEmergency.emergencyRemoveAllLiquidity(deployer.address);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("✅ All liquidity removed!\n");

    // Verify pool is now empty
    const newPoolLiquidity = await pool.liquidity();
    console.log(`📊 New Pool Liquidity: ${newPoolLiquidity.toString()}`);

    if (newPoolLiquidity === 0n) {
        console.log("\n✅ SUCCESS! Pool is now orphaned (empty and unusable).");
        console.log("   - Swaps will be impossible");
        console.log("   - DEX aggregators won't route through it");
        console.log("   - Users won't accidentally use it\n");

        // Optional: Burn the empty position NFT
        console.log("🔥 Burning empty position NFT...");
        const burnTx = await cellarEmergency.burnEmptyPosition();
        console.log(`Burn transaction: ${burnTx.hash}`);
        await burnTx.wait();
        console.log("✅ Position NFT burned!\n");
    } else {
        console.log("\n⚠️  WARNING: Pool still has liquidity! Something went wrong.");
    }

    console.log("💡 Next steps:");
    console.log("   1. Create a new pool with the correct price (10 KEEP = 1 MON)");
    console.log("   2. Update addresses.ts with the new pool address");
    console.log("   3. Update TheCellarV3 to use the new pool");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

