/**
 * Auto-Harvest Worker
 *
 * Runs the auto-harvest script as a background worker.
 * Can be integrated into the existing worker service or run separately.
 */

import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const THE_CELLAR_V3 = process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const KEEP_TOKEN = process.env.KEEP_TOKEN || "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";
const KEEP_STAKING_CONTRACT = process.env.KEEP_STAKING_CONTRACT || "";
const HARVEST_INTERVAL_HOURS = parseInt(process.env.HARVEST_INTERVAL_HOURS || "1");

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

interface HarvestResult {
    success: boolean;
    collectedKEEP: bigint;
    collectedMON: bigint;
    error?: string;
}

async function checkAndHarvest(): Promise<HarvestResult> {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_MONAD_RPC_URL);
        const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY || "", provider);

        if (!process.env.DEPLOYER_PRIVATE_KEY) {
            return {
                success: false,
                collectedKEEP: 0n,
                collectedMON: 0n,
                error: "DEPLOYER_PRIVATE_KEY not set in environment"
            };
        }

        const network = await provider.getNetwork();
        console.log(`\n[${new Date().toISOString()}] Checking harvest status...`);
        console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
        console.log(`Deployer: ${deployer.address}`);

        const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);
        const keepToken = new ethers.Contract(KEEP_TOKEN, ERC20_ABI, deployer);

        // Check contract ownership
        const owner = await cellar.owner();
        const deployerAddress = await cellar.deployerAddress();
        const tokenId = await cellar.tokenId();

        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            return {
                success: false,
                collectedKEEP: 0n,
                collectedMON: 0n,
                error: `Not the owner. Deployer: ${deployer.address}, Owner: ${owner}`
            };
        }

        if (deployerAddress === ethers.ZeroAddress) {
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

        // Check deployer's KEEP balance before harvest
        const keepBalanceBefore = await keepToken.balanceOf(deployerAddress);
        console.log(`Deployer KEEP balance (before): ${ethers.formatEther(keepBalanceBefore)} KEEP`);

        // Execute harvest
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
            console.log(`  WMON: ${ethers.formatEther(collectedMON)}`);
            console.log(`  KEEP: ${ethers.formatEther(collectedKEEP)}`);
        } else {
            // Fallback: check balance change
            const keepBalanceAfter = await keepToken.balanceOf(deployerAddress);
            collectedKEEP = keepBalanceAfter - keepBalanceBefore;
            console.log(`KEEP balance change: ${ethers.formatEther(collectedKEEP)} KEEP`);
        }

        // Split fees: 90% to staking (all to KEEP staking for now), 10% stays with deployer
        if (collectedKEEP > 0n && KEEP_STAKING_CONTRACT) {
            await splitFeesToStaking(collectedKEEP, deployerAddress, deployer, keepToken);
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

async function splitFeesToStaking(
    collectedKEEP: bigint,
    deployerAddress: string,
    deployer: ethers.Wallet,
    keepToken: ethers.Contract
) {
    // Calculate 90% to staking (all to KEEP staking for now)
    const stakingShare = (collectedKEEP * 90n) / 100n; // 90%

    console.log(`\nSplitting fees to staking contract:`);
    console.log(`  Total collected: ${ethers.formatEther(collectedKEEP)} KEEP`);
    console.log(`  To KEEP Staking (90%): ${ethers.formatEther(stakingShare)} KEEP`);
    console.log(`  Remaining with deployer (10%): ${ethers.formatEther(collectedKEEP - stakingShare)} KEEP`);

    // Check if deployer has permission to transfer from deployerAddress
    const deployerBalance = await keepToken.balanceOf(deployerAddress);

    if (deployerBalance < stakingShare) {
        console.log(`⚠️  Warning: Deployer address has insufficient balance for full split`);
        console.log(`   Available: ${ethers.formatEther(deployerBalance)} KEEP`);
        console.log(`   Needed: ${ethers.formatEther(stakingShare)} KEEP`);
        return;
    }

    // Transfer to KEEP staking contract
    if (KEEP_STAKING_CONTRACT && stakingShare > 0n) {
        try {
            if (deployerAddress.toLowerCase() === deployer.address.toLowerCase()) {
                // Approve staking contract if needed
                const allowance = await keepToken.allowance(deployerAddress, KEEP_STAKING_CONTRACT);
                if (allowance < stakingShare) {
                    console.log(`Approving KEEP staking contract...`);
                    const approveTx = await keepToken.approve(KEEP_STAKING_CONTRACT, stakingShare);
                    await approveTx.wait();
                }

                const keepStaking = new ethers.Contract(KEEP_STAKING_CONTRACT, STAKING_ABI, deployer);
                const tx = await keepStaking.depositRewards(stakingShare);
                await tx.wait();
                console.log(`✅ Deposited ${ethers.formatEther(stakingShare)} KEEP to KEEP staking`);
            } else {
                console.log(`⚠️  Deployer address (${deployerAddress}) differs from signer (${deployer.address})`);
                console.log(`   Manual step required: Deployer address needs to approve and call depositRewards`);
            }
        } catch (error: any) {
            console.error(`❌ Failed to deposit to KEEP staking: ${error.message}`);
        }
    }
}

export async function startAutoHarvestWorker() {
    console.log("🤖 AUTO-HARVEST WORKER STARTING");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!KEEP_STAKING_CONTRACT) {
        console.log("⚠️  Warning: KEEP_STAKING_CONTRACT not configured. Fees will be harvested but not split.");
        console.log("   Set KEEP_STAKING_CONTRACT in .env to enable fee splitting.\n");
    }

    // Run once immediately
    const result = await checkAndHarvest();

    if (result.success) {
        console.log(`\n✅ Harvest completed successfully!`);
        console.log(`   Collected: ${ethers.formatEther(result.collectedKEEP)} KEEP`);
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

// If run directly, start the worker
if (require.main === module) {
    startAutoHarvestWorker().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

