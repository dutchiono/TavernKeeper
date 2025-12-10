import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const TAVERN_KEEPER_PROXY = process.env.TAVERN_KEEPER_PROXY || "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS || "0xD515674a7fE63dFDfd43Fb5647E8B04eEfCEdCAa";

// Get action from environment variable or command line args
// Hardhat consumes some args, so we check both env var and remaining args
const ACTION = process.env.ACTION || process.argv.find(arg => ['pause', 'unpause', 'pause-and-transfer'].includes(arg)) || "pause";

const TAVERNKEEPER_ABI = [
    "function pause() external",
    "function unpause() external",
    "function paused() view returns (bool)",
    "function owner() view returns (address)",
    "function emergencyTransferToDeployer(string memory uri) external",
    "function pauseAndTransferToDeployer(string memory uri) external",
    "function getSlot0() view returns (tuple(uint8 locked, uint16 epochId, uint192 initPrice, uint40 startTime, uint256 dps, address miner, string uri))",
];

async function main() {
    const action = ACTION.toLowerCase();

    if (!["pause", "unpause", "pause-and-transfer"].includes(action)) {
        console.error("❌ Invalid action. Use 'pause', 'unpause', or 'pause-and-transfer'");
        process.exit(1);
    }

    console.log(`⏸️  ${action.toUpperCase().replace(/-/g, " ")} OFFICE\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Target Deployer Address: ${DEPLOYER_ADDRESS}\n`);

    const contract = new ethers.Contract(TAVERN_KEEPER_PROXY, TAVERNKEEPER_ABI, deployer);

    // Verify owner
    const owner = await contract.owner();
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error(`❌ Error: You are not the owner!`);
        console.error(`   Your address: ${deployer.address}`);
        console.error(`   Owner address: ${owner}`);
        process.exit(1);
    }

    // Get current state
    const slot0 = await contract.getSlot0();
    const isPaused = await contract.paused();

    console.log(`📋 Current State:`);
    console.log(`   Paused: ${isPaused ? "YES" : "NO"}`);
    console.log(`   Current Manager: ${slot0.miner}`);
    console.log(`   Epoch ID: ${slot0.epochId}\n`);

    // Handle pause-and-transfer
    if (action === "pause-and-transfer") {
        if (slot0.miner.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase()) {
            console.log(`⚠️  Deployer is already the manager!`);
            console.log(`   Just pausing...\n`);

            if (!isPaused) {
                const pauseTx = await contract.pause();
                console.log(`⏳ Pause transaction sent: ${pauseTx.hash}`);
                await pauseTx.wait();
                console.log(`✅ Office paused!\n`);
            } else {
                console.log(`⚠️  Office is already paused!\n`);
            }
            return;
        }

        console.log(`🚀 Pausing and transferring office to deployer (NO FEE)...\n`);
        try {
            const tx = await contract.pauseAndTransferToDeployer("Office paused - under deployer control");
            console.log(`⏳ Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Transaction confirmed!`);
            console.log(`   Block: ${receipt.blockNumber}\n`);

            // Verify new state
            const newSlot0 = await contract.getSlot0();
            const newPausedState = await contract.paused();

            console.log(`📋 New State:`);
            console.log(`   Paused: ${newPausedState ? "YES" : "NO"}`);
            console.log(`   New Manager: ${newSlot0.miner}`);
            console.log(`   Epoch ID: ${newSlot0.epochId}\n`);

            if (newSlot0.miner.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase()) {
                console.log(`✅ SUCCESS! Office is now:`);
                console.log(`   - PAUSED (no one can take it)`);
                console.log(`   - Under deployer control (${newSlot0.miner})`);
                console.log(`   - Previous manager received their KEEP rewards`);
            } else {
                console.error(`❌ ERROR: Manager is not the deployer!`);
                console.error(`   Expected: ${DEPLOYER_ADDRESS}`);
                console.error(`   Got: ${newSlot0.miner}`);
            }
        } catch (error: any) {
            console.error(`❌ Transaction failed!`);
            console.error(`   Error: ${error.message}`);
            if (error.reason) {
                console.error(`   Reason: ${error.reason}`);
            }
            process.exit(1);
        }
        return;
    }

    // Handle regular pause/unpause
    if (action === "pause" && isPaused) {
        console.log(`⚠️  Office is already paused!`);
        return;
    }

    if (action === "unpause" && !isPaused) {
        console.log(`⚠️  Office is already unpaused!`);
        return;
    }

    // Execute action
    console.log(`🚀 Executing ${action}...\n`);
    try {
        const tx = action === "pause"
            ? await contract.pause()
            : await contract.unpause();

        console.log(`⏳ Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed!`);
        console.log(`   Block: ${receipt.blockNumber}\n`);

        // Verify new state
        const newPausedState = await contract.paused();
        console.log(`📋 New State: ${newPausedState ? "PAUSED" : "UNPAUSED"}\n`);

        if (action === "pause") {
            console.log(`✅ Office is now PAUSED. No one can take the office until unpaused.`);
        } else {
            console.log(`✅ Office is now UNPAUSED. Normal operation resumed.`);
        }

    } catch (error: any) {
        console.error(`❌ Transaction failed!`);
        console.error(`   Error: ${error.message}`);
        if (error.reason) {
            console.error(`   Reason: ${error.reason}`);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

