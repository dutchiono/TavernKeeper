import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { KeepToken, TavernKeeper } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("KeepToken", function () {
    let keepToken: KeepToken;
    let tavernKeeper: TavernKeeper;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let treasury: SignerWithAddress;

    beforeEach(async function () {
        [owner, addr1, treasury] = await ethers.getSigners();

        // Deploy TavernKeeper first (needed for KeepToken init)
        const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
        tavernKeeper = (await upgrades.deployProxy(TavernKeeperFactory, [], {
            kind: "uups",
        })) as unknown as TavernKeeper;
        await tavernKeeper.waitForDeployment();

        // Deploy KeepToken
        const KeepTokenFactory = await ethers.getContractFactory("KeepToken");
        keepToken = (await upgrades.deployProxy(KeepTokenFactory, [treasury.address, await (tavernKeeper as any).getAddress()], {
            kind: "uups",
        })) as unknown as KeepToken;
        await keepToken.waitForDeployment();

        // Link KeepToken to TavernKeeper
        await tavernKeeper.setKeepTokenContract(await (keepToken as any).getAddress());
    });

    it("Should have correct name and symbol", async function () {
        expect(await keepToken.name()).to.equal("Tavern Keeper");
        expect(await keepToken.symbol()).to.equal("KEEP");
    });

    it("Should set the correct treasury and tavernKeeper addresses", async function () {
        expect(await keepToken.treasury()).to.equal(treasury.address);
        expect(await keepToken.tavernKeeperContract()).to.equal(await (tavernKeeper as any).getAddress());
    });

    it("Should allow TavernKeeper contract to mint tokens", async function () {
        // We can't easily call mint directly from EOA because of onlyTavernKeeper modifier
        // So we test via TavernKeeper's claimTokens or by impersonating if needed
        // But for unit test, we can check that direct call fails
        await expect(keepToken.mint(addr1.address, 100)).to.be.revertedWith("Caller is not TavernKeeper");
    });

    it("Should allow owner to update treasury", async function () {
        await keepToken.setTreasury(addr1.address);
        expect(await keepToken.treasury()).to.equal(addr1.address);
    });

    it("Should allow owner to update tavernKeeper contract", async function () {
        await keepToken.setTavernKeeperContract(addr1.address);
        expect(await keepToken.tavernKeeperContract()).to.equal(addr1.address);
    });

    describe("Integration with TavernKeeper", function () {
        it("Should mint tokens when claiming from TavernKeeper", async function () {
            // Mint a TavernKeeper NFT to addr1
            await tavernKeeper.safeMint(addr1.address, "uri");

            // Fast forward time to accumulate tokens
            await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
            await ethers.provider.send("evm_mine", []);

            // Claim tokens as addr1
            await tavernKeeper.connect(addr1).claimTokens(0);

            // Check balance
            // Default rate is 0.01 KEEP per second. 100 seconds = 1 KEEP.
            const balance = await keepToken.balanceOf(addr1.address);
            expect(balance).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.1"));
        });
    });
});
