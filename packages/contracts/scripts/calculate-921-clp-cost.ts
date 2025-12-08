import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';
const V3_POOL = "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";
const WMON = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const KEEP = "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
// Position manager address will be fetched from contract

const TARGET_CLP = 921n;

// ABI for TheCellarV3
const CELLAR_ABI = [
    'function getAuctionPrice() view returns (uint256)',
    'function slot0() view returns (uint8 locked, uint16 epochId, uint192 initPrice, uint40 startTime)',
    'function epochPeriod() view returns (uint256)',
    'function minInitPrice() view returns (uint256)',
    'function priceMultiplier() view returns (uint256)',
    'function potBalanceMON() view returns (uint256)',
    'function potBalanceKEEP() view returns (uint256)',
    'function totalLiquidity() view returns (uint256)',
    'function tokenId() view returns (uint256)',
    'function wmon() view returns (address)',
    'function keepToken() view returns (address)',
    'function positionManager() view returns (address)'
];

// Pool ABI
const POOL_ABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function liquidity() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function fee() external view returns (uint24)'
];

// Position Manager ABI
const POSITION_MANAGER_ABI = [
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)'
];

// ERC20 ABI
const ERC20_ABI = [
    'function balanceOf(address) external view returns (uint256)',
    'function decimals() external view returns (uint8)'
];

// Calculate token amounts for liquidity using proper Uniswap V3 math
// For full range positions, we need to use tick math
// Simplified approach: calculate proportionally based on current position
function calculateTokenAmountsForLiquidity(
    newLiquidity: bigint,
    currentPositionLiquidity: bigint,
    currentSqrtPriceX96: bigint,
    isToken0KEEP: boolean,
    tickLower: number,
    tickUpper: number,
    currentTick: number
): { amountMON: bigint; amountKEEP: bigint } {
    const Q96 = 2n ** 96n;

    // For full range positions, if price is in range, both tokens are present
    // Use proper Uniswap V3 math for calculating amounts

    if (currentTick >= tickLower && currentTick < tickUpper) {
        // Price is in range - both tokens present
        // For full range, we can use simplified calculation:
        // amount0 ≈ liquidity * Q96 / sqrtPriceX96
        // amount1 ≈ liquidity * sqrtPriceX96 / Q96

        // But we need to account for the tick range bounds
        // For full range at current price, this approximation works:
        const amount0 = (newLiquidity * Q96) / currentSqrtPriceX96;
        const amount1 = (newLiquidity * currentSqrtPriceX96) / Q96;

        if (isToken0KEEP) {
            // token0 = KEEP, token1 = WMON
            return { amountMON: amount1, amountKEEP: amount0 };
        } else {
            // token0 = WMON, token1 = KEEP
            return { amountMON: amount0, amountKEEP: amount1 };
        }
    } else {
        // Price outside range - shouldn't happen for full range, but handle it
        console.log("   ⚠️  Warning: Price outside tick range");
        return { amountMON: 0n, amountKEEP: 0n };
    }
}

// Alternative: Calculate proportionally based on existing position
function calculateTokenAmountsProportional(
    newLiquidity: bigint,
    currentPositionLiquidity: bigint,
    tokensOwed0: bigint,
    tokensOwed1: bigint,
    isToken0KEEP: boolean
): { amountMON: bigint; amountKEEP: bigint } {
    // Calculate what proportion new liquidity is of current
    // Then estimate token amounts needed (this is approximate)
    // Note: tokensOwed are fees, not principal, so this is rough

    // Better: estimate based on liquidity ratio
    // If we're adding X% more liquidity, we need roughly X% more tokens
    // But this doesn't account for price changes, so it's approximate

    const liquidityRatio = (newLiquidity * 1000000n) / currentPositionLiquidity; // Use high precision

    // Estimate token amounts (very rough - actual depends on current price)
    // This is a fallback when we can't use proper math
    const estimatedAmount0 = (tokensOwed0 * liquidityRatio) / 1000000n;
    const estimatedAmount1 = (tokensOwed1 * liquidityRatio) / 1000000n;

    if (isToken0KEEP) {
        return { amountMON: estimatedAmount1, amountKEEP: estimatedAmount0 };
    } else {
        return { amountMON: estimatedAmount0, amountKEEP: estimatedAmount1 };
    }
}

// Calculate auction price
function calculateAuctionPrice(slot0: any, blockTimestamp: number, epochPeriod: bigint, minInitPrice: bigint): bigint {
    const initPrice = BigInt(slot0.initPrice.toString());
    const startTime = BigInt(slot0.startTime.toString());
    const timePassed = BigInt(blockTimestamp) - startTime;

    if (timePassed > epochPeriod) {
        return minInitPrice;
    }

    const calculatedPrice = initPrice - (initPrice * timePassed) / epochPeriod;
    return calculatedPrice < minInitPrice ? minInitPrice : calculatedPrice;
}

async function main() {
    console.log("🔢 CALCULATING COST FOR 921 CLP TOKENS\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // 1. Get Cellar contract state
    console.log("📊 THE CELLAR STATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);

    const [
        potBalanceMON,
        potBalanceKEEP,
        totalLiquidity,
        tokenId,
        slot0,
        epochPeriod,
        minInitPrice,
        priceMultiplier,
        currentAuctionPrice
    ] = await Promise.all([
        cellar.potBalanceMON(),
        cellar.potBalanceKEEP(),
        cellar.totalLiquidity(),
        cellar.tokenId(),
        cellar.slot0(),
        cellar.epochPeriod(),
        cellar.minInitPrice(),
        cellar.priceMultiplier(),
        cellar.getAuctionPrice()
    ]);

    console.log(`   Pot Balance MON: ${ethers.formatEther(potBalanceMON)} MON`);
    console.log(`   Pot Balance KEEP: ${ethers.formatEther(potBalanceKEEP)} KEEP`);
    console.log(`   Total Liquidity (CLP Supply): ${totalLiquidity.toString()}`);
    console.log(`   NFT Position ID: ${tokenId.toString()}`);
    console.log(`   Current Epoch ID: ${slot0.epochId}`);
    console.log(`   Current Auction Price: ${ethers.formatEther(currentAuctionPrice)} CLP`);
    console.log(`   Epoch Period: ${epochPeriod.toString()} seconds (${Number(epochPeriod) / 3600} hours)`);
    console.log(`   Min Init Price: ${ethers.formatEther(minInitPrice)} CLP`);
    console.log(`   Price Multiplier: ${ethers.formatEther(priceMultiplier)} (${Number(priceMultiplier) / 1e18}x)`);

    const block = await ethers.provider.getBlock('latest');
    const calculatedPrice = calculateAuctionPrice(slot0, block!.timestamp, epochPeriod, minInitPrice);
    console.log(`   Calculated Price (from slot0): ${ethers.formatEther(calculatedPrice)} CLP`);
    console.log();

    // 2. Get pool state
    console.log("🏊 UNISWAP V3 POOL STATE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const pool = new ethers.Contract(V3_POOL, POOL_ABI, deployer);

    const [poolToken0, poolToken1, poolSlot0, poolLiquidity] = await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.slot0(),
        pool.liquidity()
    ]);

    const isToken0WMON = poolToken0.toLowerCase() === WMON.toLowerCase();
    const isToken0KEEP = poolToken0.toLowerCase() === KEEP.toLowerCase();

    console.log(`   Token0: ${poolToken0} ${isToken0WMON ? '(WMON)' : isToken0KEEP ? '(KEEP)' : ''}`);
    console.log(`   Token1: ${poolToken1} ${poolToken1.toLowerCase() === WMON.toLowerCase() ? '(WMON)' : poolToken1.toLowerCase() === KEEP.toLowerCase() ? '(KEEP)' : ''}`);
    console.log(`   Pool Total Liquidity: ${poolLiquidity.toString()}`);
    console.log(`   Current Tick: ${poolSlot0.tick}`);
    console.log(`   SqrtPriceX96: ${poolSlot0.sqrtPriceX96.toString()}`);

    // Calculate current price
    const Q96 = 2n ** 96n;
    const sqrtPrice = Number(poolSlot0.sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;

    let keepPerMon: number;
    if (isToken0WMON) {
        // token0 = WMON, token1 = KEEP, price = KEEP/WMON = KEEP/MON
        keepPerMon = price;
    } else if (isToken0KEEP) {
        // token0 = KEEP, token1 = WMON, price = WMON/KEEP = MON/KEEP, so KEEP/MON = 1/price
        keepPerMon = 1 / price;
    } else {
        keepPerMon = 10; // Fallback
    }

    console.log(`   Current Price: 1 MON = ${keepPerMon.toFixed(6)} KEEP`);
    console.log();

    // 3. Get position details
    console.log("📍 CELLAR NFT POSITION:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    let pm: ethers.Contract | null = null;
    let position: any = null;

    if (tokenId > 0n) {
        const positionManager = await cellar.positionManager();
        pm = new ethers.Contract(positionManager, POSITION_MANAGER_ABI, deployer);
        position = await pm.positions(tokenId);

        console.log(`   Position Liquidity: ${position.liquidity.toString()}`);
        console.log(`   Tick Lower: ${position.tickLower.toString()} (full range: -887200)`);
        console.log(`   Tick Upper: ${position.tickUpper.toString()} (full range: 887200)`);
        console.log(`   Tokens Owed0: ${position.tokensOwed0.toString()}`);
        console.log(`   Tokens Owed1: ${position.tokensOwed1.toString()}`);
        console.log();
    } else {
        console.log("   ⚠️  No position exists yet (tokenId = 0)");
        console.log();
    }

    // 4. Calculate MON and KEEP needed for 921 CLP
    console.log("💰 COST CALCULATION FOR 921 CLP TOKENS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // CLP tokens are minted 1:1 with liquidity units
    // So 921 CLP = 921 liquidity units
    const targetLiquidity = TARGET_CLP;

    // Calculate token amounts needed
    // Note: This is an estimate based on current pool price
    // Actual amounts may vary slightly due to Uniswap V3 math, but should be very close
    let tokenAmounts: { amountMON: bigint; amountKEEP: bigint };

    if (tokenId > 0n) {
        // Use position details for more accurate calculation
        const position = await pm.positions(tokenId);
        tokenAmounts = calculateTokenAmountsForLiquidity(
            targetLiquidity,
            BigInt(position.liquidity.toString()),
            poolSlot0.sqrtPriceX96,
            isToken0KEEP,
            Number(position.tickLower),
            Number(position.tickUpper),
            Number(poolSlot0.tick)
        );

        // If calculation seems off, try proportional method as fallback
        if (tokenAmounts.amountMON === 0n && tokenAmounts.amountKEEP === 0n) {
            console.log("   ⚠️  Using proportional fallback calculation...");
            tokenAmounts = calculateTokenAmountsProportional(
                targetLiquidity,
                BigInt(position.liquidity.toString()),
                BigInt(position.tokensOwed0.toString()),
                BigInt(position.tokensOwed1.toString()),
                isToken0KEEP
            );
        }
    } else {
        // No position yet - use simplified calculation
        tokenAmounts = calculateTokenAmountsForLiquidity(
            targetLiquidity,
            poolLiquidity,
            poolSlot0.sqrtPriceX96,
            isToken0KEEP,
            -887200,
            887200,
            Number(poolSlot0.tick)
        );
    }

    console.log(`   Target CLP: ${TARGET_CLP.toString()}`);
    console.log(`   Target Liquidity Units: ${targetLiquidity.toString()}`);
    console.log(`   Estimated Required WMON: ${ethers.formatEther(tokenAmounts.amountMON)} MON`);
    console.log(`   Estimated Required KEEP: ${ethers.formatEther(tokenAmounts.amountKEEP)} KEEP`);
    console.log(`   Ratio: ${ethers.formatEther(tokenAmounts.amountKEEP / tokenAmounts.amountMON)} KEEP per 1 MON`);
    console.log(`   ⚠️  Note: These are estimates. Actual amounts may vary slightly.`);
    console.log(`      The contract will refund any excess tokens.`);
    console.log();

    // 5. Check if user has enough
    console.log("💵 YOUR BALANCES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const wmonToken = new ethers.Contract(WMON, ERC20_ABI, deployer);
    const keepToken = new ethers.Contract(KEEP, ERC20_ABI, deployer);

    const [wmonBalance, keepBalance] = await Promise.all([
        wmonToken.balanceOf(deployer.address),
        keepToken.balanceOf(deployer.address)
    ]);

    console.log(`   Your WMON Balance: ${ethers.formatEther(wmonBalance)} MON`);
    console.log(`   Your KEEP Balance: ${ethers.formatEther(keepBalance)} KEEP`);
    console.log();

    const hasEnoughWMON = wmonBalance >= tokenAmounts.amountMON;
    const hasEnoughKEEP = keepBalance >= tokenAmounts.amountKEEP;

    if (hasEnoughWMON && hasEnoughKEEP) {
        console.log("   ✅ You have enough tokens to mint 921 CLP!");
    } else {
        console.log("   ❌ Insufficient balance:");
        if (!hasEnoughWMON) {
            const needed = tokenAmounts.amountMON - wmonBalance;
            console.log(`      Need ${ethers.formatEther(needed)} more MON`);
        }
        if (!hasEnoughKEEP) {
            const needed = tokenAmounts.amountKEEP - keepBalance;
            console.log(`      Need ${ethers.formatEther(needed)} more KEEP`);
        }
    }
    console.log();

    // 6. Current game state analysis
    console.log("🎮 CURRENT GAME STATE ANALYSIS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const timeSinceEpochStart = block!.timestamp - Number(slot0.startTime);
    const epochProgress = (timeSinceEpochStart / Number(epochPeriod)) * 100;

    console.log(`   Time Since Epoch Start: ${timeSinceEpochStart} seconds (${(timeSinceEpochStart / 60).toFixed(2)} minutes)`);
    console.log(`   Epoch Progress: ${epochProgress.toFixed(2)}%`);
    console.log(`   Pot Value: ${ethers.formatEther(potBalanceMON)} MON + ${ethers.formatEther(potBalanceKEEP)} KEEP`);

    // Calculate pot value in MON equivalent (approximate)
    const keepValueInMON = (potBalanceKEEP * BigInt(Math.floor(keepPerMon * 1e18))) / ethers.parseEther("1");
    const potValueInMON = potBalanceMON + keepValueInMON;
    console.log(`   Pot Value (MON equivalent): ~${ethers.formatEther(potValueInMON)} MON`);

    if (currentAuctionPrice > 0n && totalLiquidity > 0n) {
        // Estimate raid cost in MON by calculating MON value of CLP tokens
        // If 921 CLP costs tokenAmounts.amountMON MON, then currentAuctionPrice CLP costs:
        const raidCostInMON = (currentAuctionPrice * tokenAmounts.amountMON) / targetLiquidity;
        console.log(`   Current Raid Cost: ${ethers.formatEther(currentAuctionPrice)} CLP`);
        console.log(`   Raid Cost (MON equivalent): ~${ethers.formatEther(raidCostInMON)} MON`);
        if (potValueInMON > 0n && raidCostInMON > 0n) {
            const raidROI = (potValueInMON * 10000n) / raidCostInMON;
            console.log(`   Pot/Raid Cost Ratio: ${Number(raidROI) / 100}%`);
        }
    }

    console.log(`   Your Share (if you mint 921 CLP): ${((Number(TARGET_CLP) / Number(totalLiquidity + TARGET_CLP)) * 100).toFixed(4)}%`);
    console.log();

    // 7. Summary
    console.log("📋 SUMMARY:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   To mint ${TARGET_CLP.toString()} CLP tokens, you need:`);
    console.log(`   • ${ethers.formatEther(tokenAmounts.amountMON)} WMON`);
    console.log(`   • ${ethers.formatEther(tokenAmounts.amountKEEP)} KEEP`);
    console.log(`   • At current price: 1 MON = ${keepPerMon.toFixed(6)} KEEP`);
    console.log();
    console.log(`   Current pot: ${ethers.formatEther(potBalanceMON)} MON + ${ethers.formatEther(potBalanceKEEP)} KEEP`);
    console.log(`   Current raid price: ${ethers.formatEther(currentAuctionPrice)} CLP`);
    console.log();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

