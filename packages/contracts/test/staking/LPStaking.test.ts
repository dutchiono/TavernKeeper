import { expect } from "chai";
import { ethers } from "hardhat";
import { LPStaking, CellarToken, KeepToken, TheCellarV3 } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("LPStaking", function () {
    let lpStaking: LPStaking;
    let cellarToken: CellarToken;
    let keepToken: KeepToken;
    let cellar: TheCellarV3;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy CellarToken (CLP)
        const CellarTokenFactory = await ethers.getContractFactory("CellarToken");
        cellarToken = await CellarTokenFactory.deploy();
        await cellarToken.waitForDeployment();

        // Deploy KeepToken
        const KeepTokenFactory = await ethers.getContractFactory("KeepToken");
        keepToken = await KeepTokenFactory.deploy(owner.address, owner.address);
        await keepToken.waitForDeployment();

        // Deploy mock TheCellarV3 (simplified for testing)
        const TheCellarV3Factory = await ethers.getContractFactory("TheCellarV3");
        cellar = await TheCellarV3Factory.deploy();
        await cellar.waitForDeployment();

        // Deploy LPStaking
        const LPStakingFactory = await ethers.getContractFactory("LPStaking");
        lpStaking = await LPStakingFactory.deploy(
            await cellarToken.getAddress(),
            await keepToken.getAddress(),
            await cellar.getAddress()
        );
        await lpStaking.waitForDeployment();

        // Mint some CLP tokens to users
        const amount = ethers.parseEther("1000");
        await cellarToken.mint(user1.address, amount);
        await cellarToken.mint(user2.address, amount);

        // Mint some KEEP tokens for rewards
        await keepToken.mint(owner.address, ethers.parseEther("10000"));
    });

    describe("Staking", function () {
        it("Should allow users to stake CLP tokens", async function () {
            const stakeAmount = ethers.parseEther("100");
            await cellarToken.connect(user1).approve(await lpStaking.getAddress(), stakeAmount);
            await lpStaking.connect(user1).stake(stakeAmount, 0);

            const userStake = await lpStaking.getUserStake(user1.address);
            expect(userStake.amount).to.equal(stakeAmount);
            expect(await cellarToken.balanceOf(await lpStaking.getAddress())).to.equal(stakeAmount);
        });

        it("Should apply lock multiplier correctly", async function () {
            const stakeAmount = ethers.parseEther("100");
            await cellarToken.connect(user1).approve(await lpStaking.getAddress(), stakeAmount);

            // Stake with 365 day lock (max multiplier 1.5x)
            await lpStaking.connect(user1).stake(stakeAmount, 365);

            const userStake = await lpStaking.getUserStake(user1.address);
            expect(userStake.lockMultiplier).to.be.closeTo(ethers.parseEther("1.5"), ethers.parseEther("0.01"));
            expect(userStake.lockExpiry).to.be.gt(0);
        });

        it("Should prevent unstaking before lock expires", async function () {
            const stakeAmount = ethers.parseEther("100");
            await cellarToken.connect(user1).approve(await lpStaking.getAddress(), stakeAmount);
            await lpStaking.connect(user1).stake(stakeAmount, 30); // 30 day lock

            await expect(
                lpStaking.connect(user1).unstake(ethers.parseEther("50"))
            ).to.be.revertedWith("Still locked");
        });

        it("Should allow unstaking after lock expires", async function () {
            const stakeAmount = ethers.parseEther("100");
            await cellarToken.connect(user1).approve(await lpStaking.getAddress(), stakeAmount);
            await lpStaking.connect(user1).stake(stakeAmount, 1); // 1 day lock

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
            await ethers.provider.send("evm_mine", []);

            await lpStaking.connect(user1).unstake(ethers.parseEther("50"));
            const userStake = await lpStaking.getUserStake(user1.address);
            expect(userStake.amount).to.equal(ethers.parseEther("50"));
        });
    });

    describe("Rewards", function () {
        it("Should distribute rewards proportionally", async function () {
            const stakeAmount1 = ethers.parseEther("100");
            const stakeAmount2 = ethers.parseEther("200");

            // User1 stakes with no lock
            await cellarToken.connect(user1).approve(await lpStaking.getAddress(), stakeAmount1);
            await lpStaking.connect(user1).stake(stakeAmount1, 0);

            // User2 stakes with no lock
            await cellarToken.connect(user2).approve(await lpStaking.getAddress(), stakeAmount2);
            await lpStaking.connect(user2).stake(stakeAmount2, 0);

            // Deposit rewards
            const rewardAmount = ethers.parseEther("1000");
            await keepToken.approve(await lpStaking.getAddress(), rewardAmount);
            await lpStaking.depositRewards(rewardAmount);

            // User1 should get 1/3 of rewards (100 / 300)
            const pending1 = await lpStaking.getPendingRewards(user1.address);
            expect(pending1).to.be.closeTo(ethers.parseEther("333.33"), ethers.parseEther("0.1"));

            // User2 should get 2/3 of rewards (200 / 300)
            const pending2 = await lpStaking.getPendingRewards(user2.address);
            expect(pending2).to.be.closeTo(ethers.parseEther("666.67"), ethers.parseEther("0.1"));
        });

        it("Should apply lock multiplier to rewards", async function () {
            const stakeAmount = ethers.parseEther("100");
            await cellarToken.connect(user1).approve(await lpStaking.getAddress(), stakeAmount);

            // Stake with 365 day lock (1.5x multiplier)
            await lpStaking.connect(user1).stake(stakeAmount, 365);

            // Deposit rewards
            const rewardAmount = ethers.parseEther("1000");
            await keepToken.approve(await lpStaking.getAddress(), rewardAmount);
            await lpStaking.depositRewards(rewardAmount);

            // User should get 1.5x more rewards due to lock multiplier
            const pending = await lpStaking.getPendingRewards(user1.address);
            expect(pending).to.be.closeTo(ethers.parseEther("1500"), ethers.parseEther("1"));
        });

        it("Should allow users to claim rewards", async function () {
            const stakeAmount = ethers.parseEther("100");
            await cellarToken.connect(user1).approve(await lpStaking.getAddress(), stakeAmount);
            await lpStaking.connect(user1).stake(stakeAmount, 0);

            // Deposit rewards
            const rewardAmount = ethers.parseEther("1000");
            await keepToken.approve(await lpStaking.getAddress(), rewardAmount);
            await lpStaking.depositRewards(rewardAmount);

            // Claim rewards
            const balanceBefore = await keepToken.balanceOf(user1.address);
            await lpStaking.connect(user1).claimRewards();
            const balanceAfter = await keepToken.balanceOf(user1.address);

            expect(balanceAfter - balanceBefore).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("0.1"));
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner or cellar to deposit rewards", async function () {
            const rewardAmount = ethers.parseEther("1000");
            await keepToken.connect(user1).approve(await lpStaking.getAddress(), rewardAmount);

            await expect(
                lpStaking.connect(user1).depositRewards(rewardAmount)
            ).to.be.revertedWith("Not authorized");
        });
    });
});

