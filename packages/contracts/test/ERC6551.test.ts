import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
    Adventurer,
    ERC6551Account,
    ERC6551Registry,
    KeepToken,
    TavernKeeper,
} from "../typechain-types";

describe("ERC-6551 Integration", function () {
    let registry: ERC6551Registry;
    let accountImpl: ERC6551Account;
    let adventurer: Adventurer;
    let keepToken: KeepToken;
    let tavernKeeper: TavernKeeper;
    let owner: SignerWithAddress;
    let otherAccount: SignerWithAddress;

    beforeEach(async function () {
        [owner, otherAccount] = await ethers.getSigners();

        // Deploy Registry (not upgradeable)
        const RegistryFactory = await ethers.getContractFactory("ERC6551Registry");
        registry = await RegistryFactory.deploy();

        // Deploy Account Implementation (not upgradeable)
        const AccountFactory = await ethers.getContractFactory("ERC6551Account");
        accountImpl = await AccountFactory.deploy();

        // Deploy Adventurer NFT as UUPS proxy
        const AdventurerFactory = await ethers.getContractFactory("Adventurer");
        adventurer = await upgrades.deployProxy(AdventurerFactory, [], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as Adventurer;

        // Deploy TavernKeeper first (needed for KeepToken)
        const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
        tavernKeeper = await upgrades.deployProxy(TavernKeeperFactory, [], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as TavernKeeper;

        // Deploy KeepToken as UUPS proxy (requires treasury and TavernKeeper address)
        const KeepTokenFactory = await ethers.getContractFactory("KeepToken");
        keepToken = await upgrades.deployProxy(KeepTokenFactory, [owner.address, await tavernKeeper.getAddress()], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as KeepToken;

        // Link KeepToken to TavernKeeper
        await tavernKeeper.setKeepTokenContract(await keepToken.getAddress());
    });

    it("Should create a TBA for an Adventurer", async function () {
        // Mint Adventurer to owner
        await adventurer.safeMint(owner.address, "uri");
        const tokenId = 0;

        // Calculate expected address
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const salt = ethers.ZeroHash;
        const expectedAddress = await registry.account(
            await accountImpl.getAddress(),
            salt,
            chainId,
            await adventurer.getAddress(),
            tokenId
        );

        // Create Account
        const tx = await registry.createAccount(
            await accountImpl.getAddress(),
            salt,
            chainId,
            await adventurer.getAddress(),
            tokenId
        );
        await tx.wait();

        // Verify creation
        const code = await ethers.provider.getCode(expectedAddress);
        expect(code).to.not.equal("0x");
    });

    it("Should allow TBA to receive and transfer KEEP", async function () {
        // Mint Adventurer
        await adventurer.safeMint(owner.address, "uri");
        const tokenId = 0;
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const salt = ethers.ZeroHash;

        // Create TBA
        await registry.createAccount(
            await accountImpl.getAddress(),
            salt,
            chainId,
            await adventurer.getAddress(),
            tokenId
        );

        const tbaAddress = await registry.account(
            await accountImpl.getAddress(),
            salt,
            chainId,
            await adventurer.getAddress(),
            tokenId
        );

        // Mint a TavernKeeper NFT to owner, then transfer to TBA, then claim tokens
        // For testing, we'll mint directly to TBA address via a workaround
        // Actually, we need to mint to owner first, then transfer to TBA
        const keeperMintTx = await tavernKeeper.safeMint(owner.address, "https://example.com/keeper/1");
        await keeperMintTx.wait();
        const keeperTokenId = 0n;

        // Transfer the TavernKeeper NFT to the TBA
        await tavernKeeper.transferFrom(owner.address, tbaAddress, keeperTokenId);

        // Fast-forward time and claim tokens (TBA will receive them)
        await ethers.provider.send("evm_increaseTime", [10000]); // ~2.7 hours
        await ethers.provider.send("evm_mine", []);

        // Claim tokens - TBA will receive them
        const tbaContract = await ethers.getContractAt("ERC6551Account", tbaAddress);
        const claimData = tavernKeeper.interface.encodeFunctionData("claimTokens", [keeperTokenId]);
        await tbaContract.execute(await tavernKeeper.getAddress(), 0, claimData, 0);

        const balanceAfterClaim = await keepToken.balanceOf(tbaAddress);
        expect(balanceAfterClaim).to.be.greaterThan(0n);

        // Execute transfer from TBA (transfer half of balance)
        const transferAmount = balanceAfterClaim / 2n;
        const transferData = keepToken.interface.encodeFunctionData("transfer", [
            otherAccount.address,
            transferAmount,
        ]);

        await tbaContract.execute(await keepToken.getAddress(), 0, transferData, 0);

        expect(await keepToken.balanceOf(tbaAddress)).to.equal(balanceAfterClaim - transferAmount);
        expect(await keepToken.balanceOf(otherAccount.address)).to.equal(transferAmount);
    });
});
