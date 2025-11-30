import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Adventurer } from "../typechain-types";

describe("Adventurer Metadata & Public Minting", function () {
    let adventurer: Adventurer;
    let owner: any;
    let user: any;
    let otherAccount: any;

    beforeEach(async function () {
        [owner, user, otherAccount] = await ethers.getSigners();

        const AdventurerFactory = await ethers.getContractFactory("Adventurer");
        adventurer = await upgrades.deployProxy(AdventurerFactory, [], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as Adventurer;
    });

    describe("Public Minting", function () {
        it("Should start with public minting disabled", async function () {
            expect(await adventurer.publicMintingEnabled()).to.equal(false);
        });

        it("Should allow owner to enable public minting", async function () {
            await expect(adventurer.setPublicMintingEnabled(true))
                .to.emit(adventurer, "PublicMintingToggled")
                .withArgs(true);
            
            expect(await adventurer.publicMintingEnabled()).to.equal(true);
        });

        it("Should not allow non-owner to enable public minting", async function () {
            await expect(
                adventurer.connect(user).setPublicMintingEnabled(true)
            ).to.be.revertedWithCustomError(adventurer, "OwnableUnauthorizedAccount");
        });

        it("Should not allow public minting when disabled", async function () {
            await expect(
                adventurer.connect(user).mintHero(user.address, "https://example.com/hero/1")
            ).to.be.revertedWith("Adventurer: Public minting is disabled");
        });

        it("Should allow public minting when enabled", async function () {
            await adventurer.setPublicMintingEnabled(true);
            
            const metadataUri = "https://example.com/hero/1";
            await expect(adventurer.connect(user).mintHero(user.address, metadataUri))
                .to.emit(adventurer, "HeroMinted")
                .withArgs(user.address, 0, metadataUri);
            
            expect(await adventurer.ownerOf(0)).to.equal(user.address);
            expect(await adventurer.tokenURI(0)).to.equal(metadataUri);
        });

        it("Should require non-empty metadata URI", async function () {
            await adventurer.setPublicMintingEnabled(true);
            
            await expect(
                adventurer.connect(user).mintHero(user.address, "")
            ).to.be.revertedWith("Adventurer: Metadata URI cannot be empty");
        });

        it("Should increment token IDs correctly", async function () {
            await adventurer.setPublicMintingEnabled(true);
            
            await adventurer.connect(user).mintHero(user.address, "https://example.com/hero/1");
            await adventurer.connect(otherAccount).mintHero(otherAccount.address, "https://example.com/hero/2");
            
            expect(await adventurer.ownerOf(0)).to.equal(user.address);
            expect(await adventurer.ownerOf(1)).to.equal(otherAccount.address);
        });
    });

    describe("Metadata Updates", function () {
        beforeEach(async function () {
            await adventurer.setPublicMintingEnabled(true);
            await adventurer.connect(user).mintHero(user.address, "https://example.com/hero/1");
        });

        it("Should allow token owner to update metadata", async function () {
            const newUri = "https://example.com/hero/1-updated";
            
            await expect(adventurer.connect(user).updateTokenURI(0, newUri))
                .to.emit(adventurer, "MetadataUpdated")
                .withArgs(0, newUri);
            
            expect(await adventurer.tokenURI(0)).to.equal(newUri);
        });

        it("Should not allow non-owner to update metadata", async function () {
            await expect(
                adventurer.connect(otherAccount).updateTokenURI(0, "https://example.com/hero/hacked")
            ).to.be.revertedWith("Adventurer: Only token owner can update metadata");
        });

        it("Should require non-empty metadata URI on update", async function () {
            await expect(
                adventurer.connect(user).updateTokenURI(0, "")
            ).to.be.revertedWith("Adventurer: Metadata URI cannot be empty");
        });

        it("Should allow owner to update metadata multiple times", async function () {
            const uri1 = "https://example.com/hero/1-v1";
            const uri2 = "https://example.com/hero/1-v2";
            
            await adventurer.connect(user).updateTokenURI(0, uri1);
            expect(await adventurer.tokenURI(0)).to.equal(uri1);
            
            await adventurer.connect(user).updateTokenURI(0, uri2);
            expect(await adventurer.tokenURI(0)).to.equal(uri2);
        });
    });

    describe("Owner Minting (Backward Compatibility)", function () {
        it("Should still allow owner to mint via safeMint", async function () {
            const uri = "https://example.com/adventurer/owner-mint";
            
            await expect(adventurer.safeMint(user.address, uri))
                .to.emit(adventurer, "HeroMinted")
                .withArgs(user.address, 0, uri);
            
            expect(await adventurer.ownerOf(0)).to.equal(user.address);
            expect(await adventurer.tokenURI(0)).to.equal(uri);
        });

        it("Should not allow non-owner to use safeMint", async function () {
            await expect(
                adventurer.connect(user).safeMint(user.address, "https://example.com/hero/1")
            ).to.be.revertedWithCustomError(adventurer, "OwnableUnauthorizedAccount");
        });
    });

    describe("Metadata Structure (tokenURI JSON)", function () {
        it("Should store and retrieve metadata URI", async function () {
            await adventurer.setPublicMintingEnabled(true);
            
            const metadataUri = "https://ipfs.io/ipfs/QmExample123";
            await adventurer.connect(user).mintHero(user.address, metadataUri);
            
            const tokenUri = await adventurer.tokenURI(0);
            expect(tokenUri).to.equal(metadataUri);
        });

        it("Should handle IPFS URIs", async function () {
            await adventurer.setPublicMintingEnabled(true);
            
            const ipfsUri = "ipfs://QmExample456";
            await adventurer.connect(user).mintHero(user.address, ipfsUri);
            
            expect(await adventurer.tokenURI(0)).to.equal(ipfsUri);
        });

        it("Should handle HTTP/HTTPS URIs", async function () {
            await adventurer.setPublicMintingEnabled(true);
            
            const httpUri = "https://api.innkeeper.com/heroes/1/metadata.json";
            await adventurer.connect(user).mintHero(user.address, httpUri);
            
            expect(await adventurer.tokenURI(0)).to.equal(httpUri);
        });
    });

    describe("Events", function () {
        it("Should emit HeroMinted event on public mint", async function () {
            await adventurer.setPublicMintingEnabled(true);
            
            await expect(adventurer.connect(user).mintHero(user.address, "https://example.com/hero/1"))
                .to.emit(adventurer, "HeroMinted")
                .withArgs(user.address, 0, "https://example.com/hero/1");
        });

        it("Should emit MetadataUpdated event on update", async function () {
            await adventurer.setPublicMintingEnabled(true);
            await adventurer.connect(user).mintHero(user.address, "https://example.com/hero/1");
            
            await expect(adventurer.connect(user).updateTokenURI(0, "https://example.com/hero/1-updated"))
                .to.emit(adventurer, "MetadataUpdated")
                .withArgs(0, "https://example.com/hero/1-updated");
        });

        it("Should emit PublicMintingToggled event", async function () {
            await expect(adventurer.setPublicMintingEnabled(true))
                .to.emit(adventurer, "PublicMintingToggled")
                .withArgs(true);
            
            await expect(adventurer.setPublicMintingEnabled(false))
                .to.emit(adventurer, "PublicMintingToggled")
                .withArgs(false);
        });
    });
});





