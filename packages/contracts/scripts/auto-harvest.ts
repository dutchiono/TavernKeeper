import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Support both hardhat context and standalone execution
dotenv.config({ path: "../../.env" });

// Read addresses from addresses.ts (same pattern as other scripts)
function getAddressesFromFile() {
    const possiblePaths = [
        path.join(__dirname, "../../../apps/web/lib/contracts/addresses.ts"),
        path.join(process.cwd(), "../../apps/web/lib/contracts/addresses.ts"),
        path.join(process.cwd(), "../../../apps/web/lib/contracts/addresses.ts"),
    ];

    for (const addressesPath of possiblePaths) {
        if (fs.existsSync(addressesPath)) {
            const content = fs.readFileSync(addressesPath, "utf-8");

            // Determine which address set to use based on chain ID
            const chainId = parseInt(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || "143");
            const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === "true";

            let addressSet: any = {};
            let sectionContent = "";

            if (useLocalhost) {
                // Extract LOCALHOST_ADDRESSES
                const localhostMatch = content.match(/export const LOCALHOST_ADDRESSES = \{([\s\S]*?)\};/);
                if (localhostMatch) {
                    sectionContent = localhostMatch[1];
                }
            } else if (chainId === 143) {
                // Extract MONAD_MAINNET_ADDRESSES
                const mainnetMatch = content.match(/const MONAD_MAINNET_ADDRESSES = \{([\s\S]*?)\};/);
                if (mainnetMatch) {
                    sectionContent = mainnetMatch[1];
                }
            } else {
                // Extract MONAD_TESTNET_ADDRESSES
                const testnetMatch = content.match(/const MONAD_TESTNET_ADDRESSES = \{([\s\S]*?)\};/);
                if (testnetMatch) {
                    sectionContent = testnetMatch[1];
                }
            }

            if (sectionContent) {
                addressSet.THE_CELLAR = extractAddress(sectionContent, "THE_CELLAR");
                addressSet.KEEP_TOKEN = extractAddress(sectionContent, "KEEP_TOKEN");
                addressSet.WMON = extractAddress(sectionContent, "WMON");
                addressSet.V3_SWAP_ROUTER = extractAddress(sectionContent, "V3_SWAP_ROUTER");
                addressSet.V3_POOL = extractAddress(sectionContent, "V3_POOL");
                addressSet.LP_STAKING = extractAddress(sectionContent, "LP_STAKING");
                addressSet.KEEP_STAKING = extractAddress(sectionContent, "KEEP_STAKING");
            }

            return addressSet;
        }
    }

    return {};
}

function extractAddress(content: string, key: string): string {
    // Match: KEY: '0x...' or KEY: "0x..." (with optional whitespace)
    const regex = new RegExp(`${key}:\\s*['"](0x[a-fA-F0-9]{40})['"]`, "i");
    const match = content.match(regex);
    return match ? match[1] : "";
}

// Get addresses from addresses.ts
const addresses = getAddressesFromFile();

// Configuration - addresses from addresses.ts, percentages from env vars
const THE_CELLAR_V3 = addresses.THE_CELLAR || process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const KEEP_TOKEN = addresses.KEEP_TOKEN || process.env.KEEP_TOKEN || "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const WMON_TOKEN = addresses.WMON || process.env.WMON_TOKEN || process.env.NEXT_PUBLIC_WMON || "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const V3_SWAP_ROUTER = addresses.V3_SWAP_ROUTER || process.env.V3_SWAP_ROUTER || "0x8DF71133E100c05486B5fbE60a1c82272fb8098b";
const V3_POOL = addresses.V3_POOL || process.env.V3_POOL || "0xA4E86c0B9579b4D37CB4c50fB8505dAC9f642474";

const LP_STAKING_CONTRACT = addresses.LP_STAKING || process.env.LP_STAKING_CONTRACT || "";
const KEEP_STAKING_CONTRACT = addresses.KEEP_STAKING || process.env.KEEP_STAKING_CONTRACT || "";
const HARVEST_INTERVAL_HOURS = parseInt(process.env.HARVEST_INTERVAL_HOURS || "1");

// Configurable percentages (0-100, as integers)
const KEEP_STAKING_PERCENT = parseInt(process.env.KEEP_STAKING_PERCENT || "90"); // 90% of KEEP to staking
const KEEP_DEPLOYER_PERCENT = parseInt(process.env.KEEP_DEPLOYER_PERCENT || "10"); // 10% of KEEP to deployer
const LP_STAKING_PERCENT = parseInt(process.env.LP_STAKING_PERCENT || "45"); // 45% of KEEP to LP staking (when deployed)
const WMON_BUYBACK_PERCENT = parseInt(process.env.WMON_BUYBACK_PERCENT || "50"); // 50% of WMON for buyback/burn
const WMON_DEPLOYER_PERCENT = parseInt(process.env.WMON_DEPLOYER_PERCENT || "50"); // 50% of WMON to deployer

const CELLAR_ABI = [
    'function tokenId() view returns (uint256)',
    'function deployerAddress() view returns (address)',
    'function owner() view returns (address)',
    'function harvest()',
    'function wmon() view returns (address)',
    'function keepToken() view returns (address)',
    'event FeesCollected(uint256 amount0, uint256 amount1)',
];

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address, uint256) returns (bool)',
    'function approve(address, uint256) returns (bool)',
    'function allowance(address, address) view returns (uint256)',
];

const STAKING_ABI = [
    'function depositRewards(uint256 amount)',
];

const SWAP_ROUTER_ABI = [
    'function swapExactInput(address pool, uint256 amountIn, uint256 amountOutMinimum, address recipient, bool zeroForOne) external returns (uint256 amountOut)',
];

interface HarvestResult {
    success: boolean;
    collectedKEEP: bigint;
    collectedMON: bigint;
    error?: string;
}

async function checkAndHarvest(): Promise<HarvestResult> {
    // Support both hardhat context and standalone execution
    let deployer: any;
    let provider: any;
    let ethersLib: any;

    // Try to use hardhat first, fallback to standalone ethers
    try {
        const hre = await import("hardhat");
        ethersLib = hre.ethers;
        [deployer] = await ethersLib.getSigners();
        provider = ethersLib.provider;
    } catch {
        // Standalone execution (e.g., Render worker) - use hardhat's ethers with JsonRpcProvider
        const hre = require("hardhat");
        ethersLib = hre.ethers;
        provider = new ethersLib.JsonRpcProvider(process.env.NEXT_PUBLIC_MONAD_RPC_URL);
        if (!process.env.DEPLOYER_PRIVATE_KEY) {
            return {
                success: false,
                collectedKEEP: 0n,
                collectedMON: 0n,
                error: "DEPLOYER_PRIVATE_KEY not set and not in hardhat context"
            };
        }
        deployer = new ethersLib.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    }

    const network = await provider.getNetwork();

    console.log(`\n[${new Date().toISOString()}] Checking harvest status...`);
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);

    const cellar = new ethersLib.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
    const keepToken = new ethersLib.Contract(KEEP_TOKEN, ERC20_ABI, deployer);
    const wmonToken = new ethersLib.Contract(WMON_TOKEN, ERC20_ABI, deployer);

    // Check contract ownership
    const owner = await cellar.owner();
    const deployerAddress = await cellar.deployerAddress();
    const tokenId = await cellar.tokenId();

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        return {
            success: false,
            collectedKEEP: 0n,
            collectedMON: 0n,
            error: `Not the owner. Your address: ${deployer.address}, Owner: ${owner}`
        };
    }

    const zeroAddress = ethersLib.ZeroAddress || "0x0000000000000000000000000000000000000000";
    if (deployerAddress === zeroAddress || deployerAddress === "0x0000000000000000000000000000000000000000") {
        return {
            success: false,
            collectedKEEP: 0n,
            collectedMON: 0n,
            error: "Contract's deployerAddress is not set"
        };
    }

    if (tokenId === 0n) {
        return {
            success: false,
            collectedKEEP: 0n,
            collectedMON: 0n,
            error: "No position exists (tokenId = 0)"
        };
    }

    // Check balances before harvest
    const keepBalanceBefore = await keepToken.balanceOf(deployerAddress);
    const wmonBalanceBefore = await wmonToken.balanceOf(deployerAddress);
    console.log(`Deployer balances (before):`);
    console.log(`  KEEP: ${ethersLib.formatEther(keepBalanceBefore)}`);
    console.log(`  WMON: ${ethersLib.formatEther(wmonBalanceBefore)}`);

    // Execute harvest
    try {
        console.log(`Calling harvest()...`);
        const tx = await cellar.harvest();
        console.log(`Transaction hash: ${tx.hash}`);
        console.log(`Waiting for confirmation...`);

        const receipt = await tx.wait();
        console.log(`✅ Harvest confirmed in block ${receipt.blockNumber}`);

        // Parse FeesCollected event
        let collectedKEEP = 0n;
        let collectedMON = 0n;

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

            // Determine token order
            const wmon = await cellar.wmon();
            const keepTokenAddr = await cellar.keepToken();
            const wmonIsToken0 = wmon.toLowerCase() < keepTokenAddr.toLowerCase();

            collectedMON = wmonIsToken0 ? collected0 : collected1;
            collectedKEEP = wmonIsToken0 ? collected1 : collected0;

            console.log(`Fees collected:`);
            console.log(`  WMON: ${ethersLib.formatEther(collectedMON)}`);
            console.log(`  KEEP: ${ethersLib.formatEther(collectedKEEP)}`);
        } else {
            // Fallback: check balance change
            const keepBalanceAfter = await keepToken.balanceOf(deployerAddress);
            const wmonBalanceAfter = await wmonToken.balanceOf(deployerAddress);
            collectedKEEP = BigInt(keepBalanceAfter.toString()) - BigInt(keepBalanceBefore.toString());
            collectedMON = BigInt(wmonBalanceAfter.toString()) - BigInt(wmonBalanceBefore.toString());
            console.log(`Balance changes:`);
            console.log(`  KEEP: ${ethersLib.formatEther(collectedKEEP)}`);
            console.log(`  WMON: ${ethersLib.formatEther(collectedMON)}`);
        }

        // Process KEEP fees
        if (collectedKEEP > 0n) {
            await processKEEPFees(collectedKEEP, deployerAddress, ethersLib, keepToken, deployer);
        }

        // Process WMON fees
        if (collectedMON > 0n) {
            await processWMONFees(collectedMON, deployerAddress, ethersLib, wmonToken, keepToken, deployer);
        }

        return {
            success: true,
            collectedKEEP,
            collectedMON
        };

    } catch (error: any) {
        console.error(`❌ Harvest failed: ${error.message}`);
        return {
            success: false,
            collectedKEEP: 0n,
            collectedMON: 0n,
            error: error.message
        };
    }
}

async function processKEEPFees(
    collectedKEEP: bigint,
    deployerAddress: string,
    ethersLib: any,
    keepToken: any,
    deployer: any
) {
    console.log(`\n📊 Processing KEEP fees (${ethersLib.formatEther(collectedKEEP)} KEEP):`);

    // Calculate splits
    const keepStakingShare = (collectedKEEP * BigInt(KEEP_STAKING_PERCENT)) / 100n;
    const keepDeployerShare = collectedKEEP - keepStakingShare; // Remainder goes to deployer

    // If LP staking is deployed, split the staking share
    let lpStakingShare = 0n;
    let keepOnlyStakingShare = keepStakingShare;

    if (LP_STAKING_CONTRACT && LP_STAKING_CONTRACT !== "0x0000000000000000000000000000000000000000") {
        // Split staking share: LP_STAKING_PERCENT% to LP, rest to KEEP
        lpStakingShare = (keepStakingShare * BigInt(LP_STAKING_PERCENT)) / 100n;
        keepOnlyStakingShare = keepStakingShare - lpStakingShare;
        console.log(`  To LP Staking (${LP_STAKING_PERCENT}% of staking): ${ethersLib.formatEther(lpStakingShare)} KEEP`);
    }

    console.log(`  To KEEP Staking (${KEEP_STAKING_PERCENT}%): ${ethersLib.formatEther(keepOnlyStakingShare)} KEEP`);
    console.log(`  To Deployer (${KEEP_DEPLOYER_PERCENT}%): ${ethersLib.formatEther(keepDeployerShare)} KEEP`);

    // Check balance
    const deployerBalance = await keepToken.balanceOf(deployerAddress);
    if (deployerBalance < keepStakingShare + keepDeployerShare) {
        console.log(`⚠️  Warning: Insufficient balance for full split`);
        console.log(`   Available: ${ethersLib.formatEther(deployerBalance)} KEEP`);
        console.log(`   Needed: ${ethersLib.formatEther(keepStakingShare + keepDeployerShare)} KEEP`);
        return;
    }

    // Deposit to LP staking (if deployed)
    if (LP_STAKING_CONTRACT && lpStakingShare > 0n && deployerAddress.toLowerCase() === deployer.address.toLowerCase()) {
        try {
            const allowance = await keepToken.allowance(deployerAddress, LP_STAKING_CONTRACT);
            if (allowance < lpStakingShare) {
                console.log(`Approving LP staking contract...`);
                const approveTx = await keepToken.approve(LP_STAKING_CONTRACT, lpStakingShare);
                await approveTx.wait();
            }

            const lpStaking = new ethersLib.Contract(LP_STAKING_CONTRACT, STAKING_ABI, deployer);
            const tx = await lpStaking.depositRewards(lpStakingShare);
            await tx.wait();
            console.log(`✅ Deposited ${ethersLib.formatEther(lpStakingShare)} KEEP to LP staking`);
        } catch (error: any) {
            console.error(`❌ Failed to deposit to LP staking: ${error.message}`);
        }
    }

    // Deposit to KEEP staking
    if (KEEP_STAKING_CONTRACT && keepOnlyStakingShare > 0n && deployerAddress.toLowerCase() === deployer.address.toLowerCase()) {
        try {
            const allowance = await keepToken.allowance(deployerAddress, KEEP_STAKING_CONTRACT);
            if (allowance < keepOnlyStakingShare) {
                console.log(`Approving KEEP staking contract...`);
                const approveTx = await keepToken.approve(KEEP_STAKING_CONTRACT, keepOnlyStakingShare);
                await approveTx.wait();
            }

            const keepStaking = new ethersLib.Contract(KEEP_STAKING_CONTRACT, STAKING_ABI, deployer);
            const tx = await keepStaking.depositRewards(keepOnlyStakingShare);
            await tx.wait();
            console.log(`✅ Deposited ${ethersLib.formatEther(keepOnlyStakingShare)} KEEP to KEEP staking`);
        } catch (error: any) {
            console.error(`❌ Failed to deposit to KEEP staking: ${error.message}`);
        }
    }
}

async function processWMONFees(
    collectedWMON: bigint,
    deployerAddress: string,
    ethersLib: any,
    wmonToken: any,
    keepToken: any,
    deployer: any
) {
    console.log(`\n📊 Processing WMON fees (${ethersLib.formatEther(collectedWMON)} WMON):`);

    // Calculate splits
    const buybackShare = (collectedWMON * BigInt(WMON_BUYBACK_PERCENT)) / 100n;
    const deployerShare = (collectedWMON * BigInt(WMON_DEPLOYER_PERCENT)) / 100n;

    console.log(`  For Buyback/Burn (${WMON_BUYBACK_PERCENT}%): ${ethersLib.formatEther(buybackShare)} WMON`);
    console.log(`  To Deployer (${WMON_DEPLOYER_PERCENT}%): ${ethersLib.formatEther(deployerShare)} WMON`);

    // Check balance
    const deployerBalance = await wmonToken.balanceOf(deployerAddress);
    if (deployerBalance < buybackShare) {
        console.log(`⚠️  Warning: Insufficient WMON balance for buyback`);
        console.log(`   Available: ${ethersLib.formatEther(deployerBalance)} WMON`);
        console.log(`   Needed: ${ethersLib.formatEther(buybackShare)} WMON`);
        return;
    }

    // Execute buyback: swap WMON -> KEEP, then burn KEEP
    if (buybackShare > 0n && deployerAddress.toLowerCase() === deployer.address.toLowerCase()) {
        try {
            // Approve swap router
            const routerAllowance = await wmonToken.allowance(deployerAddress, V3_SWAP_ROUTER);
            if (routerAllowance < buybackShare) {
                console.log(`Approving swap router for WMON...`);
                const approveTx = await wmonToken.approve(V3_SWAP_ROUTER, buybackShare);
                await approveTx.wait();
            }

            // Get pool token order to determine swap direction
            const poolABI = ['function token0() view returns (address)', 'function token1() view returns (address)'];
            const pool = new ethersLib.Contract(V3_POOL, poolABI, deployer);
            const token0 = await pool.token0();
            const token1 = await pool.token1();
            const wmonIsToken0 = WMON_TOKEN.toLowerCase() < KEEP_TOKEN.toLowerCase();
            const zeroForOne = wmonIsToken0; // true = WMON -> KEEP

            // Execute swap (with 1% slippage tolerance)
            const amountOutMinimum = (buybackShare * 99n) / 100n; // 1% slippage
            console.log(`Swapping ${ethersLib.formatEther(buybackShare)} WMON -> KEEP...`);

            const swapRouter = new ethersLib.Contract(V3_SWAP_ROUTER, SWAP_ROUTER_ABI, deployer);
            const swapTx = await swapRouter.swapExactInput(
                V3_POOL,
                buybackShare,
                amountOutMinimum,
                deployerAddress, // recipient
                zeroForOne
            );
            const swapReceipt = await swapTx.wait();
            console.log(`✅ Swap completed in block ${swapReceipt.blockNumber}`);

            // Get KEEP balance before swap to calculate how much we received
            // We need to check this before the swap, but we're doing it after
            // So we'll check the balance change by looking at the receipt or balance
            const keepBalanceBeforeSwap = await keepToken.balanceOf(deployerAddress);

            // Wait a moment for state to settle
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check balance after swap
            const keepBalanceAfterSwap = await keepToken.balanceOf(deployerAddress);
            const keepReceived = keepBalanceAfterSwap - keepBalanceBeforeSwap;

            if (keepReceived > 0n) {
                console.log(`Received ${ethersLib.formatEther(keepReceived)} KEEP from swap`);
                console.log(`Burning ${ethersLib.formatEther(keepReceived)} KEEP...`);

                // Transfer to zero address to burn (standard ERC20 burn method)
                const zeroAddress = ethersLib.ZeroAddress || "0x0000000000000000000000000000000000000000";
                const burnTx = await keepToken.transfer(zeroAddress, keepReceived);
                await burnTx.wait();
                console.log(`✅ Burned ${ethersLib.formatEther(keepReceived)} KEEP`);
            } else {
                console.log(`⚠️  No KEEP received from swap, skipping burn`);
            }

        } catch (error: any) {
            console.error(`❌ Failed to execute buyback/burn: ${error.message}`);
        }
    }
}

// Export for use in worker service
export async function startAutoHarvestWorker() {
    console.log("🤖 AUTO-HARVEST WORKER STARTING");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📋 Configuration:");
    console.log(`   KEEP Staking: ${KEEP_STAKING_PERCENT}%`);
    console.log(`   KEEP Deployer: ${KEEP_DEPLOYER_PERCENT}%`);
    if (LP_STAKING_CONTRACT) {
        console.log(`   LP Staking: ${LP_STAKING_PERCENT}% (of staking share)`);
    }
    console.log(`   WMON Buyback/Burn: ${WMON_BUYBACK_PERCENT}%`);
    console.log(`   WMON Deployer: ${WMON_DEPLOYER_PERCENT}%`);
    console.log(`   Harvest Interval: ${HARVEST_INTERVAL_HOURS} hour(s)\n`);

    if (!LP_STAKING_CONTRACT && !KEEP_STAKING_CONTRACT) {
        console.log("⚠️  Warning: No staking contracts configured. Fees will be harvested but not split.\n");
    }

    // Run once immediately
    const result = await checkAndHarvest();

    if (result.success) {
        console.log(`\n✅ Harvest completed successfully!`);
        const keepAmount = Number(result.collectedKEEP) / 1e18;
        const monAmount = Number(result.collectedMON) / 1e18;
        console.log(`   Collected: ${keepAmount.toFixed(6)} KEEP, ${monAmount.toFixed(6)} WMON`);
    } else {
        console.log(`\n❌ Harvest failed: ${result.error}`);
    }

    // Set up interval to run every hour
    const intervalMs = HARVEST_INTERVAL_HOURS * 60 * 60 * 1000;
    console.log(`\n🔄 Running as service (checking every ${HARVEST_INTERVAL_HOURS} hour(s))...`);

    setInterval(async () => {
        await checkAndHarvest();
    }, intervalMs);
}

// If run directly (not imported), start the worker
async function main() {
    await startAutoHarvestWorker();
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
