// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Adventurer is Initializable, ERC721Upgradeable, ERC721URIStorageUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 private _nextTokenId;
    bool public publicMintingEnabled;

    event HeroMinted(address indexed to, uint256 indexed tokenId, string metadataUri);
    event MetadataUpdated(uint256 indexed tokenId, string newUri);
    event PublicMintingToggled(bool enabled);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("InnKeeper Adventurer", "ADVENTURER");
        __ERC721URIStorage_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        publicMintingEnabled = false;
    }

    /**
     * @dev Owner-only minting (for initial setup)
     */
    function safeMint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit HeroMinted(to, tokenId, uri);
        return tokenId;
    }

    /**
     * @dev Public minting function - allows users to mint their own heroes
     * @param to Address to mint the hero to
     * @param metadataUri URI pointing to JSON metadata (IPFS or server URL)
     * @return tokenId The minted token ID
     */
    function mintHero(address to, string memory metadataUri) public returns (uint256) {
        require(publicMintingEnabled, "Adventurer: Public minting is disabled");
        require(bytes(metadataUri).length > 0, "Adventurer: Metadata URI cannot be empty");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        emit HeroMinted(to, tokenId, metadataUri);
        return tokenId;
    }

    /**
     * @dev Update token metadata URI (for color changes, etc.)
     * @param tokenId Token ID to update
     * @param newUri New metadata URI
     */
    function updateTokenURI(uint256 tokenId, string memory newUri) public {
        require(_ownerOf(tokenId) == msg.sender, "Adventurer: Only token owner can update metadata");
        require(bytes(newUri).length > 0, "Adventurer: Metadata URI cannot be empty");

        _setTokenURI(tokenId, newUri);
        emit MetadataUpdated(tokenId, newUri);
    }

    /**
     * @dev Toggle public minting (owner only)
     */
    function setPublicMintingEnabled(bool enabled) public onlyOwner {
        publicMintingEnabled = enabled;
        emit PublicMintingToggled(enabled);
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
