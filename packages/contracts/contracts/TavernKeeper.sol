// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract TavernKeeper is Initializable, ERC721Upgradeable, ERC721URIStorageUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
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

    function setKeepTokenContract(address _keepToken) public onlyOwner {
        require(_keepToken != address(0), "Invalid address");
        emit KeepTokenUpdated(keepToken, _keepToken);
        keepToken = _keepToken;
    }

    function safeMint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Initialize KEEP token data
        lastClaimTime[tokenId] = block.timestamp;
        mintingRate[tokenId] = DEFAULT_RATE;
        
        return tokenId;
    }

    function claimTokens(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(keepToken != address(0), "KeepToken not set");

        uint256 pending = calculatePendingTokens(tokenId);
        require(pending > 0, "No tokens pending");

        lastClaimTime[tokenId] = block.timestamp;
        
        // Call mint on KeepToken contract
        // We use a low-level call or interface here. Let's use interface.
        IKeepToken(keepToken).mint(msg.sender, pending);
        
        emit TokensClaimed(tokenId, pending);
    }

    function calculatePendingTokens(uint256 tokenId) public view returns (uint256) {
        if (lastClaimTime[tokenId] == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - lastClaimTime[tokenId];
        return timeElapsed * mintingRate[tokenId];
    }

    // The following functions are overrides required by Solidity.

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

    // --- The Office (King of the Hill) Mechanics ---
    address public currentKing;
    uint256 public currentPrice;
    uint256 public kingSince;
    uint256 public officeRate; // KEEP per second for the King

    event OfficeTaken(address indexed newKing, uint256 newPrice, uint256 paidAmount);
    event OfficeEarningsClaimed(address indexed king, uint256 amount);

    function initializeOffice(uint256 _startPrice, uint256 _rate) public onlyOwner {
        require(currentPrice == 0, "Already initialized");
        currentPrice = _startPrice;
        officeRate = _rate;
        currentKing = msg.sender; // Initial king
        kingSince = block.timestamp;
    }

    function takeOffice() public payable {
        require(msg.value >= currentPrice, "Insufficient payment");
        require(msg.sender != currentKing, "Already the King");

        // 1. Settle previous King's earnings
        uint256 timeHeld = block.timestamp - kingSince;
        if (timeHeld > 0 && currentKing != address(0)) {
            uint256 reward = timeHeld * officeRate;
            if (keepToken != address(0)) {
                IKeepToken(keepToken).mint(currentKing, reward);
                emit OfficeEarningsClaimed(currentKing, reward);
            }
        }

        // 2. Distribute Payment (ETH/MON)
        // 80% to previous King, 15% to Treasury, 5% to Dev/Contract
        uint256 payment = msg.value;
        uint256 toPrevKing = (payment * 80) / 100;
        uint256 toTreasury = (payment * 15) / 100;
        // Remaining 5% stays in contract or goes to owner

        if (currentKing != address(0)) {
            payable(currentKing).transfer(toPrevKing);
        } else {
            // If no previous king (first run), send to treasury
            toTreasury += toPrevKing;
        }

        // Send to treasury (assuming treasury is set on KeepToken, or we add a var here)
        // For now, send to owner() as treasury proxy if not defined
        payable(owner()).transfer(toTreasury);

        // 3. Update State
        currentKing = msg.sender;
        kingSince = block.timestamp;
        
        // Increase price by 10%
        currentPrice = (currentPrice * 110) / 100;

        emit OfficeTaken(msg.sender, currentPrice, payment);
    }

}

interface IKeepToken {
    function mint(address to, uint256 amount) external;
}
