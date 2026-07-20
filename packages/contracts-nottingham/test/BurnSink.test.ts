import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const MIN_PRICE = ethers.parseEther("0.0001");
const INITIAL_DPS = ethers.parseEther("0.5");
const EPOCH = 3600;
const ONE = 10n ** 18n;
const ACTIVATION = ethers.parseEther("250000");

async function deploy() {
    const [owner, alice, bob, treasury] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("NottToken");
    const token = await upgrades.deployProxy(Token, [treasury.address], { kind: "uups" });

    const Office = await ethers.getContractFactory("SheriffsOffice");
    const office = await upgrades.deployProxy(
        Office,
        [await token.getAddress(), treasury.address],
        { kind: "uups" }
    );
    await token.setSheriffsOffice(await office.getAddress());

    return { office, token, owner, alice, bob, treasury };
}

async function take(office: any, who: any, value = ethers.parseEther("1")) {
    return office
        .connect(who)
        .takeOffice(0, ethers.MaxUint256, ethers.MaxUint256, "", { value });
}

/**
 * Emission is slow by design, so reaching the activation threshold takes real time.
 * Two 30-day reigns mint ~264k NOTT, just over the 250k gate.
 */
async function growSupplyPastActivation(office: any, alice: any, bob: any) {
    await take(office, alice, MIN_PRICE);
    await time.increase(30 * 24 * 3600);
    await take(office, bob);
    await time.increase(30 * 24 * 3600);
    await take(office, alice);
}

describe("burn sink (FIX-10)", () => {
    describe("phase-in", () => {
        it("requires no burn at genesis", async () => {
            const { office, token } = await deploy();

            // At launch nobody holds NOTT. Requiring a burn immediately would make the
            // office unclaimable and the token unmintable - a deadlocked launch.
            expect(await token.totalSupply()).to.equal(0n);
            expect(await office.currentBurnRequirement()).to.equal(0n);
        });

        it("stays inactive below the activation supply", async () => {
            const { office, token, alice, bob } = await deploy();

            await take(office, alice, MIN_PRICE);
            await time.increase(30 * 24 * 3600);
            await take(office, bob);

            expect(await token.totalSupply()).to.be.lessThan(ACTIVATION);
            expect(await office.currentBurnRequirement()).to.equal(0n);
        });

        it("activates once supply crosses the threshold", async () => {
            const { office, token, alice, bob } = await deploy();
            await growSupplyPastActivation(office, alice, bob);

            expect(await token.totalSupply()).to.be.greaterThan(ACTIVATION);
            expect(await office.currentBurnRequirement()).to.be.greaterThan(0n);
        });
    });

    describe("requirement", () => {
        it("equals one epoch of emission at the current base rate", async () => {
            const { office, alice, bob } = await deploy();
            await growSupplyPastActivation(office, alice, bob);

            // dps * EPOCH - tracks the halving schedule with no oracle.
            const dps = await office.getDps();
            expect(await office.currentBurnRequirement()).to.equal(dps * BigInt(EPOCH));
            expect(await office.currentBurnRequirement()).to.equal(
                INITIAL_DPS * BigInt(EPOCH)
            );
        });

        it("is capped at 1% of supply so the office cannot price everyone out", async () => {
            const { office, token, alice, bob } = await deploy();
            await growSupplyPastActivation(office, alice, bob);

            const supply = await token.totalSupply();
            const cap = supply / 100n;
            const requirement = await office.currentBurnRequirement();

            expect(requirement).to.be.lessThanOrEqual(cap);
            // Without the cap, a supply collapse would freeze the office permanently -
            // the same brick as FIX-6, reached through economics instead of a revert.
            expect(requirement).to.be.lessThanOrEqual(supply);
        });
    });

    describe("burning", () => {
        it("burns from the taker and reduces total supply", async () => {
            const { office, token, alice, bob } = await deploy();
            await growSupplyPastActivation(office, alice, bob);

            const requirement = await office.currentBurnRequirement();
            const supplyBefore = await token.totalSupply();
            const bobBefore = await token.balanceOf(bob.address);

            await take(office, bob);

            expect(await token.balanceOf(bob.address)).to.equal(bobBefore - requirement);

            // Supply moved by (minted to the deposed sheriff) - (burned by the taker).
            const supplyAfter = await token.totalSupply();
            expect(supplyAfter).to.be.lessThan(supplyBefore + requirement);
        });

        it("emits BurnedForOffice", async () => {
            const { office, alice, bob } = await deploy();
            await growSupplyPastActivation(office, alice, bob);
            const requirement = await office.currentBurnRequirement();

            await expect(take(office, bob))
                .to.emit(office, "BurnedForOffice")
                .withArgs(bob.address, requirement);
        });

        it("rejects a taker who cannot cover the burn", async () => {
            const { office, alice, bob, owner } = await deploy();
            await growSupplyPastActivation(office, alice, bob);

            const requirement = await office.currentBurnRequirement();

            // `owner` has never held the office, so holds no NOTT.
            await expect(take(office, owner))
                .to.be.revertedWithCustomError(office, "InsufficientNott")
                .withArgs(requirement, 0n);
        });

        it("leaves the office untouched when the burn fails", async () => {
            const { office, alice, bob, owner } = await deploy();
            await growSupplyPastActivation(office, alice, bob);

            const before = await office.getSlot0();
            await expect(take(office, owner)).to.be.reverted;

            const after = await office.getSlot0();
            expect(after.sheriff).to.equal(before.sheriff);
            expect(after.epochId).to.equal(before.epochId);
        });
    });

    describe("equilibrium", () => {
        // The requirement is denominated so that one takeover per epoch is exactly
        // supply-neutral: the deposed sheriff earns dps*EPOCH, the taker burns dps*EPOCH.
        it("burns exactly what a full-epoch reign emits", async () => {
            const { office, alice, bob } = await deploy();
            await growSupplyPastActivation(office, alice, bob);

            const dps = await office.getDps();
            const requirement = await office.currentBurnRequirement();

            // Gross emission for a reign of exactly one epoch, before the 90/10 split.
            const fullEpochEmission = dps * BigInt(EPOCH);

            expect(requirement).to.equal(fullEpochEmission);
        });

        it("is net deflationary when turnover is faster than one epoch", async () => {
            const { office, token, alice, bob } = await deploy();
            await growSupplyPastActivation(office, alice, bob);

            const supplyBefore = await token.totalSupply();

            // Four takeovers at 15-minute intervals: each burns a full epoch's worth but
            // only emits a quarter of one.
            let t = await time.latest();
            for (let i = 0; i < 4; i++) {
                t += 900;
                await time.setNextBlockTimestamp(t);
                await take(office, i % 2 === 0 ? bob : alice);
            }

            expect(await token.totalSupply()).to.be.lessThan(supplyBefore);
        });
    });
});
