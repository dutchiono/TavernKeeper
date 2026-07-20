import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const MIN_PRICE = ethers.parseEther("0.0001");

async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("NottToken");
    const token = await upgrades.deployProxy(Token, [owner.address], { kind: "uups" });
    const tokenAddr = await token.getAddress();

    const Coffers = await ethers.getContractFactory("Coffers");
    const coffers = await Coffers.deploy(tokenAddr, owner.address);
    await coffers.waitForDeployment();
    const coffersAddr = await coffers.getAddress();

    const Office = await ethers.getContractFactory("SheriffsOffice");
    const office = await upgrades.deployProxy(Office, [tokenAddr, coffersAddr], {
        kind: "uups",
    });

    await token.setSheriffsOffice(await office.getAddress());
    await token.setTreasury(coffersAddr);

    return { office, token, coffers, coffersAddr, owner, alice, bob };
}

async function take(office: any, who: any, value: bigint) {
    return office
        .connect(who)
        .takeOffice(0, ethers.MaxUint256, ethers.MaxUint256, "", { value });
}

describe("Coffers", () => {
    describe("levy delivery", () => {
        // SheriffsOffice pays with a 30k gas stipend. If receive() were to exceed it the
        // levy would silently escrow to credits[] instead of arriving, and the treasury
        // would look empty while the protocol appeared to be working.
        it("receives the levy within the office's 30k gas stipend", async () => {
            const { office, coffers, coffersAddr, alice } = await deploy();

            await take(office, alice, MIN_PRICE);

            const [ethBalance] = await coffers.balances();
            expect(ethBalance).to.be.greaterThan(0n);

            // Nothing was escrowed, i.e. the direct send succeeded.
            expect(await office.credits(coffersAddr)).to.equal(0n);
            expect(await office.totalCredits()).to.equal(0n);
        });

        it("accrues both sides of the pair without a premine", async () => {
            const { office, coffers, alice, bob } = await deploy();

            await take(office, alice, MIN_PRICE);
            await time.increase(3600);
            await take(office, bob, ethers.parseEther("1"));

            const [ethBalance, nottBalance] = await coffers.balances();
            expect(ethBalance).to.be.greaterThan(0n);
            expect(nottBalance).to.be.greaterThan(0n);
        });
    });

    describe("liquidity path", () => {
        it("approves a spender for a held token", async () => {
            const { token, coffers, owner, bob } = await deploy();
            const positionManager = bob.address; // stand-in for a real position manager

            await coffers
                .connect(owner)
                .approveSpender(await token.getAddress(), positionManager, ethers.MaxUint256);

            expect(
                await token.allowance(await coffers.getAddress(), positionManager)
            ).to.equal(ethers.MaxUint256);
        });

        it("withdraws ETH and NOTT to the owner", async () => {
            const { office, token, coffers, owner, alice, bob } = await deploy();

            await take(office, alice, MIN_PRICE);
            await time.increase(3600);
            await take(office, bob, ethers.parseEther("1"));

            const [ethBalance, nottBalance] = await coffers.balances();

            await coffers.connect(owner).withdrawETH(bob.address, ethBalance);
            await coffers
                .connect(owner)
                .withdrawToken(await token.getAddress(), bob.address, nottBalance);

            const [ethAfter, nottAfter] = await coffers.balances();
            expect(ethAfter).to.equal(0n);
            expect(nottAfter).to.equal(0n);
            expect(await token.balanceOf(bob.address)).to.equal(nottBalance);
        });
    });

    describe("access control", () => {
        it("blocks non-owners from every privileged path", async () => {
            const { token, coffers, office, alice } = await deploy();
            const tokenAddr = await token.getAddress();

            await expect(
                coffers.connect(alice).withdrawETH(alice.address, 1n)
            ).to.be.revertedWithCustomError(coffers, "OwnableUnauthorizedAccount");

            await expect(
                coffers.connect(alice).withdrawToken(tokenAddr, alice.address, 1n)
            ).to.be.revertedWithCustomError(coffers, "OwnableUnauthorizedAccount");

            await expect(
                coffers.connect(alice).approveSpender(tokenAddr, alice.address, 1n)
            ).to.be.revertedWithCustomError(coffers, "OwnableUnauthorizedAccount");

            await expect(
                coffers.connect(alice).collectCredits(await office.getAddress())
            ).to.be.revertedWithCustomError(coffers, "OwnableUnauthorizedAccount");
        });

        it("rejects zero addresses", async () => {
            const { coffers, owner } = await deploy();

            await expect(
                coffers.connect(owner).withdrawETH(ethers.ZeroAddress, 1n)
            ).to.be.revertedWithCustomError(coffers, "ZeroAddress");
        });

        it("cannot withdraw more ETH than it holds", async () => {
            const { office, coffers, owner, alice } = await deploy();
            await take(office, alice, MIN_PRICE);

            const [ethBalance] = await coffers.balances();
            await expect(
                coffers.connect(owner).withdrawETH(owner.address, ethBalance + 1n)
            ).to.be.revertedWithCustomError(coffers, "NothingToWithdraw");
        });
    });
});
