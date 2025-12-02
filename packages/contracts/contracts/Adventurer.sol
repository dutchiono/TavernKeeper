// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IERC6551Registry.sol";

contract Adventurer is Initializable, ERC721Upgradeable, ERC721URIStorageUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    using ECDSA for bytes32;

    uint256 private _nextTokenId;
    bool public publicMintingEnabled;

    // Pricing Tiers (in wei/MON)
    // DEPRECATED: These are kept for storage compatibility but no longer used
    // Pricing now uses signature-based USD pricing
    uint256 public tier1Price;
    uint256 public tier2Price;
    uint256 public tier3Price;

    // DEPRECATED: No longer initializes tier prices
    // Signature-based pricing is used instead
    // This function is kept for storage compatibility but does nothing
    function initializeRPG() public reinitializer(2) {
        // Tier prices deprecated - using signature-based pricing
        // Keeping function for storage layout compatibility
    }

    // Tier Thresholds
    uint256 public constant TIER1_MAX_ID = 100;
    uint256 public constant TIER2_MAX_ID = 1000;

    // RPG Contracts
    address public tavernKeeperContract;
    address public erc6551Registry;
    address public erc6551AccountImpl;

    // State
    mapping(uint256 => bool) public freeHeroClaimed; // TavernKeeper TokenID -> Claimed

    // Signature-based pricing (V4)
    // IMPORTANT: These must be at the END of storage layout for upgrade compatibility
    address public signer; // Server address that signs prices
    mapping(address => uint256) public nonces; // Replay protection for signatures

    event HeroMinted(address indexed to, uint256 indexed tokenId, string metadataUri);
    event HeroMintedWithSignature(address indexed to, uint256 indexed tokenId, uint256 price, uint256 nonce);
    event MetadataUpdated(uint256 indexed tokenId, string newUri);
    event PublicMintingToggled(bool enabled);
    event HeroClaimed(uint256 indexed tavernKeeperId, uint256 indexed heroTokenId, address indexed tba);
    event TierPricesUpdated(uint256 t1, uint256 t2, uint256 t3);
    event ContractsUpdated(address tavernKeeper, address registry, address accountImpl);
    event SignerUpdated(address newSigner);

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



    // DEPRECATED: No longer used - pricing is now signature-based
    function setTierPrices(uint256 _t1, uint256 _t2, uint256 _t3) external onlyOwner {
        tier1Price = _t1;
        tier2Price = _t2;
        tier3Price = _t3;
        emit TierPricesUpdated(_t1, _t2, _t3);
    }

    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer address");
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function setContracts(address _tavernKeeper, address _registry, address _accountImpl) external onlyOwner {
        tavernKeeperContract = _tavernKeeper;
        erc6551Registry = _registry;
        erc6551AccountImpl = _accountImpl;
        emit ContractsUpdated(_tavernKeeper, _registry, _accountImpl);
    }

    // DEPRECATED: Returns 0 - pricing is now signature-based
    // Kept for backward compatibility
    function getMintPrice(uint256 tokenId) public view returns (uint256) {
        return 0; // Signature-based pricing - use getPriceSignature API instead
    }

    /**
     * @dev Claim a free hero for a TavernKeeper NFT.
     * Mints the hero directly to the TavernKeeper's TBA.
     */
    function claimFreeHero(uint256 tavernKeeperTokenId, string memory metadataUri) public returns (uint256) {
        require(tavernKeeperContract != address(0), "Contracts not set");
        require(IERC721(tavernKeeperContract).ownerOf(tavernKeeperTokenId) == msg.sender, "Not TavernKeeper owner");
        require(!freeHeroClaimed[tavernKeeperTokenId], "Free hero already claimed");

        // Compute TBA Address
        // We assume standard salt = 0 for the main account
        address tba = IERC6551Registry(erc6551Registry).account(
            erc6551AccountImpl,
            bytes32(0),
            block.chainid,
            tavernKeeperContract,
            tavernKeeperTokenId
        );

        // If TBA doesn't exist, we can still mint to it (it's a counterfactual address).
        // But ideally we might want to create it if it doesn't exist?
        // Actually, minting to it is fine. The user can create it later or we can create it here.
        // Creating it here costs gas. Let's just mint to the address.
        // Wait, if we mint to an address that has no code, can it hold NFTs? Yes.
        // Can the user access it? Only if they deploy the contract later.
        // Better UX: Deploy it if not deployed? Or just let the frontend handle deployment?
        // Let's just mint to the computed address.

        uint256 tokenId = _nextTokenId++;
        _safeMint(tba, tokenId);
        _setTokenURI(tokenId, metadataUri);

        freeHeroClaimed[tavernKeeperTokenId] = true;

        emit HeroClaimed(tavernKeeperTokenId, tokenId, tba);
        return tokenId;
    }

    /**
     * @dev Public minting function with signature-based pricing
     * @param to Address to mint the hero to (usually a TBA)
     * @param metadataUri URI pointing to JSON metadata (IPFS or server URL)
     * @param amount MON amount in wei (from signed price)
     * @param deadline Signature expiration timestamp
     * @param signature Server signature authorizing this price
     * @return tokenId The minted token ID
     */
    function mintHero(
        address to,
        string memory metadataUri,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) public payable returns (uint256) {
        require(publicMintingEnabled, "Adventurer: Public minting is disabled");
        require(bytes(metadataUri).length > 0, "Adventurer: Metadata URI cannot be empty");
        require(signer != address(0), "Signer not set");
        require(block.timestamp <= deadline, "Signature expired");

        // Verify Signature
        bytes32 hash = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                nonces[msg.sender],
                deadline,
                block.chainid,
                address(this)
            )
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(hash);
        address recoveredSigner = ethSignedMessageHash.recover(signature);

        require(recoveredSigner == signer, "Invalid signature");

        // Increment nonce to prevent replay
        nonces[msg.sender]++;

        // Verify payment amount matches signed amount
        require(msg.value == amount, "Incorrect payment amount");

        uint256 tokenId = _nextTokenId;

        _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        emit HeroMintedWithSignature(to, tokenId, amount, nonces[msg.sender] - 1);
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
    function getTokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 currentIndex = 0;
        uint256 currentId = 1;

        while (currentIndex < tokenCount && currentId < _nextTokenId) {
            if (_ownerOf(currentId) == owner) {
                tokenIds[currentIndex] = currentId;
                currentIndex++;
            }
            currentId++;
        }
        return tokenIds;
    }
}
