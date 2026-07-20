import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

const MIN_PRICE = ethers.parseEther("0.0001");

async function deploy() {
    const [owner, alice, spender] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("NottToken");
    const token = await upgrades.deployProxy(Token, [owner.address], { kind: "uups" });
    const tokenAddr = await token.getAddress();

    const Coffers = await ethers.getContractFactory("Coffers");
    const coffers = await Coffers.deploy(tokenAddr, owner.address);
    await coffers.waitForDeployment();

    // Stand-in for a Robinhood Stock Token.
    const Mock = await ethers.getContractFactory("NottToken");
    const stock = await upgrades.deployProxy(Mock, [owner.address], { kind: "uups" });

    return { coffers, token, stock, owner, alice, spender };
}

/** Put a known ETH balance in the treasury. */
async function fund(coffers: any, from: any, amount: bigint) {
    await from.sendTransaction({ to: await coffers.getAddress(), value: amount });
}

describe("stock reserves", () => {
    describe("approval", () => {
        it("refuses an unapproved asset", async () => {
            const { coffers, stock, owner, spender } = await deploy();
            await fund(coffers, owner, ethers.parseEther("10"));

            await expect(
                coffers.fundReservePurchase(
                    spender.address,
                    await stock.getAddress(),
                    ethers.parseEther("1")
                )
            )
                .to.be.revertedWithCustomError(coffers, "NotApprovedReserve")
                .withArgs(await stock.getAddress());
        });

        it("lets only the owner curate reserve assets", async () => {
            const { coffers, stock, alice } = await deploy();

            await expect(
                coffers.connect(alice).setReserveApproval(await stock.getAddress(), true)
            ).to.be.revertedWithCustomError(coffers, "OwnableUnauthorizedAccount");

            await expect(coffers.setReserveApproval(await stock.getAddress(), true))
                .to.emit(coffers, "ReserveApprovalChanged")
                .withArgs(await stock.getAddress(), true);
        });
    });

    describe("allocation cap", () => {
        // The health property: stock exposure must never be load-bearing. At most 30% of
        // the treasury can go to equities; the rest stays in ETH backing the canonical
        // NOTT/ETH pool, which has to keep working when a stock token is paused.
        it("caps reserve spend at 30% of the treasury", async () => {
            const { coffers, stock, owner, spender } = await deploy();
            await coffers.setReserveApproval(await stock.getAddress(), true);
            await fund(coffers, owner, ethers.parseEther("10"));

            expect(await coffers.reserveHeadroom()).to.equal(ethers.parseEther("3"));

            await expect(
                coffers.fundReservePurchase(
                    spender.address,
                    await stock.getAddress(),
                    ethers.parseEther("3.1")
                )
            ).to.be.revertedWithCustomError(coffers, "ReserveCapExceeded");

            await expect(
                coffers.fundReservePurchase(
                    spender.address,
                    await stock.getAddress(),
                    ethers.parseEther("3")
                )
            ).to.emit(coffers, "ReserveFunded");
        });

        it("stays capped across multiple purchases", async () => {
            const { coffers, stock, owner, spender } = await deploy();
            await coffers.setReserveApproval(await stock.getAddress(), true);
            await fund(coffers, owner, ethers.parseEther("10"));

            const stockAddr = await stock.getAddress();
            await coffers.fundReservePurchase(spender.address, stockAddr, ethers.parseEther("2"));

            // Ceiling is measured against (spent + still held), so it does not drift as
            // the balance falls - 30% of 10 ETH total, 2 already committed.
            expect(await coffers.reserveHeadroom()).to.equal(ethers.parseEther("1"));

            await expect(
                coffers.fundReservePurchase(spender.address, stockAddr, ethers.parseEther("1.5"))
            ).to.be.revertedWithCustomError(coffers, "ReserveCapExceeded");

            await coffers.fundReservePurchase(spender.address, stockAddr, ethers.parseEther("1"));
            expect(await coffers.reserveHeadroom()).to.equal(0n);
            expect(await coffers.reserveEthSpent()).to.equal(ethers.parseEther("3"));
        });

        it("reopens headroom as the treasury grows", async () => {
            const { coffers, stock, owner, spender } = await deploy();
            await coffers.setReserveApproval(await stock.getAddress(), true);
            await fund(coffers, owner, ethers.parseEther("10"));

            await coffers.fundReservePurchase(
                spender.address,
                await stock.getAddress(),
                ethers.parseEther("3")
            );
            expect(await coffers.reserveHeadroom()).to.equal(0n);

            // More levy arrives. The ceiling is 30% of lifetime treasury - already
            // committed (3) plus still held (17) = 20, so 6 may sit in reserves and 3
            // already does. Counting spent capital in the base is what makes this a cap
            // on total allocation rather than a target that drifts as the balance moves.
            await fund(coffers, owner, ethers.parseEther("10"));
            expect(await coffers.reserveHeadroom()).to.equal(ethers.parseEther("3"));
        });

        it("leaves the majority of the treasury in ETH", async () => {
            const { coffers, stock, owner, spender } = await deploy();
            await coffers.setReserveApproval(await stock.getAddress(), true);
            await fund(coffers, owner, ethers.parseEther("10"));

            await coffers.fundReservePurchase(
                spender.address,
                await stock.getAddress(),
                await coffers.reserveHeadroom()
            );

            // 70% still backing the canonical pair, whatever happens to the equity leg.
            const [ethBalance] = await coffers.balances();
            expect(ethBalance).to.equal(ethers.parseEther("7"));
        });
    });

    describe("holding", () => {
        it("reports reserve balances", async () => {
            const { coffers, stock, owner } = await deploy();
            const stockAddr = await stock.getAddress();
            await coffers.setReserveApproval(stockAddr, true);

            // Simulate the multisig delivering the purchased asset back.
            await stock.setSheriffsOffice(owner.address);
            await stock.connect(owner).mint(await coffers.getAddress(), ethers.parseEther("42"));

            expect(await coffers.reserveBalance(stockAddr)).to.equal(ethers.parseEther("42"));
        });

        it("can exit a reserve position", async () => {
            const { coffers, stock, owner, alice } = await deploy();
            const stockAddr = await stock.getAddress();
            await coffers.setReserveApproval(stockAddr, true);

            await stock.setSheriffsOffice(owner.address);
            await stock.connect(owner).mint(await coffers.getAddress(), ethers.parseEther("42"));

            // A paused stock token would make this revert until unpaused - illiquid, not
            // lost, which is the whole reason exposure is capped rather than forbidden.
            await coffers.withdrawToken(stockAddr, alice.address, ethers.parseEther("42"));
            expect(await stock.balanceOf(alice.address)).to.equal(ethers.parseEther("42"));
            expect(await coffers.reserveBalance(stockAddr)).to.equal(0n);
        });
    });
});
