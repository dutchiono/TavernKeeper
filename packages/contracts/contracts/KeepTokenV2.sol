// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title KeepTokenV2
 * @notice Upgrade to add maximum supply cap (4 billion KEEP)
 * @dev Storage layout must match KeepToken exactly - only adding constant
 */
contract KeepTokenV2 is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    address public treasury;
    address public tavernKeeperContract;

    // Maximum supply: 4 billion KEEP (4,000,000,000 * 10^18)
    uint256 public constant MAX_SUPPLY = 4_000_000_000 * 1e18;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TavernKeeperContractUpdated(address indexed oldContract, address indexed newContract);
    event MaxSupplyExceeded(uint256 attemptedAmount, uint256 currentSupply, uint256 maxSupply);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _treasury, address _tavernKeeperContract) public initializer {
        __ERC20_init("Tavern Keeper", "KEEP");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        treasury = _treasury;
        tavernKeeperContract = _tavernKeeperContract;
    }

    modifier onlyTavernKeeper() {
        require(msg.sender == tavernKeeperContract, "Caller is not TavernKeeper");
        _;
    }

    /**
     * @notice Mint KEEP tokens with maximum supply cap
     * @dev Reverts if minting would exceed MAX_SUPPLY
     */
    function mint(address to, uint256 amount) public onlyTavernKeeper {
        uint256 currentSupply = totalSupply();
        uint256 newSupply = currentSupply + amount;

        require(newSupply <= MAX_SUPPLY, "KeepToken: Max supply exceeded");

        _mint(to, amount);
    }

    /**
     * @notice Get the maximum supply cap
     */
    function getMaxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    /**
     * @notice Get remaining mintable supply
     */
    function getRemainingSupply() external view returns (uint256) {
        uint256 currentSupply = totalSupply();
        if (currentSupply >= MAX_SUPPLY) {
            return 0;
        }
        return MAX_SUPPLY - currentSupply;
    }

    function setTreasury(address _treasury) public onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setTavernKeeperContract(address _contract) public onlyOwner {
        require(_contract != address(0), "Invalid contract address");
        emit TavernKeeperContractUpdated(tavernKeeperContract, _contract);
        tavernKeeperContract = _contract;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

