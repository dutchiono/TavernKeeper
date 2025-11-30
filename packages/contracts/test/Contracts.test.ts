import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { KeepToken, Inventory, Adventurer, TavernKeeper } from "../typechain-types";

describe("InnKeeper Contracts", function () {
    let keepToken: KeepToken;
    let inventory: Inventory;
    let adventurer: Adventurer;
    let tavernKeeper: TavernKeeper;
    let owner: any;
    let otherAccount: any;

    beforeEach(async function () {
        [owner, otherAccount] = await ethers.getSigners();

        // Deploy TavernKeeper first
        const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
        tavernKeeper = await upgrades.deployProxy(TavernKeeperFactory, [], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as TavernKeeper;

        // Deploy KeepToken
        const KeepTokenFactory = await ethers.getContractFactory("KeepToken");
        keepToken = await upgrades.deployProxy(KeepTokenFactory, [owner.address, await (tavernKeeper as any).getAddress()], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as KeepToken;

        // Link KeepToken
        await tavernKeeper.setKeepTokenContract(await (keepToken as any).getAddress());

        const InventoryFactory = await ethers.getContractFactory("Inventory");
        inventory = await upgrades.deployProxy(InventoryFactory, [owner.address], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as Inventory;

        const AdventurerFactory = await ethers.getContractFactory("Adventurer");
        adventurer = await upgrades.deployProxy(AdventurerFactory, [], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as Adventurer;
    });

    describe("KeepToken", function () {
        it("Should have correct name and symbol", async function () {
            expect(await keepToken.name()).to.equal("Tavern Keeper");
            expect(await keepToken.symbol()).to.equal("KEEP");
        });

        it("Should have treasury set", async function () {
            expect(await keepToken.treasury()).to.equal(owner.address);
        });
    });

    describe("Inventory", function () {
        it("Should allow owner to mint items", async function () {
            await inventory.mint(otherAccount.address, 1, 10, "0x");
            expect(await inventory.balanceOf(otherAccount.address, 1)).to.equal(10);
        });

        it("Should allow owner to set URI", async function () {
            await inventory.setURI("https://example.com/item/{id}.json");
            expect(await inventory.uri(1)).to.equal("https://example.com/item/{id}.json");
        });

        it("Should have fee recipient set", async function () {
            const feeRecipient = await inventory.feeRecipient();
            expect(feeRecipient).to.equal(owner.address);
        });
    });

    describe("Adventurer", function () {
        it("Should allow owner to mint adventurer", async function () {
            await adventurer.safeMint(otherAccount.address, "https://example.com/adventurer/1");
            expect(await adventurer.ownerOf(0)).to.equal(otherAccount.address);
            expect(await adventurer.tokenURI(0)).to.equal("https://example.com/adventurer/1");
        });
    });

    describe("TavernKeeper", function () {
        it("Should allow owner to mint tavern keeper", async function () {
            await tavernKeeper.safeMint(otherAccount.address, "https://example.com/keeper/1");
            expect(await tavernKeeper.ownerOf(0)).to.equal(otherAccount.address);
            expect(await tavernKeeper.tokenURI(0)).to.equal("https://example.com/keeper/1");
        });

        it("Should initialize claim data on mint", async function () {
            await tavernKeeper.safeMint(otherAccount.address, "uri");
            // Check if lastClaimTime is set (non-zero)
            const lastClaim = await tavernKeeper.lastClaimTime(0);
            expect(lastClaim).to.be.gt(0);
        });
    });
});
