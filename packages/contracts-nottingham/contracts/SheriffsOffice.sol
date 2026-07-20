// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface INottToken {
    function mint(address to, uint256 amount) external;
}

/**
 * @title SheriffsOffice
 * @notice Buy the office, tax the town, hold it until someone outbids you.
 *
 * A descending Dutch auction over a one-hour epoch. Whoever holds the office is the
 * sole minter of $NOTT, accruing at `dps` per second until deposed. Taking the office
 * pays out the sitting sheriff and resets the asking price to 2x what was paid, which
 * then decays linearly back to the floor.
 *
 * Descends from TavernKeeper's "The Office" (itself a donut-miner port), extracted away
 * from the ERC721 and retargeted at Robinhood Chain. Three deliberate divergences from
 * that lineage are marked FIX-1 / FIX-2 / FIX-3 below.
 */
contract SheriffsOffice is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    struct Slot0 {
        uint8 locked;
        uint16 epochId;
        uint192 initPrice;
        uint40 startTime;
        uint256 dps;
        address sheriff;
        string proclamation;
    }

    Slot0 public slot0;

    /// @notice $NOTT. The office is its only minter.
    address public token;

    /// @notice The Coffers - receives the treasury share of every sale.
    address public treasury;

    /// @notice Last time the *sitting* sheriff drew rewards. Reset on each takeover.
    uint40 public lastClaimTime;

    /// @notice Deployment timestamp; halvings are measured from here.
    uint256 public genesisTime;

    // --- Economics ---
    uint256 public constant FEE = 2_000;      // 20% of every sale is taxed
    uint256 public constant DIVISOR = 10_000;
    uint256 public constant PRECISION = 1e18;

    uint256 public constant EPOCH_PERIOD = 1 hours;
    uint256 public constant NEW_PRICE_MULTIPLIER = 2e18; // asking price resets to 2x paid

    /**
     * @notice Auction floor.
     * @dev FIX-1: the Monad deployment used `1 ether` == 1 MON. Robinhood Chain's native
     *      currency is ETH, so that same literal would price the floor in the thousands of
     *      dollars and double from there. Re-denominated to keep the floor at roughly the
     *      same real cost as the original.
     */
    uint256 public constant MIN_INIT_PRICE = 0.0001 ether;
    uint256 public constant ABS_MAX_INIT_PRICE = type(uint192).max;

    // --- Emission ---
    uint256 public constant INITIAL_DPS = 4 ether;   // 4 NOTT per second
    uint256 public constant HALVING_PERIOD = 30 days;
    uint256 public constant TAIL_DPS = 0.01 ether;

    /// @dev Bounds the stored proclamation so reads stay cheap.
    uint256 public constant MAX_PROCLAMATION_BYTES = 256;

    event OfficeTaken(address indexed sheriff, address indexed deposed, uint256 price, string proclamation);
    event RewardsClaimed(address indexed sheriff, uint256 amount);
    event TreasuryPaid(address indexed treasury, uint256 amount);
    event DeposedPaid(address indexed deposed, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FundsWithdrawn(address indexed to, uint256 amount);

    error Reentrancy();
    error Expired();
    error EpochIdMismatch();
    error MaxPriceExceeded();
    error InsufficientPayment();
    error ProclamationTooLong();
    error NotSheriff();
    error NothingAccrued();
    error TransferFailed();

    modifier nonReentrant() {
        if (slot0.locked == 2) revert Reentrancy();
        slot0.locked = 2;
        _;
        slot0.locked = 1;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _token, address _treasury) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        require(_token != address(0), "Office: invalid token");
        require(_treasury != address(0), "Office: invalid treasury");

        token = _token;
        treasury = _treasury;
        genesisTime = block.timestamp;

        slot0.locked = 1;
        slot0.epochId = 1;
        slot0.initPrice = uint192(MIN_INIT_PRICE);
        slot0.startTime = uint40(block.timestamp);
        slot0.dps = INITIAL_DPS;
        slot0.sheriff = msg.sender;
        lastClaimTime = 0;
    }

    // --- Accrual ---

    /**
     * @notice Start of the sitting sheriff's unclaimed window.
     * @dev FIX-2: the original computed takeOffice()'s payout from `startTime` while
     *      claimOfficeRewards() computed from `officeLastClaimTime`. A sheriff who claimed
     *      mid-reign was therefore paid twice for the same seconds - claim at t=1800, get
     *      deposed at t=3600, and the payout covered 0..3600 on top of the 0..1800 already
     *      drawn. Both paths now share this helper, so every second is paid exactly once.
     *
     *      The `>` comparison (rather than `!= 0`) also makes a stale lastClaimTime from a
     *      prior reign harmless, independent of the reset in takeOffice().
     */
    function _accrualStart(Slot0 memory s) private view returns (uint256) {
        return lastClaimTime > s.startTime ? lastClaimTime : s.startTime;
    }

    function _dpsAt(uint256 time) private view returns (uint256 dps) {
        uint256 halvings = time <= genesisTime ? 0 : (time - genesisTime) / HALVING_PERIOD;
        // Past 255 halvings the shift is undefined; emission is long since at the tail.
        if (halvings > 255) return TAIL_DPS;

        dps = INITIAL_DPS >> halvings;
        return dps < TAIL_DPS ? TAIL_DPS : dps;
    }

    function _priceOf(Slot0 memory s) private view returns (uint256) {
        uint256 elapsed = block.timestamp - s.startTime;
        if (elapsed >= EPOCH_PERIOD) return MIN_INIT_PRICE;

        uint256 price = s.initPrice - (uint256(s.initPrice) * elapsed) / EPOCH_PERIOD;
        return price < MIN_INIT_PRICE ? MIN_INIT_PRICE : price;
    }

    // --- Core ---

    /**
     * @notice Seize the office, deposing the sitting sheriff.
     * @param epochId Expected epoch; pass 0 to skip the check. Guards against being
     *                front-run into a different auction than the one quoted.
     * @param deadline Latest timestamp this call may execute.
     * @param maxPrice Most the caller will pay.
     * @param proclamation Message pinned to the office for the duration of the reign.
     */
    function takeOffice(
        uint256 epochId,
        uint256 deadline,
        uint256 maxPrice,
        string calldata proclamation
    ) external payable nonReentrant returns (uint256 price) {
        if (block.timestamp > deadline) revert Expired();
        if (bytes(proclamation).length > MAX_PROCLAMATION_BYTES) revert ProclamationTooLong();

        Slot0 memory s = slot0;
        if (epochId != 0 && uint16(epochId) != s.epochId) revert EpochIdMismatch();

        address deposed = s.sheriff;
        price = _priceOf(s);
        if (price > maxPrice) revert MaxPriceExceeded();
        if (msg.value < price) revert InsufficientPayment();

        // Settle the outgoing sheriff's mining before the seat changes hands.
        uint256 owed = (block.timestamp - _accrualStart(s)) * s.dps;
        if (owed > 0 && s.sheriff != address(0)) {
            INottToken(token).mint(s.sheriff, owed);
            emit RewardsClaimed(s.sheriff, owed);
        }

        // FIX-3: the original paid out the fee split and the deposed sheriff *before*
        // writing slot0, leaving the contract in a pre-takeover state across four external
        // calls. It was safe only because of the reentrancy guard. State is now advanced
        // first so the guard is a backstop rather than the sole defence.
        uint256 newInitPrice = (price * NEW_PRICE_MULTIPLIER) / PRECISION;
        if (newInitPrice > ABS_MAX_INIT_PRICE) newInitPrice = ABS_MAX_INIT_PRICE;
        else if (newInitPrice < MIN_INIT_PRICE) newInitPrice = MIN_INIT_PRICE;

        unchecked { s.epochId++; }
        s.initPrice = uint192(newInitPrice);
        s.startTime = uint40(block.timestamp);
        s.dps = _dpsAt(block.timestamp);
        s.sheriff = msg.sender;
        s.proclamation = proclamation;
        slot0 = s;
        lastClaimTime = 0;

        _settle(deposed, price, msg.value);
        emit OfficeTaken(msg.sender, deposed, price, proclamation);
        return price;
    }

    /**
     * @dev Splits the sale between the deposed sheriff, the dev and the Coffers,
     *      then refunds any overpayment.
     */
    function _settle(address deposed, uint256 price, uint256 paid) private {
        uint256 excess = paid - price;

        if (price > 0) {
            uint256 tax = (price * FEE) / DIVISOR;
            uint256 toDeposed = price - tax;
            uint256 devCut = tax / 4;
            uint256 coffers = tax - devCut;

            _send(owner(), devCut);
            _send(treasury, coffers);
            emit TreasuryPaid(treasury, coffers);

            if (deposed != address(0)) {
                _send(deposed, toDeposed);
                emit DeposedPaid(deposed, toDeposed);
            }
        }

        if (excess > 0) _send(msg.sender, excess);
    }

    function _send(address to, uint256 amount) private {
        if (amount == 0 || to == address(0)) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * @notice Draw accrued NOTT without giving up the seat.
     * @dev Shares _accrualStart() with takeOffice(), so claiming here correctly reduces
     *      the payout on eventual deposition rather than stacking with it.
     */
    function claimRewards() external nonReentrant {
        Slot0 memory s = slot0;
        if (msg.sender != s.sheriff) revert NotSheriff();

        uint256 owed = (block.timestamp - _accrualStart(s)) * s.dps;
        if (owed == 0) revert NothingAccrued();

        lastClaimTime = uint40(block.timestamp);
        INottToken(token).mint(msg.sender, owed);
        emit RewardsClaimed(msg.sender, owed);
    }

    // --- Views ---

    function pendingRewards() external view returns (uint256) {
        Slot0 memory s = slot0;
        return (block.timestamp - _accrualStart(s)) * s.dps;
    }

    function getPrice() external view returns (uint256) {
        return _priceOf(slot0);
    }

    function getDps() external view returns (uint256) {
        return slot0.dps;
    }

    function getSlot0() external view returns (Slot0 memory) {
        return slot0;
    }

    /// @notice Everything a client needs to render the office in one call.
    function officeState()
        external
        view
        returns (
            address sheriff,
            uint256 price,
            uint256 dps,
            uint256 pending,
            uint16 epochId,
            uint40 startTime,
            string memory proclamation
        )
    {
        Slot0 memory s = slot0;
        return (
            s.sheriff,
            _priceOf(s),
            s.dps,
            (block.timestamp - _accrualStart(s)) * s.dps,
            s.epochId,
            s.startTime,
            s.proclamation
        );
    }

    // --- Admin ---

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Office: invalid treasury");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    /// @notice Sweeps any ETH stranded by a failed payout path.
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Office: nothing to withdraw");

        address to = treasury != address(0) ? treasury : owner();
        _send(to, balance);
        emit FundsWithdrawn(to, balance);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
