import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3 = process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP_TOKEN = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const DEPLOYER_ADDRESS_ENV = process.env.DEPLOYER_ADDRESS || "";

const CELLAR_ABI = [
    'function tokenId() view returns (uint256)',
    'function deployerAddress() view returns (address)',
    'function owner() view returns (address)',
    'function harvest()',
    'event FeesCollected(uint256 amount0, uint256 amount1)',
];

const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
];

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
];

async function main() {
    console.log("🌾 HARVESTING LP FEES FROM THE CELLAR\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, POSITION_MANAGER_ABI, deployer);
    const wmon = new ethers.Contract(WMON, ERC20_ABI, deployer);
    const keep = new ethers.Contract(KEEP_TOKEN, ERC20_ABI, deployer);

    // Check contract ownership
    const owner = await cellar.owner();
    const deployerAddress = await cellar.deployerAddress();
    const tokenId = await cellar.tokenId();

    console.log(`📋 Contract Info:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Contract deployerAddress: ${deployerAddress}`);
    console.log(`   DEPLOYER_ADDRESS from .env: ${DEPLOYER_ADDRESS_ENV || 'not set'}`);
    console.log(`   Token ID: ${tokenId.toString()}\n`);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error(`❌ Error: You are not the owner!`);
        console.error(`   Your address: ${deployer.address}`);
        console.error(`   Owner address: ${owner}`);
        process.exit(1);
    }

    if (deployerAddress === ethers.ZeroAddress) {
        console.error(`❌ Error: Contract's deployerAddress is not set (0x0)`);
        console.error(`   The contract's harvest() function requires deployerAddress to be set.`);
        console.error(`   Owner: ${owner}`);
        if (DEPLOYER_ADDRESS_ENV) {
            console.error(`\n   ⚠️  Mismatch detected:`);
            console.error(`   - DEPLOYER_ADDRESS in .env: ${DEPLOYER_ADDRESS_ENV}`);
            console.error(`   - Contract deployerAddress: 0x0 (not set)`);
            console.error(`\n   The contract was initialized with deployerAddress = 0x0.`);
            console.error(`   You need to set it on the contract before harvesting.`);
        } else {
            console.error(`   DEPLOYER_ADDRESS is not set in .env either.`);
        }
        process.exit(1);
    }

    if (tokenId === 0n) {
        console.error(`❌ Error: No position exists (tokenId = 0)`);
        console.error(`   Cannot harvest fees from a non-existent position.`);
        process.exit(1);
    }

    // Check current fees in position
    console.log(`📊 Checking Position Fees...\n`);
    const position = await positionManager.positions(tokenId);

    const wmonIsToken0 = position.token0.toLowerCase() === WMON.toLowerCase();
    const tokensOwedMON = wmonIsToken0 ? position.tokensOwed0 : position.tokensOwed1;
    const tokensOwedKEEP = wmonIsToken0 ? position.tokensOwed1 : position.tokensOwed0;

    console.log(`   Position Liquidity: ${ethers.formatEther(position.liquidity)}`);
    console.log(`   Tokens Owed (fees):`);
    console.log(`     WMON: ${ethers.formatEther(tokensOwedMON)}`);
    console.log(`     KEEP: ${ethers.formatEther(tokensOwedKEEP)}\n`);

    if (tokensOwedMON === 0n && tokensOwedKEEP === 0n) {
        console.log(`⚠️  No fees to harvest! Position has 0 accumulated fees.`);
        process.exit(0);
    }

    // Check deployer balances before
    console.log(`💰 Deployer Balances (Before):`);
    const wmonBalanceBefore = await wmon.balanceOf(deployerAddress);
    const keepBalanceBefore = await keep.balanceOf(deployerAddress);
    console.log(`   WMON: ${ethers.formatEther(wmonBalanceBefore)}`);
    console.log(`   KEEP: ${ethers.formatEther(keepBalanceBefore)}\n`);

    // Execute harvest
    console.log(`🚀 Harvesting fees...`);
    try {
        const tx = await cellar.harvest();
        console.log(`   Transaction hash: ${tx.hash}`);
        console.log(`   Waiting for confirmation...`);

        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}\n`);

        // Parse FeesCollected event
        const feesCollectedEvent = receipt.logs.find((log: any) => {
            try {
                const parsed = cellar.interface.parseLog(log);
                return parsed?.name === 'FeesCollected';
            } catch {
                return false;
            }
        });

        if (feesCollectedEvent) {
            const parsed = cellar.interface.parseLog(feesCollectedEvent);
            const collected0 = parsed?.args[0];
            const collected1 = parsed?.args[1];
            const collectedMON = wmonIsToken0 ? collected0 : collected1;
            const collectedKEEP = wmonIsToken0 ? collected1 : collected0;

            console.log(`📦 Fees Collected:`);
            console.log(`   WMON: ${ethers.formatEther(collectedMON)}`);
            console.log(`   KEEP: ${ethers.formatEther(collectedKEEP)}\n`);
        }

        // Check deployer balances after
        console.log(`💰 Deployer Balances (After):`);
        const wmonBalanceAfter = await wmon.balanceOf(deployerAddress);
        const keepBalanceAfter = await keep.balanceOf(deployerAddress);
        console.log(`   WMON: ${ethers.formatEther(wmonBalanceAfter)}`);
        console.log(`   KEEP: ${ethers.formatEther(keepBalanceAfter)}\n`);

        const wmonChange = wmonBalanceAfter - wmonBalanceBefore;
        const keepChange = keepBalanceAfter - keepBalanceBefore;

        console.log(`📈 Balance Changes:`);
        console.log(`   WMON: ${wmonChange >= 0n ? '+' : ''}${ethers.formatEther(wmonChange)}`);
        console.log(`   KEEP: ${keepChange >= 0n ? '+' : ''}${ethers.formatEther(keepChange)}\n`);

        // Verify position fees are now 0 (or reduced)
        const positionAfter = await positionManager.positions(tokenId);
        const tokensOwedMONAfter = wmonIsToken0 ? positionAfter.tokensOwed0 : positionAfter.tokensOwed1;
        const tokensOwedKEEPAfter = wmonIsToken0 ? positionAfter.tokensOwed1 : positionAfter.tokensOwed0;

        console.log(`✅ Position Fees (After Harvest):`);
        console.log(`   WMON: ${ethers.formatEther(tokensOwedMONAfter)}`);
        console.log(`   KEEP: ${ethers.formatEther(tokensOwedKEEPAfter)}\n`);

        if (tokensOwedMONAfter === 0n && tokensOwedKEEPAfter === 0n) {
            console.log(`🎉 All fees successfully harvested!`);
        } else {
            console.log(`⚠️  Note: Some fees may remain (this can happen if fees accumulated during the transaction)`);
        }

    } catch (error: any) {
        console.error(`❌ Harvest failed:`, error.message);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

