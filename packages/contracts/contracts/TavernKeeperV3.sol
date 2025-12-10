// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title TavernKeeperV3
 * @notice Base contract for TavernKeeper upgrade chain (v4.2.0)
 * @dev Storage layout must match TavernKeeper exactly - only modifying claimTokens()
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * VERSION TRACKING - READ THIS BEFORE MAKING CHANGES
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * VERSION: v4.2.0
 * DEPLOYED: 2025-12-08
 * IMPLEMENTATION: 0x81146F855f5B0C567e9F0d3a2A082Aed81F34762
 * PROXY: 0x56B81A60Ae343342685911bd97D1331fF4fa2d29
 *
 * UPGRADE CHAIN:
 *   TavernKeeperV3 (v4.2.0) → TavernKeeperSetMinPrice (v4.3.0) [CURRENT]
 *
 * ⚠️  CRITICAL RULES FOR UPGRADES:
 *   1. ALWAYS check DEPLOYMENT_TRACKER.md to see what's actually deployed
 *   2. NEVER delete contracts in the active upgrade chain
 *   3. When creating a new upgrade:
 *      a. Create a NEW contract file (e.g., TavernKeeperV4.sol)
 *      b. Extend the CURRENT deployed version (check DEPLOYMENT_TRACKER.md)
 *      c. Update this header with new version info
 *      d. Update DEPLOYMENT_TRACKER.md immediately after deployment
 *      e. DELETE old unused contracts (not in the active chain)
 *   4. Storage layout MUST be preserved - use `npx hardhat storage-layout-diff`
 *   5. Mark functions as `virtual` if they need to be overridden
 *
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * CRITICAL: This upgrade disables the claimTokens() function that allowed NFTs to mint KEEP.
 * Only the Office (King of the Hill) should mint KEEP tokens, matching the donut-miner model.
 */
contract TavernKeeperV3 is Initializable, ERC721Upgradeable, ERC721URIStorageUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    using ECDSA for bytes32;

    uint256 private _nextTokenId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("InnKeeper TavernKeeper", "KEEPER");
        __ERC721URIStorage_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    // KEEP Token Integration
    address public keepToken;
    mapping(uint256 => uint256) public lastClaimTime;
    mapping(uint256 => uint256) public mintingRate; // Tokens per second
    uint256 public constant DEFAULT_RATE = 1e16; // 0.01 KEEP per second

    event TokensClaimed(uint256 indexed tokenId, uint256 amount);
    event KeepTokenUpdated(address indexed oldToken, address indexed newToken);
    event MetadataUpdated(uint256 indexed tokenId, string newUri);

    function setKeepTokenContract(address _keepToken) public onlyOwner {
        require(_keepToken != address(0), "Invalid address");
        emit KeepTokenUpdated(keepToken, _keepToken);
        keepToken = _keepToken;
    }

    // Pricing Tiers (in wei/MON) - DEPRECATED
    function initializeRPG() public reinitializer(3) {
        // Tier prices deprecated - using signature-based pricing
    }

    // Tier Thresholds
    uint256 public constant TIER1_MAX_ID = 100;
    uint256 public constant TIER2_MAX_ID = 1000;

    // Pricing Tiers (in wei/MON) - DEPRECATED but kept for storage compatibility
    uint256 public tier1Price;
    uint256 public tier2Price;
    uint256 public tier3Price;

    // Signature-based pricing
    address public signer; // Server address that signs prices
    mapping(address => uint256) public nonces; // Replay protection for signatures

    event TavernKeeperMinted(address indexed to, uint256 indexed tokenId, uint256 price);
    event TavernKeeperMintedWithSignature(address indexed to, uint256 indexed tokenId, uint256 price, uint256 nonce);
    event TierPricesUpdated(uint256 t1, uint256 t2, uint256 t3);
    event SignerUpdated(address newSigner);
    event WhitelistUpdated(address indexed account, bool isWhitelisted);
    event TavernKeeperMintedWhitelist(address indexed to, uint256 indexed tokenId);

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

    // Whitelist management
    function addToWhitelist(address account) external onlyOwner {
        require(account != address(0), "Invalid address");
        whitelist[account] = true;
        emit WhitelistUpdated(account, true);
    }

    function removeFromWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
        emit WhitelistUpdated(account, false);
    }

    function addToWhitelistBatch(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Invalid address");
            whitelist[accounts[i]] = true;
            emit WhitelistUpdated(accounts[i], true);
        }
    }

    function resetWhitelistMinted(address account) external onlyOwner {
        whitelistMinted[account] = false;
        emit WhitelistUpdated(account, false);
    }

    function mintTavernKeeperWhitelist(string memory uri) public returns (uint256) {
        require(whitelist[msg.sender], "Not whitelisted");
        require(!whitelistMinted[msg.sender], "Already minted");

        whitelistMinted[msg.sender] = true;

        uint256 tokenId = _nextTokenId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        // Initialize KEEP token data (kept for storage compatibility, but won't be used)
        lastClaimTime[tokenId] = block.timestamp;
        mintingRate[tokenId] = DEFAULT_RATE;

        _nextTokenId++;

        emit TavernKeeperMintedWhitelist(msg.sender, tokenId);
        return tokenId;
    }

    // DEPRECATED: Returns 0 - pricing is now signature-based
    function getMintPrice(uint256 tokenId) public view returns (uint256) {
        return 0;
    }

    function mintTavernKeeper(
        string memory uri,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) public payable returns (uint256) {
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

        nonces[msg.sender]++;

        require(msg.value == amount, "Incorrect payment amount");

        if (amount > 0) {
            (bool success, ) = payable(owner()).call{value: amount}("");
            require(success, "Owner transfer failed");
        }

        uint256 tokenId = _nextTokenId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        // Initialize KEEP token data (kept for storage compatibility, but won't be used)
        lastClaimTime[tokenId] = block.timestamp;
        mintingRate[tokenId] = DEFAULT_RATE;

        _nextTokenId++;

        emit TavernKeeperMintedWithSignature(msg.sender, tokenId, amount, nonces[msg.sender] - 1);
        return tokenId;
    }

    function safeMint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        // Initialize KEEP token data (kept for storage compatibility, but won't be used)
        lastClaimTime[tokenId] = block.timestamp;
        mintingRate[tokenId] = DEFAULT_RATE;

        return tokenId;
    }

    /**
     * @notice DISABLED: NFTs should not mint KEEP tokens
     * @dev This function now always reverts. Only the Office (King of the Hill) should mint KEEP.
     * @param tokenId Token ID (unused, kept for interface compatibility)
     */
    function claimTokens(uint256 tokenId) public {
        revert("TavernKeeper: NFT claimTokens() is disabled. Only the Office mints KEEP tokens.");
    }

    /**
     * @notice One-time migration function to claim pending KEEP for all existing NFTs
     * @dev Can only be called once by owner. Claims for all NFTs up to _nextTokenId.
     * This gives existing NFT owners the KEEP they accumulated before we disabled claiming.
     */
    function migrateClaimAllNFTs() external onlyOwner {
        require(!migrationClaimed, "Migration already completed");
        require(keepToken != address(0), "KeepToken not set");

        uint256 totalClaimed = 0;
        uint256 claimedCount = 0;

        // Claim for all existing NFTs
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (lastClaimTime[i] == 0) continue; // Skip if never initialized

            try this._migrateClaimSingle(i) returns (uint256 claimed) {
                if (claimed > 0) {
                    totalClaimed += claimed;
                    claimedCount++;
                }
            } catch {
                // Skip errors (e.g., token doesn't exist or already claimed)
                continue;
            }
        }

        migrationClaimed = true;
        emit TokensClaimed(type(uint256).max, totalClaimed); // Use max uint256 as special tokenId for migration
    }

    /**
     * @notice Internal function to claim for a single NFT (called via try/catch in migration)
     * @dev This is external so it can be called via try/catch from migrateClaimAllNFTs
     */
    function _migrateClaimSingle(uint256 tokenId) external returns (uint256) {
        require(msg.sender == address(this), "Only callable internally");
        require(keepToken != address(0), "KeepToken not set");

        // Check if token exists
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) return 0;

        // Check if has pending (using old calculation logic)
        if (lastClaimTime[tokenId] == 0) return 0;

        uint256 timeElapsed = block.timestamp - lastClaimTime[tokenId];
        uint256 pending = timeElapsed * mintingRate[tokenId];

        if (pending == 0) return 0;

        // Reset lastClaimTime to prevent double claiming
        lastClaimTime[tokenId] = block.timestamp;

        // Mint to NFT owner
        IKeepToken(keepToken).mint(owner, pending);

        emit TokensClaimed(tokenId, pending);
        return pending;
    }

    function updateTokenURI(uint256 tokenId, string memory newUri) public {
        require(_ownerOf(tokenId) == msg.sender, "TavernKeeper: Only token owner can update metadata");
        require(bytes(newUri).length > 0, "TavernKeeper: Metadata URI cannot be empty");

        _setTokenURI(tokenId, newUri);
        emit MetadataUpdated(tokenId, newUri);
    }

    /**
     * @notice View function kept for compatibility, but returns 0 since claiming is disabled
     */
    function calculatePendingTokens(uint256 tokenId) public view returns (uint256) {
        // Always return 0 - NFTs cannot claim tokens
        return 0;
    }

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

    // --- The Office (King of the Hill) Mechanics ---
    // Deprecated legacy storage (kept for slot alignment)
    address private currentKing;
    uint256 private currentPrice;
    uint256 private kingSince;
    uint256 private officeRate;

    // New Storage (Donut Miner Port)
    struct Slot0 {
        uint8 locked;
        uint16 epochId;
        uint192 initPrice;
        uint40 startTime;
        uint256 dps;
        address miner; // The King
        string uri;    // The Message
    }

    Slot0 public slot0;
    address public treasury;

    // Office reward claim tracking
    uint40 public officeLastClaimTime;

    // Constants
    uint256 public constant FEE = 2_000; // 20%
    uint256 public constant DIVISOR = 10_000;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant EPOCH_PERIOD = 1 hours;
    uint256 public constant PRICE_MULTIPLIER = 2e18;
    uint256 public constant NEW_PRICE_MULTIPLIER = 2e18;

    uint256 public constant MIN_INIT_PRICE = 1 ether; // 1 MON
    uint256 public constant ABS_MAX_INIT_PRICE = type(uint192).max;

    uint256 public constant INITIAL_DPS = 4 ether; // 4 KEEP per second
    uint256 public constant HALVING_PERIOD = 30 days;
    uint256 public constant TAIL_DPS = 0.01 ether;

    event OfficeTaken(address indexed newKing, uint256 newPrice, uint256 paidAmount, string uri);
    event OfficeEarningsClaimed(address indexed king, uint256 amount);
    event TreasuryFee(address indexed treasury, uint256 amount);
    event PreviousKingPaid(address indexed prevKing, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    error Reentrancy();
    error Expired();
    error EpochIdMismatch();
    error MaxPriceExceeded();
    error InvalidTreasury();

    modifier nonReentrant() {
        if (slot0.locked == 2) revert Reentrancy();
        slot0.locked = 2;
        _;
        slot0.locked = 1;
    }

    modifier nonReentrantView() {
        if (slot0.locked == 2) revert Reentrancy();
        _;
    }

    uint256 public v2StartTime;

    // Whitelist functionality
    mapping(address => bool) public whitelist;
    mapping(address => bool) public whitelistMinted;

    // Migration: Track if auto-claim has been run (placed at end for storage compatibility)
    bool public migrationClaimed;

    function initializeOfficeV2(address _treasury) public onlyOwner {
        require(treasury == address(0), "Already initialized V2");
        treasury = _treasury;
        v2StartTime = block.timestamp;

        slot0.initPrice = uint192(MIN_INIT_PRICE);
        slot0.startTime = uint40(block.timestamp);
        officeLastClaimTime = 0;
        slot0.miner = msg.sender;
        slot0.dps = INITIAL_DPS;
        slot0.epochId = 1;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryFee(_treasury, 0);
    }

    function _getDpsFromTime(uint256 time) internal view returns (uint256 dps) {
        if (v2StartTime == 0) return INITIAL_DPS;
        uint256 halvings = time <= v2StartTime ? 0 : (time - v2StartTime) / HALVING_PERIOD;
        dps = INITIAL_DPS >> halvings;
        if (dps < TAIL_DPS) dps = TAIL_DPS;
        return dps;
    }

    function takeOffice(
        uint256 epochId,
        uint256 deadline,
        uint256 maxPrice,
        string memory uri
    ) public payable virtual nonReentrant returns (uint256 price) {
        if (block.timestamp > deadline) revert Expired();

        Slot0 memory slot0Cache = slot0;

        if (epochId != 0 && uint16(epochId) != slot0Cache.epochId) revert EpochIdMismatch();

        price = _getPriceFromCache(slot0Cache);
        if (price > maxPrice) revert MaxPriceExceeded();
        if (msg.value < price) revert("Insufficient payment");

        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool successRefund, ) = payable(msg.sender).call{value: excess}("");
            require(successRefund, "Refund failed");
        }

        if (price > 0) {
            uint256 totalFee = price * FEE / DIVISOR;
            uint256 minerFee = price - totalFee;

            uint256 devFee = totalFee / 4;
            uint256 cellarFee = totalFee - devFee;

            (bool successDev, ) = payable(owner()).call{value: devFee}("");
            require(successDev, "Dev transfer failed");

            if (treasury != address(0)) {
                (bool successTreasury, ) = payable(treasury).call{value: cellarFee}("");
                require(successTreasury, "Treasury transfer failed");
                emit TreasuryFee(treasury, cellarFee);
            } else {
                (bool successOwner, ) = payable(owner()).call{value: cellarFee}("");
                require(successOwner, "Owner transfer failed");
            }

            if (slot0Cache.miner != address(0)) {
                (bool successMiner, ) = payable(slot0Cache.miner).call{value: minerFee}("");
                require(successMiner, "Miner transfer failed");
                emit PreviousKingPaid(slot0Cache.miner, minerFee);
            }
        }

        uint256 newInitPrice = price * NEW_PRICE_MULTIPLIER / PRECISION;

        if (newInitPrice > ABS_MAX_INIT_PRICE) {
            newInitPrice = ABS_MAX_INIT_PRICE;
        } else if (newInitPrice < MIN_INIT_PRICE) {
            newInitPrice = MIN_INIT_PRICE;
        }

        uint256 mineTime = block.timestamp - slot0Cache.startTime;
        uint256 minedAmount = mineTime * slot0Cache.dps;

        if (keepToken != address(0) && slot0Cache.miner != address(0)) {
            IKeepToken(keepToken).mint(slot0Cache.miner, minedAmount);
            emit OfficeEarningsClaimed(slot0Cache.miner, minedAmount);
        }

        unchecked {
            slot0Cache.epochId++;
        }
        slot0Cache.initPrice = uint192(newInitPrice);
        slot0Cache.startTime = uint40(block.timestamp);
        officeLastClaimTime = 0;
        slot0Cache.miner = msg.sender;
        slot0Cache.dps = _getDpsFromTime(block.timestamp);
        slot0Cache.uri = uri;

        slot0 = slot0Cache;

        emit OfficeTaken(msg.sender, price, price, uri);

        return price;
    }

    function _getPriceFromCache(Slot0 memory slot0Cache) internal view virtual returns (uint256) {
        uint256 timePassed = block.timestamp - slot0Cache.startTime;

        if (timePassed > EPOCH_PERIOD) {
            return MIN_INIT_PRICE;
        }

        uint256 calculatedPrice = slot0Cache.initPrice - slot0Cache.initPrice * timePassed / EPOCH_PERIOD;
        return calculatedPrice < MIN_INIT_PRICE ? MIN_INIT_PRICE : calculatedPrice;
    }

    function getPrice() external view nonReentrantView returns (uint256) {
        return _getPriceFromCache(slot0);
    }

    function getDps() external view nonReentrantView returns (uint256) {
        return slot0.dps;
    }

    function getSlot0() external view nonReentrantView returns (Slot0 memory) {
        return slot0;
    }

    function claimOfficeRewards() public nonReentrant {
        Slot0 memory slot0Cache = slot0;
        require(msg.sender == slot0Cache.miner, "Not current king");
        require(keepToken != address(0), "KeepToken not set");

        uint40 claimStartTime = officeLastClaimTime > 0
            ? officeLastClaimTime
            : slot0Cache.startTime;

        uint256 mineTime = block.timestamp - claimStartTime;
        require(mineTime > 0, "No time passed");

        uint256 minedAmount = mineTime * slot0Cache.dps;
        require(minedAmount > 0, "No rewards");

        officeLastClaimTime = uint40(block.timestamp);

        IKeepToken(keepToken).mint(msg.sender, minedAmount);
        emit OfficeEarningsClaimed(msg.sender, minedAmount);
    }

    function getPendingOfficeRewards() external view returns (uint256) {
        Slot0 memory slot0Cache = slot0;

        uint40 claimStartTime = officeLastClaimTime > 0
            ? officeLastClaimTime
            : slot0Cache.startTime;

        uint256 mineTime = block.timestamp - claimStartTime;

        if (mineTime <= 0) return 0;

        return mineTime * slot0Cache.dps;
    }

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

    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        address recipient = treasury != address(0) ? treasury : owner();

        (bool success, ) = payable(recipient).call{value: balance}("");
        require(success, "Withdrawal transfer failed");

        emit FundsWithdrawn(recipient, balance);
    }
}

interface IKeepToken {
    function mint(address to, uint256 amount) external;
}

