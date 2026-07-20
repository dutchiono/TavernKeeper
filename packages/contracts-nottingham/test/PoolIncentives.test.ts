import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const MIN_PRICE = ethers.parseEther("0.0001");
const INITIAL_DPS = ethers.parseEther("0.5");
const ONE = 10n ** 18n;

async function deploy() {
    const [owner, alice, bob, treasury, poolA, poolB] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("NottToken");
    const token = await upgrades.deployProxy(Token, [treasury.address], { kind: "uups" });

    const Office = await ethers.getContractFactory("SheriffsOffice");
    const office = await upgrades.deployProxy(
        Office,
        [await token.getAddress(), treasury.address],
        { kind: "uups" }
    );
    await token.setSheriffsOffice(await office.getAddress());

    return { office, token, owner, alice, bob, treasury, poolA, poolB };
}

async function take(office: any, who: any, value = ethers.parseEther("1")) {
    return office
        .connect(who)
        .takeOffice(0, ethers.MaxUint256, ethers.MaxUint256, "", { value });
}

describe("pool incentives (FIX-11)", () => {
    describe("eligibility", () => {
        it("lets only the owner curate the pool list", async () => {
            const { office, alice, poolA } = await deploy();

            await expect(
                office.connect(alice).setPoolEligibility(poolA.address, true)
            ).to.be.revertedWithCustomError(office, "OwnableUnauthorizedAccount");

            await expect(office.setPoolEligibility(poolA.address, true))
                .to.emit(office, "PoolEligibilityChanged")
                .withArgs(poolA.address, true);

            expect(await office.eligiblePools(poolA.address)).to.be.true;
        });

        // Without curation the sheriff could name their own wallet and mint to themselves
        // for the floor price - the cheapest governance capture available.
        it("refuses a pool the owner has not approved", async () => {
            const { office, alice, poolA } = await deploy();
            await take(office, alice, MIN_PRICE);

            await expect(office.connect(alice).setFavoredPool(alice.address))
                .to.be.revertedWithCustomError(office, "PoolNotEligible")
                .withArgs(alice.address);

            await expect(office.connect(alice).setFavoredPool(poolA.address))
                .to.be.revertedWithCustomError(office, "PoolNotEligible")
                .withArgs(poolA.address);
        });

        it("lets only the sitting sheriff direct the slice", async () => {
            const { office, alice, bob, poolA } = await deploy();
            await office.setPoolEligibility(poolA.address, true);
            await take(office, alice, MIN_PRICE);

            await expect(
                office.connect(bob).setFavoredPool(poolA.address)
            ).to.be.revertedWithCustomError(office, "NotSheriff");

            await expect(office.connect(alice).setFavoredPool(poolA.address))
                .to.emit(office, "FavoredPoolSet")
                .withArgs(alice.address, poolA.address);
        });
    });

    describe("routing", () => {
        it("sends the directed slice to the favored pool", async () => {
            const { office, token, alice, bob, poolA } = await deploy();
            await office.setPoolEligibility(poolA.address, true);

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();
            await office.connect(alice).setFavoredPool(poolA.address);

            await time.setNextBlockTimestamp(start + 3600);
            await take(office, bob);

            const owed = INITIAL_DPS * 3600n;
            const slice = (owed * 1000n) / 10000n;

            expect(await token.balanceOf(poolA.address)).to.equal(slice);
            expect(await token.balanceOf(alice.address)).to.equal(owed - slice - slice);
        });

        it("falls through to the Coffers when undirected", async () => {
            const { office, token, alice, bob, treasury } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            await time.setNextBlockTimestamp(start + 3600);
            await take(office, bob);

            const owed = INITIAL_DPS * 3600n;
            // Coffers take their own 10% plus the undirected 10%.
            expect(await token.balanceOf(treasury.address)).to.equal(
                ((owed * 1000n) / 10000n) * 2n
            );
        });

        it("stops paying a pool revoked mid-reign", async () => {
            const { office, token, alice, bob, poolA } = await deploy();
            await office.setPoolEligibility(poolA.address, true);

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();
            await office.connect(alice).setFavoredPool(poolA.address);

            // Revoked before any emission is settled: eligibility is re-checked at mint
            // time, so the pool must earn nothing rather than paying out until takeover.
            await office.setPoolEligibility(poolA.address, false);

            await time.setNextBlockTimestamp(start + 3600);
            await take(office, bob);

            expect(await token.balanceOf(poolA.address)).to.equal(0n);
        });

        it("clears the pick on takeover so each sheriff chooses their own", async () => {
            const { office, token, alice, bob, poolA } = await deploy();
            await office.setPoolEligibility(poolA.address, true);

            await take(office, alice, MIN_PRICE);
            await office.connect(alice).setFavoredPool(poolA.address);
            expect(await office.favoredPool()).to.equal(poolA.address);

            await time.increase(3600);
            await take(office, bob);
            expect(await office.favoredPool()).to.equal(ethers.ZeroAddress);

            // Bob's reign must not keep funding Alice's pick.
            const poolBefore = await token.balanceOf(poolA.address);
            await time.increase(3600);
            await take(office, alice);
            expect(await token.balanceOf(poolA.address)).to.equal(poolBefore);
        });

        it("routes on mid-reign claims too", async () => {
            const { office, token, alice, poolA } = await deploy();
            await office.setPoolEligibility(poolA.address, true);

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();
            await office.connect(alice).setFavoredPool(poolA.address);

            await time.setNextBlockTimestamp(start + 1800);
            await office.connect(alice).claimRewards();

            const owed = INITIAL_DPS * 1800n;
            expect(await token.balanceOf(poolA.address)).to.equal((owed * 1000n) / 10000n);
        });
    });

    describe("exposure", () => {
        it("never risks treasury capital on the pick", async () => {
            const { office, token, alice, bob, treasury, poolA } = await deploy();
            await office.setPoolEligibility(poolA.address, true);

            const ethBefore = await ethers.provider.getBalance(treasury.address);
            const nottBefore = await token.balanceOf(treasury.address);

            await take(office, alice, MIN_PRICE);
            await office.connect(alice).setFavoredPool(poolA.address);
            await time.increase(3600);
            await take(office, bob);

            // Directing incentives spends capped emission only. The Coffers still gain on
            // both legs - the sheriff cannot move treasury funds by choosing a pool.
            expect(await ethers.provider.getBalance(treasury.address)).to.be.greaterThan(
                ethBefore
            );
            expect(await token.balanceOf(treasury.address)).to.be.greaterThan(nottBefore);
        });

        it("caps the sheriff's reach at the directed slice", async () => {
            const { office, token, alice, bob, poolA } = await deploy();
            await office.setPoolEligibility(poolA.address, true);

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();
            await office.connect(alice).setFavoredPool(poolA.address);

            await time.setNextBlockTimestamp(start + 3600);
            await take(office, bob);

            const supply = await token.totalSupply();
            const directed = await token.balanceOf(poolA.address);

            // 10% of emission, never more, whatever the sheriff does.
            expect((directed * 10000n) / supply).to.equal(1000n);
        });
    });
});
