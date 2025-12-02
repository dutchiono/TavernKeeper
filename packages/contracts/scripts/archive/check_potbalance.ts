import { ethers } from "hardhat";

async function main() {
    console.log("=== CHECKING CELLAR POT BALANCE ===\n");

    const cellarHookProxy = "0x297434683Feb6F7ca16Ab4947eDf547e2c67dB44";
    const TavernKeeperProxy = "0x311d8722A5cE11DF157D7a9d414bbeC2640c5Fb2";

    const CellarHook = await ethers.getContractFactory("CellarHook");
    const newHook = CellarHook.attach(cellarHookProxy);

    console.log("--- New CellarHook Proxy ---");
    const potBalance = await newHook.potBalance();
    const nativeBalance = await ethers.provider.getBalance(cellarHookProxy);
    const slot0 = await newHook.slot0();

    console.log("Address:", cellarHookProxy);
    console.log("potBalance (state):", ethers.formatEther(potBalance), "MON");
    console.log("Native Balance:", ethers.formatEther(nativeBalance), "MON");
    console.log("epochId:", slot0.epochId.toString());
    console.log("initPrice:", ethers.formatEther(slot0.initPrice), "MON");

    if (potBalance.toString() !== nativeBalance.toString()) {
        console.log("\n⚠️  WARNING: potBalance != native balance!");
        console.log("   Difference:", ethers.formatEther(nativeBalance - potBalance), "MON");
    } else {
        console.log("\n✓ potBalance matches native balance");
    }

    console.log("\n--- TavernKeeper Treasury ---");
    const TavernKeeper = await ethers.getContractFactory("TavernKeeper");
    const tavernKeeper = TavernKeeper.attach(TavernKeeperProxy);
    const treasury = await tavernKeeper.treasury();
    console.log("Treasury Address:", treasury);
    console.log("Expected:", cellarHookProxy);
    console.log("Match:", treasury.toLowerCase() === cellarHookProxy.toLowerCase() ? "✅ YES" : "❌ NO");
}

main().catch(console.error);
