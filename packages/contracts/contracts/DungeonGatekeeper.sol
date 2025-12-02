// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract DungeonGatekeeper is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    address public signer; // Server address that signs prices
    address public treasury; // Where funds go

    mapping(address => uint256) public nonces;

    event DungeonEntered(address indexed user, address token, uint256 amount, uint256 nonce);
    event SignerUpdated(address newSigner);
    event TreasuryUpdated(address newTreasury);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _signer, address _treasury) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        signer = _signer;
        treasury = _treasury;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    /**
     * @dev Enter dungeon by paying the signed price.
     * @param token Payment token address (address(0) for Native MON)
     * @param amount Amount to pay
     * @param deadline Timestamp when signature expires
     * @param signature Server signature authorizing this price
     */
    function enterDungeon(
        address token,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external payable {
        require(block.timestamp <= deadline, "Signature expired");

        // Verify Signature
        bytes32 hash = keccak256(
            abi.encodePacked(
                msg.sender,
                token,
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

        // Handle Payment
        if (token == address(0)) {
            require(msg.value == amount, "Incorrect MON amount");
            (bool success, ) = treasury.call{value: amount}("");
            require(success, "Treasury transfer failed");
        } else {
            require(msg.value == 0, "Do not send MON with token payment");
            IERC20(token).safeTransferFrom(msg.sender, treasury, amount);
        }

        emit DungeonEntered(msg.sender, token, amount, nonces[msg.sender] - 1);
    }

    /**
     * @dev Fallback for simple fixed price (Admin Oracle) if signature system is down/not used yet.
     * Only owner can set this price.
     */
    uint256 public fixedMonPrice;
    uint256 public fixedKeepPrice;
    address public keepToken;

    function setFixedPrices(uint256 _monPrice, uint256 _keepPrice, address _keepToken) external onlyOwner {
        fixedMonPrice = _monPrice;
        fixedKeepPrice = _keepPrice;
        keepToken = _keepToken;
    }

    function enterDungeonFixed(address token) external payable {
        if (token == address(0)) {
            require(fixedMonPrice > 0, "Fixed pricing disabled");
            require(msg.value == fixedMonPrice, "Incorrect MON amount");
            (bool success, ) = treasury.call{value: msg.value}("");
            require(success, "Treasury transfer failed");
        } else {
            require(token == keepToken, "Invalid token");
            require(fixedKeepPrice > 0, "Fixed pricing disabled");
            IERC20(token).safeTransferFrom(msg.sender, treasury, fixedKeepPrice);
        }

        emit DungeonEntered(msg.sender, token, token == address(0) ? msg.value : fixedKeepPrice, nonces[msg.sender]);
        nonces[msg.sender]++;
    }
}
