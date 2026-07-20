import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const MIN_PRICE = ethers.parseEther("0.0001");
const INITIAL_DPS = ethers.parseEther("4");
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

// Convenience: take the office with permissive guards. The deadline is unbounded so
// tests that jump the clock with setNextBlockTimestamp do not trip Expired().
async function take(office: any, who: any, value: bigint, proclamation = "") {
    return office
        .connect(who)
        .takeOffice(0, ethers.MaxUint256, ethers.MaxUint256, proclamation, { value });
}

// The price decays every second, so the amount actually charged is only knowable
// after the fact. Read it off the OfficeTaken event rather than a prior getPrice().
async function pricePaid(office: any, tx: any): Promise<bigint> {
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
    return log.args.price;
}

describe("SheriffsOffice", () => {
    describe("deployment", () => {
        it("opens at the floor price with the deployer holding office", async () => {
            const { office, owner } = await deploy();
            const s = await office.getSlot0();

            expect(s.sheriff).to.equal(owner.address);
            expect(s.epochId).to.equal(1);
            expect(await office.getPrice()).to.equal(MIN_PRICE);
            expect(await office.getDps()).to.equal(INITIAL_DPS);
        });

        it("mints only via the office", async () => {
            const { token, alice } = await deploy();
            await expect(
                token.connect(alice).mint(alice.address, 1n)
            ).to.be.revertedWith("NOTT: caller is not the Sheriff's Office");
        });
    });

    describe("dutch auction", () => {
        it("decays linearly to the floor across the epoch", async () => {
            const { office, alice } = await deploy();

            // Seize at the floor, which resets the ask to 2x.
            await take(office, alice, MIN_PRICE);
            const start = await time.latest();
            const initPrice = MIN_PRICE * 2n;
            expect(await office.getPrice()).to.be.closeTo(initPrice, initPrice / 100n);

            // Halfway through the epoch the ask is ~half of init.
            await time.setNextBlockTimestamp(start + EPOCH / 2);
            await ethers.provider.send("evm_mine", []);
            expect(await office.getPrice()).to.be.closeTo(initPrice / 2n, initPrice / 100n);

            // Past the epoch it rests at the floor.
            await time.setNextBlockTimestamp(start + EPOCH + 1);
            await ethers.provider.send("evm_mine", []);
            expect(await office.getPrice()).to.equal(MIN_PRICE);
        });

        it("rejects a stale epochId", async () => {
            const { office, alice, bob } = await deploy();
            await take(office, alice, MIN_PRICE);

            const deadline = (await time.latest()) + 600;
            await expect(
                office.connect(bob).takeOffice(1, deadline, ethers.MaxUint256, "", {
                    value: ethers.parseEther("1"),
                })
            ).to.be.revertedWithCustomError(office, "EpochIdMismatch");
        });

        it("refunds overpayment", async () => {
            const { office, alice } = await deploy();
            const overpay = ethers.parseEther("0.5");

            const before = await ethers.provider.getBalance(alice.address);
            const tx = await take(office, alice, overpay);
            const receipt = await tx.wait();
            const gas = receipt!.gasUsed * receipt!.gasPrice;
            const after = await ethers.provider.getBalance(alice.address);

            // Only the floor price plus gas should have left the account.
            expect(before - after - gas).to.equal(MIN_PRICE);
        });
    });

    describe("fee split", () => {
        it("pays the deposed sheriff 80% and taxes 20%", async () => {
            const { office, owner, alice, bob, treasury } = await deploy();

            // Alice takes it first so there is a non-owner sheriff to depose.
            await take(office, alice, MIN_PRICE);

            const aliceBefore = await ethers.provider.getBalance(alice.address);
            const treasuryBefore = await ethers.provider.getBalance(treasury.address);
            const ownerBefore = await ethers.provider.getBalance(owner.address);

            const tx = await take(office, bob, ethers.parseEther("1"));
            const price = await pricePaid(office, tx);

            const tax = (price * 2000n) / 10000n;
            const devCut = tax / 4n;
            const coffers = tax - devCut;

            expect(await ethers.provider.getBalance(alice.address)).to.equal(
                aliceBefore + (price - tax)
            );
            expect(await ethers.provider.getBalance(treasury.address)).to.equal(
                treasuryBefore + coffers
            );
            expect(await ethers.provider.getBalance(owner.address)).to.equal(
                ownerBefore + devCut
            );
        });
    });

    describe("accrual", () => {
        it("pays the deposed sheriff for the full reign", async () => {
            const { office, token, alice, bob } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            await time.setNextBlockTimestamp(start + 3600);
            await take(office, bob, ethers.parseEther("1"));

            expect(await token.balanceOf(alice.address)).to.equal(INITIAL_DPS * 3600n);
        });

        it("lets the sitting sheriff claim mid-reign", async () => {
            const { office, token, alice } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            await time.setNextBlockTimestamp(start + 1800);
            await office.connect(alice).claimRewards();

            expect(await token.balanceOf(alice.address)).to.equal(INITIAL_DPS * 1800n);
        });

        it("blocks non-sheriffs from claiming", async () => {
            const { office, alice, bob } = await deploy();
            await take(office, alice, MIN_PRICE);

            await expect(
                office.connect(bob).claimRewards()
            ).to.be.revertedWithCustomError(office, "NotSheriff");
        });

        // REGRESSION (FIX-2): the Monad contract computed takeOffice()'s payout from
        // slot0.startTime while claimOfficeRewards() computed from officeLastClaimTime,
        // so a sheriff who claimed mid-reign was paid twice for the claimed window.
        // Under the original logic this reign yields 5400s of emission for 3600s held.
        it("does not pay twice for a window already claimed", async () => {
            const { office, token, alice, bob } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            // Claim halfway through.
            await time.setNextBlockTimestamp(start + 1800);
            await office.connect(alice).claimRewards();
            expect(await token.balanceOf(alice.address)).to.equal(INITIAL_DPS * 1800n);

            // Deposed at the hour: only the unclaimed second half is owed.
            await time.setNextBlockTimestamp(start + 3600);
            await take(office, bob, ethers.parseEther("1"));

            expect(await token.balanceOf(alice.address)).to.equal(INITIAL_DPS * 3600n);
        });

        it("does not carry a previous sheriff's claim time into a new reign", async () => {
            const { office, token, alice, bob } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            await time.setNextBlockTimestamp(start + 1800);
            await office.connect(alice).claimRewards();

            await time.setNextBlockTimestamp(start + 2000);
            await take(office, bob, ethers.parseEther("1"));
            const bobStart = await time.latest();

            await time.setNextBlockTimestamp(bobStart + 600);
            await ethers.provider.send("evm_mine", []);

            // Bob accrues from his own start, not from Alice's stale lastClaimTime.
            expect(await office.pendingRewards()).to.equal(INITIAL_DPS * 600n);
            expect(await token.balanceOf(bob.address)).to.equal(0n);
        });
    });

    describe("emission schedule", () => {
        it("halves every 30 days down to the tail", async () => {
            const { office, alice } = await deploy();

            await time.increase(30 * 24 * 3600);
            await take(office, alice, ethers.parseEther("1"));
            expect(await office.getDps()).to.equal(INITIAL_DPS / 2n);

            await time.increase(30 * 24 * 3600);
            await take(office, alice, ethers.parseEther("1"));
            expect(await office.getDps()).to.equal(INITIAL_DPS / 4n);
        });

        it("never emits below the tail rate", async () => {
            const { office, alice } = await deploy();

            // Far past the point where halving would round to zero.
            await time.increase(30 * 24 * 3600 * 40);
            await take(office, alice, ethers.parseEther("1"));

            expect(await office.getDps()).to.equal(ethers.parseEther("0.01"));
        });
    });

    describe("proclamation", () => {
        it("stores the sheriff's message", async () => {
            const { office, alice } = await deploy();
            await take(office, alice, MIN_PRICE, "the tax is doubled");

            const state = await office.officeState();
            expect(state.proclamation).to.equal("the tax is doubled");
        });

        it("rejects an oversized message", async () => {
            const { office, alice } = await deploy();
            await expect(
                take(office, alice, MIN_PRICE, "x".repeat(257))
            ).to.be.revertedWithCustomError(office, "ProclamationTooLong");
        });
    });
});
