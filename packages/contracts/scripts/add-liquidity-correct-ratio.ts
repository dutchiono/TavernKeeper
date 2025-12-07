import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const CORRECT_WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const THE_CELLAR_V3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";

async function main() {
    console.log("➕ ADDING LIQUIDITY AT CORRECT RATIO (10 KEEP = 1 MON)...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name} (Chain ID: ${(await ethers.provider.getNetwork()).chainId})\n`);

    // Check balances
    const erc20ABI = [
        "function balanceOf(address) external view returns (uint256)",
        "function approve(address, uint256) external returns (bool)"
    ];
    const wmon = new ethers.Contract(CORRECT_WMON, erc20ABI, deployer);
    const keep = new ethers.Contract(KEEP, erc20ABI, deployer);

    const wmonBalance = await wmon.balanceOf(deployer.address);
    const keepBalance = await keep.balanceOf(deployer.address);

    console.log(`💵 Your Balances:`);
    console.log(`   WMON: ${ethers.formatEther(wmonBalance)}`);
    console.log(`   KEEP: ${ethers.formatEther(keepBalance)}\n`);

    // Target ratio: 10 KEEP = 1 MON
    // Calculate amounts to maintain exact 10:1 ratio
    let amountMON: bigint;
    let amountKEEP: bigint;

    // Start with available balances
    const maxMON = wmonBalance;
    const maxKEEP = keepBalance;

    // Calculate what we can add maintaining 10:1 ratio
    // Option 1: Use all available MON, calculate required KEEP
    const keepNeededForAllMON = maxMON * 10n;

    // Option 2: Use all available KEEP, calculate required MON
    const monNeededForAllKEEP = maxKEEP / 10n;

    // Choose the limiting factor
    if (keepNeededForAllMON <= maxKEEP) {
        // We have enough KEEP for all MON
        amountMON = maxMON;
        amountKEEP = keepNeededForAllMON;
    } else {
        // Not enough KEEP, use all KEEP and calculate MON
        amountKEEP = maxKEEP;
        amountMON = monNeededForAllKEEP;
    }

    // Ensure we have at least some minimum
    if (amountMON < ethers.parseEther("1") || amountKEEP < ethers.parseEther("10")) {
        console.log("❌ Insufficient balance to add meaningful liquidity!");
        console.log(`   Need at least 1 MON and 10 KEEP`);
        return;
    }

    if (amountMON === 0n || amountKEEP === 0n) {
        console.log("❌ Cannot maintain 10:1 ratio with available balances!");
        return;
    }

    console.log(`📊 Adding Liquidity:`);
    console.log(`   WMON: ${ethers.formatEther(amountMON)}`);
    console.log(`   KEEP: ${ethers.formatEther(amountKEEP)}`);
    console.log(`   Ratio: ${ethers.formatEther(amountKEEP / amountMON)} KEEP per 1 MON\n`);

    // Approve tokens
    console.log("📝 Approving tokens to TheCellarV3...");
    await (await wmon.approve(THE_CELLAR_V3, amountMON)).wait();
    await (await keep.approve(THE_CELLAR_V3, amountKEEP)).wait();
    console.log("✅ Tokens approved!\n");

    // Add liquidity
    const cellarABI = [
        "function addLiquidity(uint256 amountMonDesired, uint256 amountKeepDesired) external returns (uint256 liquidity)"
    ];
    const cellar = new ethers.Contract(THE_CELLAR_V3, cellarABI, deployer);

    console.log("➕ Adding liquidity...");
    const tx = await cellar.addLiquidity(amountMON, amountKEEP);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("✅ Liquidity added!\n");

    // Check pool state
    await new Promise(resolve => setTimeout(resolve, 3000));

    const poolABI = [
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function liquidity() external view returns (uint128)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)"
    ];
    const pool = new ethers.Contract(V3_POOL, poolABI, deployer);

    const [slot0, poolLiquidity, token0, token1] = await Promise.all([
        pool.slot0(),
        pool.liquidity(),
        pool.token0(),
        pool.token1()
    ]);

    const isToken0KEEP = token0.toLowerCase() === KEEP.toLowerCase();
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(slot0[0]) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;

    let currentKeepPerMon: number;
    if (isToken0KEEP) {
        currentKeepPerMon = 1 / price;
    } else {
        currentKeepPerMon = price;
    }

    console.log("📊 Pool State After Adding Liquidity:");
    console.log(`   Pool Address: ${V3_POOL}`);
    console.log(`   Liquidity: ${poolLiquidity.toString()}`);
    console.log(`   Current Price: 1 MON = ${currentKeepPerMon.toFixed(6)} KEEP`);
    console.log(`   Target Price: 1 MON = 10 KEEP\n`);

    console.log("✅ SUCCESS! Liquidity added at correct ratio (10 KEEP = 1 MON).");
    console.log("   The price will naturally move towards the target as people trade.");
    console.log(`   Pool Address: ${V3_POOL}`);
    console.log(`   Fee Tier: 1% (10000)`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

