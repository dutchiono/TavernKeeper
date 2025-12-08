import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const THE_CELLAR_V3 = process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const V3_POSITION_MANAGER = "0x7197e214c0b767cfb76fb734ab638e2c192f4e53";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP_TOKEN = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS || "";

const CELLAR_ABI = [
    'function tokenId() view returns (uint256)',
    'function owner() view returns (address)',
    'function positionManager() view returns (address)',
];

const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
    'function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)',
];

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
];

async function main() {
    console.log("🌾 HARVESTING LP FEES DIRECTLY FROM POSITION\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    const feeRecipient = DEPLOYER_ADDRESS || deployer.address;
    console.log(`Fee Recipient: ${feeRecipient}\n`);

    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
    const positionManager = new ethers.Contract(V3_POSITION_MANAGER, POSITION_MANAGER_ABI, deployer);
    const wmon = new ethers.Contract(WMON, ERC20_ABI, deployer);
    const keep = new ethers.Contract(KEEP_TOKEN, ERC20_ABI, deployer);

    // Check contract ownership
    const owner = await cellar.owner();
    const tokenId = await cellar.tokenId();

    console.log(`📋 Contract Info:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Token ID: ${tokenId.toString()}\n`);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error(`❌ Error: You are not the owner!`);
        console.error(`   Your address: ${deployer.address}`);
        console.error(`   Owner address: ${owner}`);
        process.exit(1);
    }

    if (tokenId === 0n) {
        console.error(`❌ Error: No position exists (tokenId = 0)`);
        console.error(`   Cannot harvest fees from a non-existent position.`);
        process.exit(1);
    }

    // Check who owns the NFT (should be TheCellarV3 contract)
    const position = await positionManager.positions(tokenId);
    console.log(`📊 Position Info:`);
    console.log(`   Operator: ${position.operator}`);
    console.log(`   Token0: ${position.token0}`);
    console.log(`   Token1: ${position.token1}`);
    console.log(`   Liquidity: ${ethers.formatEther(position.liquidity)}\n`);

    const wmonIsToken0 = position.token0.toLowerCase() === WMON.toLowerCase();
    const tokensOwedMON = wmonIsToken0 ? position.tokensOwed0 : position.tokensOwed1;
    const tokensOwedKEEP = wmonIsToken0 ? position.tokensOwed1 : position.tokensOwed0;

    console.log(`   Tokens Owed (fees):`);
    console.log(`     WMON: ${ethers.formatEther(tokensOwedMON)}`);
    console.log(`     KEEP: ${ethers.formatEther(tokensOwedKEEP)}\n`);

    if (tokensOwedMON === 0n && tokensOwedKEEP === 0n) {
        console.log(`⚠️  No fees to harvest! Position has 0 accumulated fees.`);
        process.exit(0);
    }

    // Check fee recipient balances before
    console.log(`💰 Fee Recipient Balances (Before):`);
    const wmonBalanceBefore = await wmon.balanceOf(feeRecipient);
    const keepBalanceBefore = await keep.balanceOf(feeRecipient);
    console.log(`   WMON: ${ethers.formatEther(wmonBalanceBefore)}`);
    console.log(`   KEEP: ${ethers.formatEther(keepBalanceBefore)}\n`);

    // Check if TheCellarV3 is the operator (it should be)
    if (position.operator.toLowerCase() !== THE_CELLAR_V3.toLowerCase()) {
        console.error(`❌ Error: TheCellarV3 contract is not the operator of this position!`);
        console.error(`   Operator: ${position.operator}`);
        console.error(`   Expected: ${THE_CELLAR_V3}`);
        console.error(`   Only the operator can collect fees.`);
        process.exit(1);
    }

    // Since TheCellarV3 is the operator, we need to call collect through it
    // But since harvest() requires deployerAddress, we'll use a workaround:
    // We can't directly call collect() because TheCellarV3 owns the NFT
    // We need to either:
    // 1. Upgrade contract to fix deployerAddress (user said no)
    // 2. Use the contract's harvest() but it will fail because deployerAddress is 0x0

    // Actually, wait - let me check if we can approve the position manager to operate
    // Or if TheCellarV3 has a way to delegate collection

    console.log(`⚠️  The position NFT is owned by TheCellarV3 contract.`);
    console.log(`   The contract's harvest() function requires deployerAddress to be set.`);
    console.log(`   Since deployerAddress is 0x0, we cannot use harvest().\n`);

    console.log(`💡 Solution: You need to set deployerAddress on the contract first.`);
    console.log(`   This requires upgrading the contract to add a setDeployerAddress() function.`);
    console.log(`   Or you can re-initialize if the contract allows it (unlikely).\n`);

    console.log(`📝 Current state:`);
    console.log(`   Contract deployerAddress: 0x0 (not set)`);
    console.log(`   Your DEPLOYER_ADDRESS from .env: ${DEPLOYER_ADDRESS || 'not set'}`);
    console.log(`   Fee recipient address: ${feeRecipient}`);
    console.log(`   Available fees: ${ethers.formatEther(tokensOwedMON)} WMON, ${ethers.formatEther(tokensOwedKEEP)} KEEP\n`);

    process.exit(1);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

