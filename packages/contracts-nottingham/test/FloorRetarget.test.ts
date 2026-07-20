import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const MIN_PRICE = ethers.parseEther("0.0001");
const MAX_FLOOR = ethers.parseEther("0.1");
const EPOCH = 3600;

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

async function take(office: any, who: any, value = ethers.parseEther("2")) {
    return office
        .connect(who)
        .takeOffice(0, ethers.MaxUint256, ethers.MaxUint256, "", { value });
}

/** Run `count` takeovers spaced `gapSeconds` apart. */
async function run(office: any, a: any, b: any, count: number, gapSeconds: number) {
    let t = await time.latest();
    for (let i = 0; i < count; i++) {
        t += gapSeconds;
        await time.setNextBlockTimestamp(t);
        await take(office, i % 2 === 0 ? a : b);
    }
}

describe("floor retargeting (FIX-12)", () => {
    describe("direction", () => {
        it("starts at the genesis floor", async () => {
            const { office } = await deploy();
            expect(await office.floorPrice()).to.equal(MIN_PRICE);
        });

        it("raises the floor when turnover beats the target", async () => {
            const { office, alice, bob } = await deploy();

            // Target is one takeover per epoch; ten minutes is six times faster.
            await run(office, alice, bob, 6, 600);

            expect(await office.floorPrice()).to.be.greaterThan(MIN_PRICE);
        });

        it("lowers the floor when turnover lags the target", async () => {
            const { office, alice, bob } = await deploy();

            await run(office, alice, bob, 8, 600);
            const raised = await office.floorPrice();
            expect(raised).to.be.greaterThan(MIN_PRICE);

            // Now a long quiet stretch: four hours per takeover.
            await run(office, alice, bob, 4, 4 * EPOCH);

            expect(await office.floorPrice()).to.be.lessThan(raised);
        });

        it("holds steady at exactly the target cadence", async () => {
            const { office, alice, bob } = await deploy();

            await run(office, alice, bob, 3, EPOCH);
            const settled = await office.floorPrice();

            await run(office, alice, bob, 3, EPOCH);
            expect(await office.floorPrice()).to.equal(settled);
        });
    });

    describe("bounds", () => {
        it("never falls below the genesis floor", async () => {
            const { office, alice, bob } = await deploy();

            // A dead market must stay accessible, not decay toward free.
            await run(office, alice, bob, 6, 12 * EPOCH);

            expect(await office.floorPrice()).to.equal(MIN_PRICE);
        });

        it("caps the floor so a frenzy cannot price the office into orbit", async () => {
            const { office, alice, bob } = await deploy();

            // 60 takeovers a minute apart - sustained, implausible pressure.
            await run(office, alice, bob, 60, 60);

            expect(await office.floorPrice()).to.equal(MAX_FLOOR);

            // FIX-13: the ask is banded to the floor, so nothing compounds past it.
            // Without that band the multiplier alone runs away at this cadence.
            const ceiling = (MAX_FLOOR * 40000n) / 10000n;
            expect(await office.getPrice()).to.be.lessThanOrEqual(ceiling);
            expect((await office.getSlot0()).initPrice).to.be.lessThanOrEqual(ceiling);
        });

        it("moves at most one step per takeover", async () => {
            const { office, alice, bob } = await deploy();
            await run(office, alice, bob, 2, EPOCH);

            const before = await office.floorPrice();

            // A single very fast takeover: proportionally this implies a 60x jump, but the
            // per-step clamp holds it to 1.25x so one outlier gap cannot reprice the game.
            await run(office, alice, bob, 1, 60);

            const after = await office.floorPrice();
            expect(after).to.be.lessThanOrEqual((before * 12500n) / 10000n);
        });
    });

    describe("revenue", () => {
        // The point of the mechanism: the levy scales with how contested the office is.
        // Before this, the ask sat at the floor at any pace slower than ~14 minutes, so a
        // thriving game earned exactly what a dead one did.
        it("earns the treasury more when the game is busier", async () => {
            const quiet = await deploy();
            const busy = await deploy();

            const quietBefore = await ethers.provider.getBalance(quiet.treasury.address);
            await run(quiet.office, quiet.alice, quiet.bob, 10, 2 * EPOCH);
            const quietEarned =
                (await ethers.provider.getBalance(quiet.treasury.address)) - quietBefore;

            const busyBefore = await ethers.provider.getBalance(busy.treasury.address);
            await run(busy.office, busy.alice, busy.bob, 10, 300);
            const busyEarned =
                (await ethers.provider.getBalance(busy.treasury.address)) - busyBefore;

            expect(busyEarned).to.be.greaterThan(quietEarned);
            // Same number of takeovers - the difference is purely the retargeted floor.
            expect(busyEarned).to.be.greaterThan(quietEarned * 2n);
        });

        it("still takes 30% of every sale", async () => {
            const { office, alice, bob, treasury, owner } = await deploy();
            await run(office, alice, bob, 5, 600);

            const treasuryBefore = await ethers.provider.getBalance(treasury.address);
            const ownerBefore = await ethers.provider.getBalance(owner.address);

            const tx = await take(office, alice);
            const receipt = await tx.wait();
            const log = receipt.logs
                .map((l: any) => {
                    try {
                        return office.interface.parseLog(l);
                    } catch {
                        return null;
                    }
                })
                .find((l: any) => l?.name === "OfficeTaken");
            const price = log.args.price;

            const coffers =
                (await ethers.provider.getBalance(treasury.address)) - treasuryBefore;
            const dev = (await ethers.provider.getBalance(owner.address)) - ownerBefore;

            expect(coffers).to.equal((price * 2500n) / 10000n);
            expect(dev).to.equal((price * 500n) / 10000n);
        });
    });
});
