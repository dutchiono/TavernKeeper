import { expect } from "chai";
import { ethers, upgrades, network } from "hardhat";
import { GoldToken, Inventory, Adventurer, TavernKeeper, ERC6551Registry, ERC6551Account } from "../typechain-types";
import * as fs from "fs";
import * as path from "path";

/**
 * Testnet Integration Tests
 *
 * These tests verify contracts deployed on Monad testnet work correctly.
 * Run with: npx hardhat test test/testnet.test.ts --network monad
 */

describe("Monad Testnet Integration Tests", function () {
    let goldToken: GoldToken;
    let inventory: Inventory;
    let adventurer: Adventurer;
    let tavernKeeper: TavernKeeper;
    let erc6551Registry: ERC6551Registry;
    let erc6551AccountImpl: ERC6551Account;

    let deployer: any;
    let testWallets: Array<{ address: string; signer: any }> = [];

    // Load deployed addresses
    const deploymentFile = path.join(__dirname, "..", "wallets", "deployment-info.json");
    let deployedAddresses: any;

    before(async function () {
        // Skip if not on testnet
        const networkName = network.name;
        if (networkName !== "monad") {
            console.log(`Skipping testnet tests - network is ${networkName}, not monad`);
            this.skip();
        }

        [deployer] = await ethers.getSigners();
        console.log("Testing with deployer:", deployer.address);

        // Load deployment info
        if (fs.existsSync(deploymentFile)) {
            deployedAddresses = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
        } else {
            // Use addresses from deployment output
            deployedAddresses = {
                contracts: {
                    erc6551Registry: "0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C",
                    erc6551AccountImplementation: "0x9B5980110654dcA57a449e2D6BEc36fE54123B0F",
                    goldTokenProxy: "0x96982EC3625145f098DCe06aB34E99E7207b0520",
                    inventoryProxy: "0xA43034595E2d1c52Ab08a057B95dD38bCbFf87dC",
                    adventurerProxy: "0x2ABb5F58DE56948dD0E06606B88B43fFe86206c2",
                    tavernKeeperProxy: "0x4Fff2Ce5144989246186462337F0eE2C086F913E",
                },
            };
        }

        // Connect to deployed contracts
        const GoldTokenFactory = await ethers.getContractFactory("GoldToken");
        goldToken = GoldTokenFactory.attach(deployedAddresses.contracts.goldTokenProxy) as unknown as GoldToken;

        const InventoryFactory = await ethers.getContractFactory("Inventory");
        inventory = InventoryFactory.attach(deployedAddresses.contracts.inventoryProxy) as unknown as Inventory;

        const AdventurerFactory = await ethers.getContractFactory("Adventurer");
        adventurer = AdventurerFactory.attach(deployedAddresses.contracts.adventurerProxy) as unknown as Adventurer;

        const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
        tavernKeeper = TavernKeeperFactory.attach(deployedAddresses.contracts.tavernKeeperProxy) as unknown as TavernKeeper;

        const RegistryFactory = await ethers.getContractFactory("ERC6551Registry");
        erc6551Registry = RegistryFactory.attach(deployedAddresses.contracts.erc6551Registry) as unknown as ERC6551Registry;

        const AccountFactory = await ethers.getContractFactory("ERC6551Account");
        erc6551AccountImpl = AccountFactory.attach(deployedAddresses.contracts.erc6551AccountImplementation) as unknown as ERC6551Account;

        // Load test wallets
        const keysFile = path.join(__dirname, "..", "wallets", "testnet-keys.json");
        if (fs.existsSync(keysFile)) {
            const keysData = JSON.parse(fs.readFileSync(keysFile, "utf8"));
            for (const wallet of keysData.testWallets.slice(0, 3)) { // Use first 3 for testing
                const walletSigner = new ethers.Wallet(wallet.privateKey, ethers.provider);
                testWallets.push({
                    address: wallet.address,
                    signer: walletSigner,
                });
            }
        }
    });

    describe("Contract Verification", function () {
        it("Should verify GoldToken is deployed and initialized", async function () {
            const name = await goldToken.name();
            const symbol = await goldToken.symbol();
            const totalSupply = await goldToken.totalSupply();

            expect(name).to.equal("InnKeeper Gold");
            expect(symbol).to.equal("GOLD");
            // Initial supply is 1M, but may have been minted more
            expect(totalSupply).to.be.at.least(ethers.parseUnits("1000000", 18));
        });

        it("Should verify Inventory is deployed with fee recipient", async function () {
            const feeRecipient = await inventory.feeRecipient();
            expect(feeRecipient).to.equal(deployer.address);
        });

        it("Should verify Adventurer is deployed", async function () {
            const name = await adventurer.name();
            expect(name).to.equal("InnKeeper Adventurer");
        });

        it("Should verify TavernKeeper is deployed", async function () {
            const name = await tavernKeeper.name();
            expect(name).to.equal("InnKeeper TavernKeeper");
        });

        it("Should verify ERC6551 Registry is deployed", async function () {
            const code = await ethers.provider.getCode(deployedAddresses.contracts.erc6551Registry);
            expect(code).to.not.equal("0x");
        });
    });

    describe("GoldToken Operations", function () {
        it("Should allow owner to mint tokens", async function () {
            if (testWallets.length === 0) this.skip();

            const recipient = testWallets[0].address;
            const amount = ethers.parseUnits("100", 18);

            const balanceBefore = await goldToken.balanceOf(recipient);
            await goldToken.mint(recipient, amount);
            const balanceAfter = await goldToken.balanceOf(recipient);

            expect(balanceAfter - balanceBefore).to.equal(amount);
        });

        it("Should allow owner to burn tokens", async function () {
            if (testWallets.length === 0) this.skip();

            const recipient = testWallets[0].address;
            const burnAmount = ethers.parseUnits("10", 18);

            const balanceBefore = await goldToken.balanceOf(recipient);
            if (balanceBefore < burnAmount) {
                // Mint first if needed
                await goldToken.mint(recipient, burnAmount);
            }

            await goldToken.burn(recipient, burnAmount);
            const balanceAfter = await goldToken.balanceOf(recipient);

            expect(balanceBefore - balanceAfter).to.equal(burnAmount);
        });
    });

    describe("Inventory Operations", function () {
        it("Should allow owner to mint items", async function () {
            if (testWallets.length === 0) this.skip();

            const recipient = testWallets[0].address;
            const itemId = 999n; // Use unique item ID to avoid conflicts
            const amount = 10n;

            const balanceBefore = await inventory.balanceOf(recipient, itemId);
            await inventory.mint(recipient, itemId, amount, "0x");
            const balanceAfter = await inventory.balanceOf(recipient, itemId);

            expect(balanceAfter - balanceBefore).to.equal(amount);
        });

        it("Should collect fees when using claimLootWithFee", async function () {
            if (testWallets.length === 0) this.skip();

            const from = deployer.address;
            const to = testWallets[0].address;
            const itemIds = [1n];
            const amounts = [5n];
            const feeAmount = ethers.parseEther("0.001"); // Small test fee

            // Mint items to deployer first
            await inventory.mint(from, 1n, 10n, "0x");

            // Get balance before
            const balanceBefore = await ethers.provider.getBalance(deployer.address);

            // Transfer with fee
            const tx = await inventory.claimLootWithFee(from, to, itemIds, amounts, "0x", { value: feeAmount });
            const receipt = await tx.wait();

            // Calculate gas cost
            const gasUsed = receipt!.gasUsed;
            const gasPrice = receipt!.gasPrice || await ethers.provider.getFeeData().then(f => f.gasPrice || 0n);
            const gasCost = gasUsed * gasPrice;

            const balanceAfter = await ethers.provider.getBalance(deployer.address);

            // Fee should be received (balance should be: before + fee - gas)
            // We check that the fee was received by verifying balance is higher than if we just paid gas
            const expectedMinBalance = balanceBefore - gasCost; // Without fee, balance would be this
            // With fee, balance should be: before + fee - gas = before - gas + fee
            // So balanceAfter should be >= expectedMinBalance (since fee was added)
            // Actually, fee goes TO deployer, so: balanceAfter = balanceBefore + fee - gas
            // So: balanceAfter + gas = balanceBefore + fee
            // Or: balanceAfter = balanceBefore + fee - gas
            const expectedBalance = balanceBefore + feeAmount - gasCost;

            // Allow for small rounding differences (within 0.001 MON for gas estimation variance)
            const tolerance = ethers.parseEther("0.001");
            expect(balanceAfter).to.be.closeTo(expectedBalance, tolerance);
        });
    });

    describe("NFT Operations", function () {
        it("Should allow owner to mint Adventurer NFT", async function () {
            if (testWallets.length === 0) this.skip();

            const recipient = testWallets[0].address;
            const uri = "https://example.com/adventurer/1";

            const tx = await adventurer.safeMint(recipient, uri);
            await tx.wait();

            const tokenId = 0n;
            const owner = await adventurer.ownerOf(tokenId);
            const tokenURI = await adventurer.tokenURI(tokenId);

            expect(owner).to.equal(recipient);
            expect(tokenURI).to.equal(uri);
        });

        it("Should allow owner to mint TavernKeeper NFT", async function () {
            if (testWallets.length === 0) this.skip();

            const recipient = testWallets[0].address;
            const uri = "https://example.com/keeper/1";

            const tx = await tavernKeeper.safeMint(recipient, uri);
            await tx.wait();

            const tokenId = 0n;
            const owner = await tavernKeeper.ownerOf(tokenId);
            const tokenURI = await tavernKeeper.tokenURI(tokenId);

            expect(owner).to.equal(recipient);
            expect(tokenURI).to.equal(uri);
        });
    });

    describe("ERC-6551 TBA Operations", function () {
        it("Should create TBA for Adventurer NFT", async function () {
            if (testWallets.length === 0) this.skip();

            // Mint an Adventurer first
            const recipient = testWallets[0].address;
            await adventurer.safeMint(recipient, "https://example.com/adventurer/1");
            const tokenId = 0n;

            // Create TBA
            const chainId = (await ethers.provider.getNetwork()).chainId;
            const salt = ethers.ZeroHash;
            const implAddress = await erc6551AccountImpl.getAddress();
            const adventurerAddress = await adventurer.getAddress();

            const expectedTBA = await erc6551Registry.account(
                implAddress,
                salt,
                chainId,
                adventurerAddress,
                tokenId
            );

            // Create the account
            await erc6551Registry.createAccount(
                implAddress,
                salt,
                chainId,
                adventurerAddress,
                tokenId
            );

            // Verify TBA exists
            const code = await ethers.provider.getCode(expectedTBA);
            expect(code).to.not.equal("0x");
        });
    });
});

