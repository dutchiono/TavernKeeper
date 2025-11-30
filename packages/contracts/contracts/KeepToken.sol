// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KeepToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    address public treasury;
    address public tavernKeeperContract;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TavernKeeperContractUpdated(address indexed oldContract, address indexed newContract);

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

    function mint(address to, uint256 amount) public onlyTavernKeeper {
        _mint(to, amount);
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
