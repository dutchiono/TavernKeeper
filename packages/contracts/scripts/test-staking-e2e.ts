import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: "../../.env" });

// Read addresses from addresses.ts
function getAddressesFromFile() {
    const possiblePaths = [
        path.join(__dirname, "../../../apps/web/lib/contracts/addresses.ts"),
        path.join(process.cwd(), "../../apps/web/lib/contracts/addresses.ts"),
        path.join(process.cwd(), "../../../apps/web/lib/contracts/addresses.ts"),
    ];

    for (const addressesPath of possiblePaths) {
        if (fs.existsSync(addressesPath)) {
            const content = fs.readFileSync(addressesPath, "utf-8");
            const chainId = parseInt(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || "143");
            const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === "true";

            let addressSet: any = {};
            let sectionContent = "";

            if (useLocalhost) {
                const localhostMatch = content.match(/export const LOCALHOST_ADDRESSES = \{([\s\S]*?)\};/);
                if (localhostMatch) sectionContent = localhostMatch[1];
            } else if (chainId === 143) {
                const mainnetMatch = content.match(/const MONAD_MAINNET_ADDRESSES = \{([\s\S]*?)\};/);
                if (mainnetMatch) sectionContent = mainnetMatch[1];
            } else {
                const testnetMatch = content.match(/const MONAD_TESTNET_ADDRESSES = \{([\s\S]*?)\};/);
                if (testnetMatch) sectionContent = testnetMatch[1];
            }

            if (sectionContent) {
                addressSet.KEEP_STAKING = extractAddress(sectionContent, "KEEP_STAKING");
                addressSet.THE_CELLAR = extractAddress(sectionContent, "THE_CELLAR");
                addressSet.KEEP_TOKEN = extractAddress(sectionContent, "KEEP_TOKEN");
            }

            return addressSet;
        }
    }
    return {};
}

function extractAddress(content: string, key: string): string {
    const regex = new RegExp(`${key}:\\s*['"](0x[a-fA-F0-9]{40})['"]`, "i");
    const match = content.match(regex);
    return match ? match[1] : "";
}

const addresses = getAddressesFromFile();
const KEEP_STAKING_CONTRACT = addresses.KEEP_STAKING || process.env.KEEP_STAKING_CONTRACT || "";
const THE_CELLAR_V3 = addresses.THE_CELLAR || process.env.THE_CELLAR_V3_PROXY || "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
const KEEP_TOKEN = addresses.KEEP_TOKEN || process.env.KEEP_TOKEN || "0x2D1094F5CED6ba279962f9676d32BE092AFbf82E";

const STAKING_ABI = [
    'function stake(uint256 amount, uint256 lockDays)',
    'function unstake(uint256 amount)',
    'function claimRewards()',
    'function getUserStake(address) view returns (tuple(uint256 amount, uint256 lockExpiry, uint256 lockMultiplier, uint256 rewardDebt))',
    'function getPendingRewards(address) view returns (uint256)',
    'function totalWeightedStake() view returns (uint256)',
    'function depositRewards(uint256 amount)',
];

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address, uint256) returns (bool)',
    'function allowance(address, address) view returns (uint256)',
    'function transfer(address, uint256) returns (bool)',
];

const CELLAR_ABI = [
    'function harvest()',
    'function deployerAddress() view returns (address)',
    'function owner() view returns (address)',
];

function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function main() {
    console.log("🧪 END-TO-END STAKING TEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!KEEP_STAKING_CONTRACT || KEEP_STAKING_CONTRACT === "0x0000000000000000000000000000000000000000") {
        console.error("❌ KEEP_STAKING_CONTRACT not configured!");
        process.exit(1);
    }

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`KEEP Staking: ${KEEP_STAKING_CONTRACT}\n`);

    const keepToken = new ethers.Contract(KEEP_TOKEN, ERC20_ABI, deployer);
    const staking = new ethers.Contract(KEEP_STAKING_CONTRACT, STAKING_ABI, deployer);
    const cellar = new ethers.Contract(THE_CELLAR_V3, CELLAR_ABI, deployer);

    // Check if deployer is owner of TheCellarV3
    const owner = await cellar.owner();
    const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
    console.log(`TheCellarV3 Owner: ${owner}`);
    console.log(`Is Deployer Owner: ${isOwner}\n`);

    // Step 1: Check initial balances
    console.log("📊 STEP 1: Checking initial state...");
    const initialKeepBalance = await keepToken.balanceOf(deployer.address);
    const initialStake = await staking.getUserStake(deployer.address);
    const initialPendingRewards = await staking.getPendingRewards(deployer.address);
    const initialTotalWeighted = await staking.totalWeightedStake();

    console.log(`   KEEP Balance: ${ethers.formatEther(initialKeepBalance)}`);
    console.log(`   Staked Amount: ${ethers.formatEther(initialStake.amount)}`);
    console.log(`   Pending Rewards: ${ethers.formatEther(initialPendingRewards)}`);
    console.log(`   Total Weighted Stake: ${ethers.formatEther(initialTotalWeighted)}\n`);

    // Step 2: Stake some KEEP
    const stakeAmount = ethers.parseEther("10"); // Stake 10 KEEP
    const lockDays = 0; // No lock for testing

    if (initialKeepBalance < stakeAmount) {
        console.error(`❌ Insufficient KEEP balance. Need ${ethers.formatEther(stakeAmount)}, have ${ethers.formatEther(initialKeepBalance)}`);
        process.exit(1);
    }

    console.log("📊 STEP 2: Staking KEEP...");
    console.log(`   Amount: ${ethers.formatEther(stakeAmount)} KEEP`);
    console.log(`   Lock Days: ${lockDays}\n`);

    // Approve if needed
    const allowance = await keepToken.allowance(deployer.address, KEEP_STAKING_CONTRACT);
    if (allowance < stakeAmount) {
        console.log("   Approving KEEP...");
        const approveTx = await keepToken.approve(KEEP_STAKING_CONTRACT, stakeAmount);
        await approveTx.wait();
        console.log("   ✅ Approved\n");
    }

    // Stake
    const stakeTx = await staking.stake(stakeAmount, lockDays);
    console.log(`   Transaction: ${stakeTx.hash}`);
    const stakeReceipt = await stakeTx.wait();
    console.log(`   ✅ Staked in block ${stakeReceipt.blockNumber}\n`);

    // Verify stake
    const afterStake = await staking.getUserStake(deployer.address);
    const afterStakeTotal = await staking.totalWeightedStake();
    console.log(`   New Staked Amount: ${ethers.formatEther(afterStake.amount)}`);
    console.log(`   New Total Weighted Stake: ${ethers.formatEther(afterStakeTotal)}\n`);

    if (afterStake.amount !== initialStake.amount + stakeAmount) {
        console.error("❌ Stake amount mismatch!");
        process.exit(1);
    }

    // Step 3: Wait a bit
    console.log("📊 STEP 3: Waiting 10 seconds...");
    await sleep(10);
    console.log("   ✅ Waited\n");

    // Step 4: Trigger auto-harvest (harvest + deposit rewards)
    console.log("📊 STEP 4: Triggering auto-harvest...");

    if (!isOwner) {
        console.log("   ⚠️  Deployer is not owner of TheCellarV3, skipping harvest");
        console.log("   ⚠️  You can manually deposit rewards to test reward distribution\n");
    } else {
        // Check deployer address balance before harvest
        const deployerAddress = await cellar.deployerAddress();
        const keepBalanceBeforeHarvest = await keepToken.balanceOf(deployerAddress);
        console.log(`   Deployer Address: ${deployerAddress}`);
        console.log(`   KEEP Balance (before): ${ethers.formatEther(keepBalanceBeforeHarvest)}\n`);

        // Harvest
        console.log("   Calling harvest()...");
        const harvestTx = await cellar.harvest();
        const harvestReceipt = await harvestTx.wait();
        console.log(`   ✅ Harvested in block ${harvestReceipt.blockNumber}`);

        // Check balance after harvest
        const keepBalanceAfterHarvest = await keepToken.balanceOf(deployerAddress);
        const collectedKEEP = keepBalanceAfterHarvest - keepBalanceBeforeHarvest;
        console.log(`   KEEP Balance (after): ${ethers.formatEther(keepBalanceAfterHarvest)}`);
        console.log(`   Collected: ${ethers.formatEther(collectedKEEP)} KEEP\n`);

        if (collectedKEEP > 0n) {
            // Calculate 90% for staking
            const stakingShare = (collectedKEEP * 90n) / 100n;
            console.log(`   Depositing ${ethers.formatEther(stakingShare)} KEEP (90%) to staking...`);

            // Approve staking contract
            const stakingAllowance = await keepToken.allowance(deployerAddress, KEEP_STAKING_CONTRACT);
            if (stakingAllowance < stakingShare) {
                console.log("   Approving staking contract...");
                const approveStakingTx = await keepToken.approve(KEEP_STAKING_CONTRACT, stakingShare);
                await approveStakingTx.wait();
            }

            // Deposit rewards
            const depositTx = await staking.depositRewards(stakingShare);
            const depositReceipt = await depositTx.wait();
            console.log(`   ✅ Deposited rewards in block ${depositReceipt.blockNumber}\n`);
        } else {
            console.log("   ⚠️  No KEEP collected from harvest\n");
        }
    }

    // Step 5: Wait and check rewards
    console.log("📊 STEP 5: Waiting 5 seconds, then checking rewards...");
    await sleep(5);

    const rewardsAfterHarvest = await staking.getPendingRewards(deployer.address);
    const totalWeightedAfterHarvest = await staking.totalWeightedStake();

    console.log(`   Pending Rewards: ${ethers.formatEther(rewardsAfterHarvest)}`);
    console.log(`   Total Weighted Stake: ${ethers.formatEther(totalWeightedAfterHarvest)}`);

    // Calculate expected rewards based on stake share
    if (totalWeightedAfterHarvest > 0n && afterStake.amount > 0n) {
        // User's weighted stake = amount * multiplier (1x for no lock)
        const userWeighted = afterStake.amount * afterStake.lockMultiplier / ethers.parseEther("1");
        const userShare = (userWeighted * 100n) / totalWeightedAfterHarvest;
        console.log(`   User's Weighted Stake: ${ethers.formatEther(userWeighted)}`);
        console.log(`   User's Share: ${userShare}% of total weighted stake`);
    }

    if (rewardsAfterHarvest > initialPendingRewards) {
        console.log(`   ✅ Rewards increased! (+${ethers.formatEther(rewardsAfterHarvest - initialPendingRewards)} KEEP)\n`);
    } else {
        console.log(`   ⚠️  No new rewards yet (may need more time or more harvests)\n`);
    }

    // Step 6: Wait again
    console.log("📊 STEP 6: Waiting 5 more seconds...");
    await sleep(5);
    console.log("   ✅ Waited\n");

    // Step 7: Unstake
    console.log("📊 STEP 7: Unstaking...");
    const unstakeAmount = stakeAmount; // Unstake what we staked

    // Check if locked
    const currentStake = await staking.getUserStake(deployer.address);
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    if (currentStake.lockExpiry > 0n && currentTime < currentStake.lockExpiry) {
        console.log(`   ⚠️  Still locked until ${new Date(Number(currentStake.lockExpiry) * 1000).toISOString()}`);
        console.log(`   ⚠️  Skipping unstake (would fail)\n`);
    } else {
        const unstakeTx = await staking.unstake(unstakeAmount);
        console.log(`   Transaction: ${unstakeTx.hash}`);
        const unstakeReceipt = await unstakeTx.wait();
        console.log(`   ✅ Unstaked in block ${unstakeReceipt.blockNumber}\n`);

        // Verify unstake
        const afterUnstake = await staking.getUserStake(deployer.address);
        const finalKeepBalance = await keepToken.balanceOf(deployer.address);
        const finalPendingRewards = await staking.getPendingRewards(deployer.address);

        console.log(`   Final Staked Amount: ${ethers.formatEther(afterUnstake.amount)}`);
        console.log(`   Final KEEP Balance: ${ethers.formatEther(finalKeepBalance)}`);
        console.log(`   Final Pending Rewards: ${ethers.formatEther(finalPendingRewards)}\n`);

        // Check if we can claim rewards
        if (finalPendingRewards > 0n) {
            console.log("📊 STEP 8: Claiming rewards...");
            const claimTx = await staking.claimRewards();
            const claimReceipt = await claimTx.wait();
            console.log(`   ✅ Claimed rewards in block ${claimReceipt.blockNumber}`);

            const balanceAfterClaim = await keepToken.balanceOf(deployer.address);
            const rewardsAfterClaim = await staking.getPendingRewards(deployer.address);
            console.log(`   KEEP Balance after claim: ${ethers.formatEther(balanceAfterClaim)}`);
            console.log(`   Pending Rewards after claim: ${ethers.formatEther(rewardsAfterClaim)}`);
            console.log(`   Rewards received: ${ethers.formatEther(balanceAfterClaim - finalKeepBalance)}\n`);
        }
    }

    console.log("=".repeat(60));
    console.log("✅ END-TO-END TEST COMPLETE!");
    console.log("=".repeat(60) + "\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

