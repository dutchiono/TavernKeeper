// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title NottToken
 * @notice $NOTT - the coin of Nottingham. Minted exclusively by the Sheriff's Office.
 * @dev Mirrors KeepTokenV2's shape (UUPS + supply cap + single authorised minter),
 *      but the minter is the SheriffsOffice rather than an NFT contract.
 */
contract NottToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @notice Receives the treasury share of office sales (the Coffers).
    address public treasury;

    /// @notice The only address permitted to mint. Set to the SheriffsOffice proxy.
    address public sheriffsOffice;

    /**
     * @notice Hard supply ceiling: 100 million NOTT.
     * @dev The halving schedule emits ~20.7M over its lifetime plus a perpetual tail
     *      of 0.01/sec (~315k/yr), so this leaves roughly 250 years of tail headroom.
     *      It exists as a backstop against a misconfigured DPS, not as a binding limit.
     */
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event SheriffsOfficeUpdated(address indexed oldOffice, address indexed newOffice);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _treasury) public initializer {
        __ERC20_init("Nottingham", "NOTT");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        require(_treasury != address(0), "NOTT: invalid treasury");
        treasury = _treasury;
    }

    modifier onlySheriffsOffice() {
        require(msg.sender == sheriffsOffice, "NOTT: caller is not the Sheriff's Office");
        _;
    }

    /**
     * @notice Mint NOTT to a departing or sitting sheriff.
     * @dev Clamps to MAX_SUPPLY rather than reverting: a revert here would brick
     *      takeOffice() permanently once the cap is reached, freezing the office.
     */
    function mint(address to, uint256 amount) external onlySheriffsOffice {
        uint256 supply = totalSupply();
        if (supply >= MAX_SUPPLY) return;

        uint256 remaining = MAX_SUPPLY - supply;
        if (amount > remaining) amount = remaining;
        if (amount == 0) return;

        _mint(to, amount);
    }

    /**
     * @notice Burn NOTT from an address as part of taking the office.
     * @dev No allowance required. The office is already the sole minter, and the only
     *      caller path is takeOffice(), which the burned address invoked itself - an
     *      approve step would be pure friction for a burn the user is initiating.
     */
    function burnFrom(address from, uint256 amount) external onlySheriffsOffice {
        if (amount == 0) return;
        _burn(from, amount);
    }

    function getRemainingSupply() external view returns (uint256) {
        uint256 supply = totalSupply();
        return supply >= MAX_SUPPLY ? 0 : MAX_SUPPLY - supply;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "NOTT: invalid treasury");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setSheriffsOffice(address _office) external onlyOwner {
        require(_office != address(0), "NOTT: invalid office");
        emit SheriffsOfficeUpdated(sheriffsOffice, _office);
        sheriffsOffice = _office;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
