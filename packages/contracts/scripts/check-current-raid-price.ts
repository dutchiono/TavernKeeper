import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config({ path: "../../.env" });

const CELLAR_V3_PROXY = '0x32A920be00dfCE1105De0415ba1d4f06942E9ed0';

// ABI for TheCellarV3
const CELLAR_ABI = [
    'function getAuctionPrice() view returns (uint256)',
    'function slot0() view returns (uint8 locked, uint16 epochId, uint192 initPrice, uint40 startTime)',
    'function epochPeriod() view returns (uint256)',
    'function minInitPrice() view returns (uint256)',
    'function potBalanceMON() view returns (uint256)',
    'function potBalanceKEEP() view returns (uint256)',
];

async function main() {
    console.log("💰 CURRENT RAID PRICE CHECK\n");

    const [deployer] = await ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);

    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    const cellar = new ethers.Contract(CELLAR_V3_PROXY, CELLAR_ABI, deployer);

    // Get current auction state
    const slot0 = await cellar.slot0();
    const currentPrice = await cellar.getAuctionPrice();
    const epochPeriod = await cellar.epochPeriod();
    const minInitPrice = await cellar.minInitPrice();
    const potMON = await cellar.potBalanceMON();
    const potKEEP = await cellar.potBalanceKEEP();

    const currentTime = Math.floor(Date.now() / 1000);
    const timePassed = currentTime - Number(slot0.startTime);
    const timeRemaining = Number(epochPeriod) - timePassed;
    const timeRemainingMinutes = Math.floor(timeRemaining / 60);
    const timeRemainingSeconds = timeRemaining % 60;

    console.log("📊 CURRENT AUCTION STATE:");
    console.log(`   Epoch ID: ${slot0.epochId}`);
    console.log(`   Init Price: ${ethers.formatEther(slot0.initPrice)} CLP`);
    console.log(`   Start Time: ${slot0.startTime} (${new Date(Number(slot0.startTime) * 1000).toISOString()})`);
    console.log(`   Current Time: ${currentTime} (${new Date().toISOString()})`);
    console.log(`   Time Passed: ${Math.floor(timePassed / 60)}m ${timePassed % 60}s`);
    console.log(`   Time Remaining: ${timeRemainingMinutes}m ${timeRemainingSeconds}s`);
    console.log(`   Epoch Period: ${epochPeriod} seconds (${Number(epochPeriod) / 3600} hours)`);
    console.log(`   Min Init Price: ${ethers.formatEther(minInitPrice)} CLP\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💵 WHAT THEY'D PAY RIGHT NOW:");
    console.log(`   Minimum Required: ${ethers.formatEther(currentPrice)} CLP`);
    console.log(`   ⚠️  Note: They must pay AT LEAST this amount (can pay more if they want)`);
    console.log(`   The contract burns whatever amount they send (as long as >= minimum)`);

    const priceNum = parseFloat(ethers.formatEther(currentPrice));
    if (priceNum < 10) {
        console.log(`   ✅ GOOD: Minimum price is less than 10 CLP`);
    } else if (priceNum > 50) {
        console.log(`   ❌ BAD: Minimum price is more than 50 CLP`);
    } else {
        console.log(`   ⚠️  Minimum price is between 10-50 CLP`);
    }

    console.log(`\n🏆 WHAT THEY'D GET:`);
    console.log(`   MON Payout: ${ethers.formatEther(potMON)} MON`);
    console.log(`   KEEP Payout: ${ethers.formatEther(potKEEP)} KEEP`);

    const totalValueMON = parseFloat(ethers.formatEther(potMON));
    if (totalValueMON > 0) {
        console.log(`\n💡 Cost-Benefit:`);
        console.log(`   Cost: ${priceNum.toFixed(6)} CLP`);
        console.log(`   Reward: ${totalValueMON.toFixed(6)} MON`);
        const ratio = totalValueMON / priceNum;
        console.log(`   Ratio: ${ratio.toFixed(2)} MON per CLP`);
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log(`✅ Current raid price check complete!`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

