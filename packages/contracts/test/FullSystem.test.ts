import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
    TavernKeeper,
    KeepToken,
    CellarHook,
    DungeonGatekeeper,
    CellarZapV4,
    PoolManager
} from "../typechain-types";

describe("Full System Integration Test (UUPS)", function () {
    let deployer: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let signer: SignerWithAddress;

    let poolManager: PoolManager;
    let keepToken: KeepToken;
    let cellarHook: CellarHook;
    let tavernKeeper: TavernKeeper;
    let gatekeeper: DungeonGatekeeper;
    let cellarZap: CellarZapV4;

    let hookAddress: string;

    const INIT_PRICE = ethers.parseEther("100");
    const EPOCH_PERIOD = 3600;
    const PRICE_MULTIPLIER = ethers.parseEther("1.1");
    const MIN_INIT_PRICE = ethers.parseEther("1");

    before(async function () {
        [deployer, user1, user2, signer] = await ethers.getSigners();
        console.log("Deployer:", deployer.address);
        console.log("User1:", user1.address);
        console.log("Signer:", signer.address);
    });

    describe("1. Deployment & Configuration", function () {
        it("Should deploy PoolManager", async function () {
            const PoolManagerFactory = await ethers.getContractFactory("PoolManager");
            poolManager = await PoolManagerFactory.deploy(deployer.address);
            await poolManager.waitForDeployment();
            expect(await poolManager.getAddress()).to.be.properAddress;
        });

        it("Should deploy KeepToken (UUPS)", async function () {
            const KeepTokenFactory = await ethers.getContractFactory("KeepToken");
            keepToken = await upgrades.deployProxy(KeepTokenFactory, [deployer.address, deployer.address], { kind: 'uups' }) as unknown as KeepToken;
            await keepToken.waitForDeployment();
            expect(await keepToken.getAddress()).to.be.properAddress;
        });

        it("Should deploy CellarHook (UUPS)", async function () {
            const CellarHookFactory = await ethers.getContractFactory("CellarHook");

            const MON = ethers.ZeroAddress;
            const KEEP = await keepToken.getAddress();

            cellarHook = await upgrades.deployProxy(
                CellarHookFactory,
                [
                    await poolManager.getAddress(),
                    MON,
                    KEEP,
                    INIT_PRICE,
                    EPOCH_PERIOD,
                    PRICE_MULTIPLIER,
                    MIN_INIT_PRICE,
                    deployer.address
                ],
                { kind: 'uups', initializer: 'initialize' }
            ) as unknown as CellarHook;
            await cellarHook.waitForDeployment();
            hookAddress = await cellarHook.getAddress();
            expect(hookAddress).to.be.properAddress;
        });

        it("Should deploy TavernKeeper (UUPS)", async function () {
            const TavernKeeperFactory = await ethers.getContractFactory("TavernKeeper");
            tavernKeeper = await upgrades.deployProxy(TavernKeeperFactory, [], { kind: 'uups' }) as unknown as TavernKeeper;
            await tavernKeeper.waitForDeployment();
            expect(await tavernKeeper.getAddress()).to.be.properAddress;
        });

        it("Should deploy DungeonGatekeeper (UUPS)", async function () {
            const DungeonGatekeeperFactory = await ethers.getContractFactory("DungeonGatekeeper");
            gatekeeper = await upgrades.deployProxy(
                DungeonGatekeeperFactory,
                [deployer.address, deployer.address],
                { kind: 'uups' }
            ) as unknown as DungeonGatekeeper;
            await gatekeeper.waitForDeployment();
            expect(await gatekeeper.getAddress()).to.be.properAddress;
        });

        it("Should deploy CellarZapV4 (UUPS)", async function () {
            const CellarZapV4Factory = await ethers.getContractFactory("CellarZapV4");
            const MON = ethers.ZeroAddress;
            const KEEP = await keepToken.getAddress();

            cellarZap = await upgrades.deployProxy(
                CellarZapV4Factory,
                [
                    await poolManager.getAddress(),
                    hookAddress,
                    MON,
                    KEEP,
                    deployer.address
                ],
                { kind: 'uups', initializer: 'initialize' }
            ) as unknown as CellarZapV4;
            await cellarZap.waitForDeployment();
            expect(await cellarZap.getAddress()).to.be.properAddress;
        });

        it("Should configure contracts correctly", async function () {
            // Wire KeepToken <-> TavernKeeper
            await keepToken.setTavernKeeperContract(await tavernKeeper.getAddress());
            await tavernKeeper.setKeepTokenContract(await keepToken.getAddress());

            // Initialize TavernKeeper V2 with CellarHook as treasury
            await tavernKeeper.initializeOfficeV2(hookAddress);

            // Set Signer
            await tavernKeeper.setSigner(signer.address);

            expect(await tavernKeeper.keepToken()).to.equal(await keepToken.getAddress());
            expect(await tavernKeeper.treasury()).to.equal(hookAddress);
            expect(await tavernKeeper.signer()).to.equal(signer.address);
        });
    });

    describe("2. TavernKeeper Minting (Signature Based)", function () {
        it("Should mint TavernKeeper with valid signature", async function () {
            const uri = "https://example.com/keeper/1";
            const amount = ethers.parseEther("10"); // 10 MON
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const nonce = await tavernKeeper.nonces(user1.address);
            const chainId = (await ethers.provider.getNetwork()).chainId;

            // Create Signature
            const hash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256", "uint256", "uint256", "address"],
                [user1.address, amount, nonce, deadline, chainId, await tavernKeeper.getAddress()]
            );
            const signature = await signer.signMessage(ethers.getBytes(hash));

            // Mint
            await tavernKeeper.connect(user1).mintTavernKeeper(uri, amount, deadline, signature, { value: amount });

            expect(await tavernKeeper.ownerOf(0)).to.equal(user1.address);
        });

        it("Should fail with invalid signature", async function () {
            const uri = "https://example.com/keeper/2";
            const amount = ethers.parseEther("10");
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const nonce = await tavernKeeper.nonces(user2.address);
            const chainId = (await ethers.provider.getNetwork()).chainId;

            // Create Signature for User 2 but try to use it with User 1
            const hash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256", "uint256", "uint256", "address"],
                [user2.address, amount, nonce, deadline, chainId, await tavernKeeper.getAddress()]
            );
            const signature = await signer.signMessage(ethers.getBytes(hash));

            await expect(
                tavernKeeper.connect(user1).mintTavernKeeper(uri, amount, deadline, signature, { value: amount })
            ).to.be.revertedWith("Invalid signature");
        });
    });

    describe("3. The Office (King of the Hill)", function () {
        it("Should allow taking office and distributing fees", async function () {
            const epochId = 1;
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            const price = await tavernKeeper.getPrice();
            console.log("Current Price:", ethers.formatEther(price));

            const maxPrice = price * 120n / 100n; // 20% slippage
            const uri = "I am the King";

            // Get balances before
            const treasuryBalanceBefore = await ethers.provider.getBalance(hookAddress);
            const potBalanceBefore = await cellarHook.potBalance();
            console.log("Treasury Balance Before:", ethers.formatEther(treasuryBalanceBefore));
            console.log("Pot Balance Before:", ethers.formatEther(potBalanceBefore));

            // Take Office
            try {
                const tx = await tavernKeeper.connect(user1).takeOffice(epochId, deadline, maxPrice, uri, { value: price, gasLimit: 30000000 });
                await tx.wait();
            } catch (e) {
                console.error("Take Office Failed:", e);
                throw e;
            }

            // Verify State
            const slot0 = await tavernKeeper.slot0();
            expect(slot0.miner).to.equal(user1.address);
            expect(slot0.uri).to.equal(uri);

            // Verify Fees (15% to Treasury/CellarHook)
            const expectedFee = price * 2000n / 10000n; // 20% Total Fee
            const expectedCellarFee = expectedFee * 3n / 4n; // 15% (3/4 of 20%)
            console.log("Expected Cellar Fee:", ethers.formatEther(expectedCellarFee));

            const treasuryBalanceAfter = await ethers.provider.getBalance(hookAddress);
            const potBalanceAfter = await cellarHook.potBalance();
            console.log("Treasury Balance After:", ethers.formatEther(treasuryBalanceAfter));
            console.log("Pot Balance After:", ethers.formatEther(potBalanceAfter));

            expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(expectedCellarFee);

            // CRITICAL CHECK: Did receive() update potBalance?
            expect(potBalanceAfter - potBalanceBefore).to.equal(expectedCellarFee);
        });
    });

    describe("4. Cellar Mechanics (Raid)", function () {
        it("Should allow user to mint LP tokens via Zap", async function () {
            // User 1 needs KEEP tokens first. 
            // TavernKeeper mints KEEP over time. Let's fast forward time.
            await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
            await ethers.provider.send("evm_mine", []);

            // Claim KEEP
            await tavernKeeper.connect(user1).claimTokens(0);
            const keepBalance = await keepToken.balanceOf(user1.address);
            expect(keepBalance).to.be.gt(0);

            // Zap to get LP tokens (CellarHook ERC20)
            const monAmount = ethers.parseEther("1");
            const keepAmount = keepBalance / 2n;

            await keepToken.connect(user1).approve(await cellarZap.getAddress(), keepAmount);

            // Mint LP
            await cellarZap.connect(user1).mintLP(monAmount, keepAmount, { value: monAmount });

            const lpBalance = await cellarHook.balanceOf(user1.address);
            expect(lpBalance).to.be.gt(0);
        });

        it("Should allow user to Raid (Burn LP for Pot)", async function () {
            const potBalance = await cellarHook.potBalance();
            console.log("Pot Balance for Raid:", ethers.formatEther(potBalance));
            expect(potBalance).to.be.gt(0);

            const auctionPrice = await cellarHook.getAuctionPrice();
            const lpBalance = await cellarHook.balanceOf(user1.address);

            // Ensure user has enough LP
            expect(lpBalance).to.be.gte(auctionPrice);

            // Raid
            const balanceBefore = await ethers.provider.getBalance(user1.address);
            await cellarHook.connect(user1).raid(auctionPrice);
            const balanceAfter = await ethers.provider.getBalance(user1.address);

            // User should have received the pot (minus gas)
            // Hard to check exact balance due to gas, but potBalance should be 0 now
            expect(await cellarHook.potBalance()).to.equal(0);
        });
    });

    describe("5. UUPS Upgradeability", function () {
        it("Should upgrade CellarHook and preserve state", async function () {
            const CellarHookFactory = await ethers.getContractFactory("CellarHook");

            // Deploy new implementation (same code for test)
            const newImpl = await CellarHookFactory.deploy();
            await newImpl.waitForDeployment();

            // Upgrade
            await upgrades.upgradeProxy(hookAddress, CellarHookFactory);

            // Verify state preserved
            const slot0 = await cellarHook.slot0();
            expect(slot0.epochId).to.be.gte(1); // Should have incremented from Raid
        });
    });
});
