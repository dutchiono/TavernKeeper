import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function main() {
    console.log("🔍 CHECKING TREASURY CONFIGURATION...\n");

    const TK = "0x56B81A60Ae343342685911bd97D1331fF4fa2d29";
    const CellarV3 = "0x32A920be00dfCE1105De0415ba1d4f06942E9ed0";
    const OldCellar = "0xe71CAf7162dd81a4A9C0c6BD25ED02C26F492DC0";

    const tk = await ethers.getContractAt("TavernKeeper", TK);
    const treasury = await tk.treasury();

    console.log(`TavernKeeper: ${TK}`);
    console.log(`Current Treasury: ${treasury}`);
    console.log(`TheCellarV3: ${CellarV3}`);
    console.log(`Old CellarHook: ${OldCellar}\n`);

    if (treasury.toLowerCase() === CellarV3.toLowerCase()) {
        console.log("✅ Treasury is set to TheCellarV3!");
    } else if (treasury.toLowerCase() === OldCellar.toLowerCase()) {
        console.log("❌ PROBLEM: Treasury is set to OLD CellarHook!");
        console.log("   Office fees are going to the old contract!");
    } else {
        console.log(`⚠️  Treasury is set to unknown address: ${treasury}`);
    }
}

main().catch(console.error);

