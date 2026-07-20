import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const MIN_PRICE = ethers.parseEther("0.0001");
const EPOCH = 3600;
const INITIAL_DPS = ethers.parseEther("0.5");
const ONE = 10n ** 18n;

// Mirrors the contract's decay curve: 100/50/25/12.5% then a 10% floor.
function decayMultiplier(epoch: number): bigint {
    return epoch >= 4 ? ONE / 10n : ONE >> BigInt(epoch);
}

// Decay-weighted seconds `x` into a reign, 1e18-scaled.
function weightedSeconds(x: number): bigint {
    const epoch = Math.floor(x / EPOCH);
    const remainder = BigInt(x % EPOCH);
    let w = 0n;
    for (let i = 0; i < Math.min(epoch, 4); i++) w += BigInt(EPOCH) * decayMultiplier(i);
    if (epoch > 4) w += BigInt(epoch - 4) * BigInt(EPOCH) * decayMultiplier(4);
    return w + remainder * decayMultiplier(epoch);
}

// Emission splits 80% sheriff / 10% Coffers / 10% the sheriff's favored pool.
// With no favored pool set, the directed slice falls through to the Coffers.
function slice(owed: bigint): bigint {
    return (owed * 1000n) / 10000n;
}
function toSheriff(owed: bigint): bigint {
    return owed - slice(owed) - slice(owed);
}
function toCoffers(owed: bigint): bigint {
    return slice(owed) + slice(owed); // undirected
}
function toPool(owed: bigint): bigint {
    return slice(owed);
}

// NOTT accrued between two offsets into a reign.
function accrued(fromSec: number, toSec: number, dps: bigint = INITIAL_DPS): bigint {
    return ((weightedSeconds(toSec) - weightedSeconds(fromSec)) * dps) / ONE;
}

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
        it("opens vacant at the floor price", async () => {
            const { office } = await deploy();
            const s = await office.getSlot0();

            expect(s.sheriff).to.equal(ethers.ZeroAddress);
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
        it("decays linearly toward the floor across the epoch", async () => {
            const { office, alice, bob } = await deploy();

            // Push the ask well above the floor first. At 1.3x a single takeover from the
            // floor lands only 30% above it, so the price would clamp within ~14 minutes
            // and there would be no decay left to measure. Five rapid takeovers give a
            // real spread to observe.
            let last = await time.latest();
            for (let i = 0; i < 5; i++) {
                last += 1;
                await time.setNextBlockTimestamp(last);
                await take(office, i % 2 === 0 ? alice : bob, ethers.parseEther("1"));
            }

            const s = await office.getSlot0();
            const initPrice = s.initPrice;
            const start = Number(s.startTime);
            expect(initPrice).to.be.greaterThan(MIN_PRICE * 3n);

            // A quarter in, the ask has shed a quarter of its starting value.
            await time.setNextBlockTimestamp(start + EPOCH / 4);
            await ethers.provider.send("evm_mine", []);
            expect(await office.getPrice()).to.be.closeTo(
                (initPrice * 3n) / 4n,
                initPrice / 100n
            );

            // Halfway.
            await time.setNextBlockTimestamp(start + EPOCH / 2);
            await ethers.provider.send("evm_mine", []);
            expect(await office.getPrice()).to.be.closeTo(initPrice / 2n, initPrice / 100n);

            // Past the epoch it rests at the floor.
            await time.setNextBlockTimestamp(start + EPOCH + 1);
            await ethers.provider.send("evm_mine", []);
            expect(await office.getPrice()).to.equal(MIN_PRICE);
        });

        it("clamps to the floor rather than going below it", async () => {
            const { office, alice } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            // 1.3x above the floor decays into the clamp roughly 14 minutes in.
            await time.setNextBlockTimestamp(start + 20 * 60);
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
        it("pays the deposed sheriff 70%, Coffers 25%, dev 5%", async () => {
            const { office, owner, alice, bob, treasury } = await deploy();

            // Alice takes it first so there is a non-owner sheriff to depose.
            await take(office, alice, MIN_PRICE);

            const aliceBefore = await ethers.provider.getBalance(alice.address);
            const treasuryBefore = await ethers.provider.getBalance(treasury.address);
            const ownerBefore = await ethers.provider.getBalance(owner.address);

            const tx = await take(office, bob, ethers.parseEther("1"));
            const price = await pricePaid(office, tx);

            const devCut = (price * 500n) / 10000n;
            const coffers = (price * 2500n) / 10000n;

            expect(await ethers.provider.getBalance(alice.address)).to.equal(
                aliceBefore + (price - devCut - coffers)
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

            expect(await token.balanceOf(alice.address)).to.equal(toSheriff(accrued(0, 3600)));
        });

        it("lets the sitting sheriff claim mid-reign", async () => {
            const { office, token, alice } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            await time.setNextBlockTimestamp(start + 1800);
            await office.connect(alice).claimRewards();

            expect(await token.balanceOf(alice.address)).to.equal(toSheriff(accrued(0, 1800)));
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
            expect(await token.balanceOf(alice.address)).to.equal(toSheriff(accrued(0, 1800)));

            // Deposed at the hour: only the unclaimed second half is owed.
            await time.setNextBlockTimestamp(start + 3600);
            await take(office, bob, ethers.parseEther("1"));

            expect(await token.balanceOf(alice.address)).to.equal(
                toSheriff(accrued(0, 1800)) + toSheriff(accrued(1800, 3600))
            );
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
            expect(await office.pendingRewards()).to.equal(accrued(0, 600));  // gross, pre-split
            expect(await token.balanceOf(bob.address)).to.equal(0n);
        });
    });

    describe("unpayable sheriff (FIX-6)", () => {
        async function seizeWithHostile(office: any, alice: any) {
            const Hostile = await ethers.getContractFactory("HostileReceiver");
            const hostile = await Hostile.deploy();
            await hostile.waitForDeployment();

            // Funded through the payable call itself: receive() rejects by design.
            await hostile
                .connect(alice)
                .seize(await office.getAddress(), MIN_PRICE, { value: MIN_PRICE });
            return hostile;
        }

        it("cannot brick the office by refusing payment", async () => {
            const { office, alice, bob } = await deploy();
            const hostile = await seizeWithHostile(office, alice);

            expect((await office.getSlot0()).sheriff).to.equal(await hostile.getAddress());

            // The griefer rejects ETH, but deposing them must still succeed.
            await expect(take(office, bob, ethers.parseEther("1"))).to.not.be.reverted;
            expect((await office.getSlot0()).sheriff).to.equal(bob.address);
        });

        it("escrows the undeliverable payout instead of dropping it", async () => {
            const { office, alice, bob } = await deploy();
            const hostile = await seizeWithHostile(office, alice);
            const addr = await hostile.getAddress();

            const tx = await take(office, bob, ethers.parseEther("1"));
            const price = await pricePaid(office, tx);
            const owed = price - (price * 500n) / 10000n - (price * 2500n) / 10000n;

            expect(await office.credits(addr)).to.equal(owed);
            expect(await office.totalCredits()).to.equal(owed);

            // Once it stops refusing, it can collect what it was owed.
            await hostile.setAccept(true);
            const before = await ethers.provider.getBalance(addr);
            await hostile.collect(await office.getAddress());

            expect(await ethers.provider.getBalance(addr)).to.equal(before + owed);
            expect(await office.credits(addr)).to.equal(0);
            expect(await office.totalCredits()).to.equal(0);
        });

        it("keeps escrowed credits out of the owner sweep", async () => {
            const { office, owner, alice, bob } = await deploy();
            const hostile = await seizeWithHostile(office, alice);

            await take(office, bob, ethers.parseEther("1"));
            const owed = await office.credits(await hostile.getAddress());
            expect(owed).to.be.greaterThan(0n);

            // The contract holds exactly the escrow, so there is nothing free to sweep.
            expect(await ethers.provider.getBalance(await office.getAddress())).to.equal(owed);
            await expect(office.connect(owner).withdrawFunds()).to.be.revertedWith(
                "Office: nothing to withdraw"
            );
        });
    });

    describe("vacant genesis (FIX-7)", () => {
        it("starts with no sheriff, so the deployer accrues nothing", async () => {
            const { office } = await deploy();

            expect((await office.getSlot0()).sheriff).to.equal(ethers.ZeroAddress);

            await time.increase(7 * 24 * 3600);
            expect(await office.pendingRewards()).to.equal(0n);
        });

        it("routes the vacant office's share to the Coffers", async () => {
            const { office, alice, treasury } = await deploy();
            const before = await ethers.provider.getBalance(treasury.address);

            const tx = await take(office, alice, MIN_PRICE);
            const price = await pricePaid(office, tx);

            // No deposed sheriff exists, so Coffers take their 25% plus the unclaimed 70%.
            const devCut = (price * 500n) / 10000n;
            expect(await ethers.provider.getBalance(treasury.address)).to.equal(
                before + (price - devCut)
            );
        });

        it("mints nothing until the office is first bought", async () => {
            const { office, token, alice } = await deploy();
            await time.increase(30 * 24 * 3600);

            await take(office, alice, MIN_PRICE);
            expect(await token.totalSupply()).to.equal(0n);
        });
    });

    describe("price multiplier invariant (FIX-9)", () => {
        // The deposed sheriff receives MULTIPLIER * (1 - t/EPOCH) of what was paid. If
        // MULTIPLIER * deposedShare >= 1, an instant flip returns more ETH than it cost
        // and the taker keeps the emission for free - risk-free profit funded by the next
        // buyer. Everyone races to flip, turnover collapses, price runs away. This is the
        // balance failure the 2x original had.
        it("makes holding the office always cost something", async () => {
            const { office } = await deploy();

            const multiplier = await office.NEW_PRICE_MULTIPLIER();
            const divisor = await office.DIVISOR();
            const deposedShare =
                divisor - (await office.COFFERS_BPS()) - (await office.DEV_BPS());

            expect((multiplier * deposedShare) / divisor).to.be.lessThan(ONE);
        });

        it("returns less than was paid on an instant flip", async () => {
            const { office, alice, bob } = await deploy();

            await take(office, alice, MIN_PRICE);

            const before = await ethers.provider.getBalance(alice.address);
            await take(office, bob, ethers.parseEther("1"));
            const rebate = (await ethers.provider.getBalance(alice.address)) - before;

            // Deposed almost immediately: the best possible case, and still a net cost.
            expect(rebate).to.be.lessThan(MIN_PRICE);
            expect(rebate).to.be.greaterThan((MIN_PRICE * 80n) / 100n); // but not punitive
        });

        it("keeps a hot market affordable", async () => {
            const { office, alice, bob } = await deploy();

            // 20 takeovers ~5 minutes apart. At 2x this reached ~18 ETH.
            let last = await time.latest();
            for (let i = 0; i < 20; i++) {
                last += 300;
                await time.setNextBlockTimestamp(last);
                await take(office, i % 2 === 0 ? alice : bob, ethers.parseEther("2"));
            }

            expect(await office.getPrice()).to.be.lessThan(ethers.parseEther("0.01"));
        });
    });

    describe("emission split (FIX-8)", () => {
        it("routes 10% of every mint to the Coffers", async () => {
            const { office, token, alice, bob, treasury } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            await time.setNextBlockTimestamp(start + 3600);
            await take(office, bob, ethers.parseEther("1"));

            const owed = accrued(0, 3600);
            expect(await token.balanceOf(alice.address)).to.equal(toSheriff(owed));
            expect(await token.balanceOf(treasury.address)).to.equal(toCoffers(owed));
            expect(await token.totalSupply()).to.equal(owed);
        });

        it("accrues both sides of the pair to the treasury", async () => {
            const { office, token, alice, bob, treasury } = await deploy();

            const ethBefore = await ethers.provider.getBalance(treasury.address);
            await take(office, alice, MIN_PRICE);
            await time.increase(3600);
            await take(office, bob, ethers.parseEther("1"));

            // Treasury holds ETH from the levy AND NOTT from emission - enough to seed
            // a pool without any premine.
            expect(await ethers.provider.getBalance(treasury.address)).to.be.greaterThan(ethBefore);
            expect(await token.balanceOf(treasury.address)).to.be.greaterThan(0n);
        });

        it("splits on mid-reign claims too", async () => {
            const { office, token, alice, treasury } = await deploy();

            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            await time.setNextBlockTimestamp(start + 1800);
            await office.connect(alice).claimRewards();

            const owed = accrued(0, 1800);
            expect(await token.balanceOf(treasury.address)).to.equal(toCoffers(owed));
        });
    });

    describe("within-reign decay", () => {
        it("halves accrual each epoch held uncontested", async () => {
            const { office, alice } = await deploy();
            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            // Epoch 0 earns at full rate; each subsequent epoch earns half the last.
            const marks: bigint[] = [];
            for (let e = 1; e <= 4; e++) {
                await time.setNextBlockTimestamp(start + e * EPOCH);
                await ethers.provider.send("evm_mine", []);
                marks.push(await office.pendingRewards());
            }

            const perEpoch = marks.map((m, i) => (i === 0 ? m : m - marks[i - 1]));
            expect(perEpoch[1]).to.equal(perEpoch[0] / 2n);
            expect(perEpoch[2]).to.equal(perEpoch[0] / 4n);
            expect(perEpoch[3]).to.equal(perEpoch[0] / 8n);
        });

        it("rests at the 10% floor rather than decaying to zero", async () => {
            const { office, alice } = await deploy();
            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            // Two epochs deep into the floor region, both should earn the same 10%.
            await time.setNextBlockTimestamp(start + 8 * EPOCH);
            await ethers.provider.send("evm_mine", []);
            const at8 = await office.pendingRewards();

            await time.setNextBlockTimestamp(start + 9 * EPOCH);
            await ethers.provider.send("evm_mine", []);
            const at9 = await office.pendingRewards();

            const floorEpoch = at9 - at8;
            expect(floorEpoch).to.equal((INITIAL_DPS * BigInt(EPOCH)) / 10n);
            expect(floorEpoch).to.be.greaterThan(0n);
        });

        it("caps what an uncontested squatter can extract", async () => {
            const { office, alice } = await deploy();
            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            await time.setNextBlockTimestamp(start + 30 * 24 * 3600);
            await ethers.provider.send("evm_mine", []);

            // Flat clock-based accrual would have paid 1,296,000 NOTT for this squat.
            const squat = (await office.pendingRewards()) / ONE;
            expect(squat).to.be.lessThan(200_000n);
            expect(squat).to.be.greaterThan(100_000n);
        });

        it("measures decay from reign start, not from the last claim", async () => {
            const { office, token, alice } = await deploy();
            await take(office, alice, MIN_PRICE);
            const start = await time.latest();

            // Claiming every epoch must not reset the decay curve and restore full rate.
            for (let e = 1; e <= 3; e++) {
                await time.setNextBlockTimestamp(start + e * EPOCH);
                await office.connect(alice).claimRewards();
            }

            const legs = [0, 1, 2].reduce(
                (acc, e) => acc + toSheriff(accrued(e * EPOCH, (e + 1) * EPOCH)),
                0n
            );
            expect(await token.balanceOf(alice.address)).to.equal(legs);
        });
    });

    describe("emission schedule", () => {
        it("halves every 365 days down to the tail", async () => {
            const { office, alice } = await deploy();

            await time.increase(365 * 24 * 3600);
            await take(office, alice, ethers.parseEther("1"));
            expect(await office.getDps()).to.equal(INITIAL_DPS / 2n);

            await time.increase(365 * 24 * 3600);
            await take(office, alice, ethers.parseEther("1"));
            expect(await office.getDps()).to.equal(INITIAL_DPS / 4n);
        });

        it("front-loads far less than the 30-day schedule it replaces", async () => {
            // The old curve put 47.8% of supply in month one. Emission over the first
            // 30 days should now be a single-digit share of the four-year total.
            const monthOne = Number(accrued(0, 30 * 24 * 3600) / ONE);
            expect(monthOne).to.be.lessThan(200_000);
        });

        it("never emits below the tail rate", async () => {
            const { office, alice } = await deploy();

            // Far past the point where halving would round to zero.
            await time.increase(365 * 24 * 3600 * 40);
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
