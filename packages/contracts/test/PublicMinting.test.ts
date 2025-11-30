import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Adventurer } from "../typechain-types";

describe("Adventurer Public Minting Workflow", function () {
    let adventurer: Adventurer;
    let owner: any;
    let user1: any;
    let user2: any;
    let user3: any;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        const AdventurerFactory = await ethers.getContractFactory("Adventurer");
        adventurer = await upgrades.deployProxy(AdventurerFactory, [], {
            kind: "uups",
            initializer: "initialize",
        }) as unknown as Adventurer;

        // Enable public minting for tests
        await adventurer.setPublicMintingEnabled(true);
    });

    describe("Multiple Users Minting", function () {
        it("Should allow multiple users to mint heroes", async function () {
            const uri1 = "https://example.com/hero/user1";
            const uri2 = "https://example.com/hero/user2";
            const uri3 = "https://example.com/hero/user3";

            await adventurer.connect(user1).mintHero(user1.address, uri1);
            await adventurer.connect(user2).mintHero(user2.address, uri2);
            await adventurer.connect(user3).mintHero(user3.address, uri3);

            expect(await adventurer.ownerOf(0)).to.equal(user1.address);
            expect(await adventurer.ownerOf(1)).to.equal(user2.address);
            expect(await adventurer.ownerOf(2)).to.equal(user3.address);

            expect(await adventurer.tokenURI(0)).to.equal(uri1);
            expect(await adventurer.tokenURI(1)).to.equal(uri2);
            expect(await adventurer.tokenURI(2)).to.equal(uri3);
        });

        it("Should allow user to mint to different address", async function () {
            const uri = "https://example.com/hero/gift";
            await adventurer.connect(user1).mintHero(user2.address, uri);

            expect(await adventurer.ownerOf(0)).to.equal(user2.address);
            expect(await adventurer.tokenURI(0)).to.equal(uri);
        });
    });

    describe("Metadata Update Workflow", function () {
        beforeEach(async function () {
            await adventurer.connect(user1).mintHero(user1.address, "https://example.com/hero/initial");
        });

        it("Should allow color palette update workflow", async function () {
            // Initial metadata
            expect(await adventurer.tokenURI(0)).to.equal("https://example.com/hero/initial");

            // Update with new color palette
            const updatedUri = "https://example.com/hero/updated-colors";
            await adventurer.connect(user1).updateTokenURI(0, updatedUri);
            expect(await adventurer.tokenURI(0)).to.equal(updatedUri);

            // Update again
            const finalUri = "https://example.com/hero/final-colors";
            await adventurer.connect(user1).updateTokenURI(0, finalUri);
            expect(await adventurer.tokenURI(0)).to.equal(finalUri);
        });

        it("Should maintain ownership after metadata update", async function () {
            await adventurer.connect(user1).updateTokenURI(0, "https://example.com/hero/updated");
            expect(await adventurer.ownerOf(0)).to.equal(user1.address);
        });
    });

    describe("Public Minting Toggle", function () {
        it("Should allow owner to disable and re-enable public minting", async function () {
            // Disable
            await adventurer.setPublicMintingEnabled(false);
            expect(await adventurer.publicMintingEnabled()).to.equal(false);

            await expect(
                adventurer.connect(user1).mintHero(user1.address, "https://example.com/hero/1")
            ).to.be.revertedWith("Adventurer: Public minting is disabled");

            // Re-enable
            await adventurer.setPublicMintingEnabled(true);
            expect(await adventurer.publicMintingEnabled()).to.equal(true);

            await expect(
                adventurer.connect(user1).mintHero(user1.address, "https://example.com/hero/1")
            ).to.not.be.reverted;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle very long metadata URIs", async function () {
            const longUri = "https://example.com/" + "a".repeat(200) + "/metadata.json";
            await expect(
                adventurer.connect(user1).mintHero(user1.address, longUri)
            ).to.not.be.reverted;

            expect(await adventurer.tokenURI(0)).to.equal(longUri);
        });

        it("Should handle special characters in URIs", async function () {
            const specialUri = "https://example.com/hero/1?param=value&other=test#fragment";
            await adventurer.connect(user1).mintHero(user1.address, specialUri);
            expect(await adventurer.tokenURI(0)).to.equal(specialUri);
        });
    });
});
