import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    console.log("🔍 CHECKING POOL LIQUIDITY OWNERS...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Check pool liquidity
    const poolABI = [
        "function liquidity() external view returns (uint128)"
    ];
    const pool = new ethers.Contract(V3_POOL, poolABI, deployer);
    const liquidity = await pool.liquidity();
    console.log(`Pool Liquidity: ${liquidity.toString()}\n`);

    if (liquidity === 0n) {
        console.log("✅ Pool has no liquidity - it's safe to use a new pool!");
        return;
    }

    // Check if TheCellarV3 has a position
    const positionManagerABI = [
        "function balanceOf(address owner) external view returns (uint256)",
        "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
        "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
    ];

    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, positionManagerABI, deployer);

    const cellarBalance = await positionManager.balanceOf(THE_CELLAR_V3);
    console.log(`TheCellarV3 Position Balance: ${cellarBalance.toString()}`);

    if (cellarBalance > 0) {
        console.log(`\nTheCellarV3 owns ${cellarBalance.toString()} position(s):`);
        for (let i = 0; i < Number(cellarBalance); i++) {
            const tokenId = await positionManager.tokenOfOwnerByIndex(THE_CELLAR_V3, i);
            const position = await positionManager.positions(tokenId);
            console.log(`  Position ${tokenId}:`);
            console.log(`    Liquidity: ${position.liquidity.toString()}`);
            console.log(`    Tick Range: ${position.tickLower.toString()} to ${position.tickUpper.toString()}`);
        }
    } else {
        console.log("\n⚠️  TheCellarV3 has no positions - liquidity is owned elsewhere");
        console.log("   We need to find who owns the liquidity to remove it.");
    }

    console.log(`\n💡 To remove liquidity:`);
    console.log(`   1. If TheCellarV3 owns it: Remove via TheCellarV3.withdraw()`);
    console.log(`   2. If someone else owns it: They need to remove it manually`);
    console.log(`   3. Once liquidity is removed, we can create a new pool`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

