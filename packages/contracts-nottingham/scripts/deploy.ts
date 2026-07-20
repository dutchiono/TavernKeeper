import { ethers, upgrades, network } from "hardhat";

const MAINNET_ID = 4663n;

async function main() {
    const [deployer] = await ethers.getSigners();
    const net = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`Network:  ${network.name} (chainId ${net.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance:  ${ethers.formatEther(balance)} ETH\n`);

    const isMainnet = net.chainId === MAINNET_ID;
    if (isMainnet) console.log("*** ROBINHOOD MAINNET ***\n");

    // Owner of the Coffers. Should be a multisig on mainnet - it controls the treasury
    // and, deliberately, is the only thing that can move liquidity.
    const coffersOwner = process.env.NOTTINGHAM_COFFERS_OWNER || deployer.address;
    if (isMainnet && coffersOwner === deployer.address) {
        throw new Error(
            "Set NOTTINGHAM_COFFERS_OWNER to a multisig before deploying to mainnet"
        );
    }
    console.log(`Coffers owner: ${coffersOwner}`);

    // 1. Token. Treasury is set to the deployer for a moment because Coffers needs the
    //    token address to exist first; corrected in step 3.
    const Token = await ethers.getContractFactory("NottToken");
    const token = await upgrades.deployProxy(Token, [deployer.address], { kind: "uups" });
    await token.waitForDeployment();
    const tokenAddr = await token.getAddress();
    console.log(`\nNottToken:      ${tokenAddr}`);

    // 2. Treasury.
    const Coffers = await ethers.getContractFactory("Coffers");
    const coffers = await Coffers.deploy(tokenAddr, coffersOwner);
    await coffers.waitForDeployment();
    const coffersAddr = await coffers.getAddress();
    console.log(`Coffers:        ${coffersAddr}`);

    // 3. Point the token's treasury at the Coffers.
    await (await token.setTreasury(coffersAddr)).wait();

    // 4. The office, paying its levy and emission slice into the Coffers.
    const Office = await ethers.getContractFactory("SheriffsOffice");
    const office = await upgrades.deployProxy(Office, [tokenAddr, coffersAddr], {
        kind: "uups",
    });
    await office.waitForDeployment();
    const officeAddr = await office.getAddress();
    console.log(`SheriffsOffice: ${officeAddr}`);

    // 5. Wire the office as the sole minter. Until this lands, nothing can mint.
    await (await token.setSheriffsOffice(officeAddr)).wait();

    const slot0 = await office.getSlot0();
    console.log(`\nMinter wired.`);
    console.log(`  Sheriff:  ${slot0.sheriff} (vacant - nothing accrues until first sale)`);
    console.log(`  Price:    ${ethers.formatEther(await office.getPrice())} ETH`);
    console.log(`  Emission: ${ethers.formatEther(await office.getDps())} NOTT/sec base`);

    console.log("\nVerify with:");
    for (const [name, addr] of [
        ["NottToken", tokenAddr],
        ["SheriffsOffice", officeAddr],
    ]) {
        console.log(`  npx hardhat verify --network ${network.name} ${addr}`);
    }
    console.log(
        `  npx hardhat verify --network ${network.name} ${coffersAddr} ${tokenAddr} ${coffersOwner}`
    );
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
