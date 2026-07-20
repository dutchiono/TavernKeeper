// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface INottToken {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SheriffsOffice
 * @notice Buy the office, tax the town, hold it until someone outbids you.
 *
 * A descending Dutch auction over a one-hour epoch. Whoever holds the office is the
 * sole minter of $NOTT, accruing until deposed. Taking the office pays out the sitting
 * sheriff and resets the asking price to 1.3x what was paid, which then decays linearly
 * back to the floor.
 *
 * Accrual is not flat: it halves each epoch a sheriff holds uncontested, resting at 10%
 * of the base rate. Emission therefore tracks how contested the office is rather than
 * how much time has passed, so a quiet market does not dilute holders. Taking the office
 * also burns NOTT, so supply responds to demand in both directions.
 *
 * Descends from TavernKeeper's "The Office" (itself a donut-miner port), extracted away
 * from the ERC721 and retargeted at Robinhood Chain. Ten deliberate divergences from that
 * lineage are marked FIX-1 .. FIX-10 below:
 *
 *   Correctness  FIX-2 (double-mint), FIX-3 (CEI), FIX-6 (payout griefing brick)
 *   Economic     FIX-1 (denomination), FIX-4 (curve), FIX-5 (activity-gated emission),
 *                FIX-8 (emission split), FIX-9 (price multiplier), FIX-10 (burn sink)
 *   Fairness     FIX-7 (no deployer premine)
 *
 * FIX-9 is the one that matters most: the Monad deployment was not exploited, it was
 * unbalanced, and NEW_PRICE_MULTIPLIER is the parameter that unbalanced it.
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

    /**
     * @notice Payouts that could not be delivered, withdrawable by their owner.
     * @dev FIX-6: every payout used to be a `require`-checked push. A sheriff that cannot
     *      receive ETH - a contract with no receive(), or one that reverts on purpose -
     *      made takeOffice() revert forever at the deposed-sheriff transfer, permanently
     *      bricking the office and leaving the griefer accruing at the floor rate with no
     *      way to depose them. Cost of the attack: one floor-priced takeover.
     *
     *      Failed sends are now escrowed here instead of reverting, and the gas stipend is
     *      capped so a receive() hook cannot burn the caller's gas either.
     */
    mapping(address => uint256) public credits;

    /// @notice Sum of all outstanding credits, so the owner sweep cannot touch them.
    uint256 public totalCredits;

    /**
     * @notice Pools the sheriff may direct emission incentives to.
     * @dev FIX-11: curated by the owner, chosen from by the sheriff. The sheriff must not
     *      be able to name an arbitrary address or the office becomes a way to mint to
     *      yourself for the floor price - the cheapest governance capture available.
     */
    mapping(address => bool) public eligiblePools;

    /// @notice The pool this sheriff is directing incentives to. Cleared on every takeover.
    address public favoredPool;

    /**
     * @notice Demand-adjusted auction floor.
     * @dev FIX-12: with a fixed floor, protocol revenue did not scale with success. FIX-9
     *      pins the multiplier at 1.3x, so the ask only escalates below ~14-minute
     *      turnover; at any realistic pace the price sat at the floor and the levy earned
     *      30% of $0.35 per takeover whether the game was thriving or dead - roughly $920
     *      a year at hourly turnover, identically at any volume.
     *
     *      The floor now retargets like a difficulty adjustment: one takeover per epoch is
     *      the target, faster raises it, slower lowers it. Price finds the level demand
     *      supports, so the levy scales with willingness to pay instead of being pinned to
     *      a constant. It is self-correcting - a floor that climbs too high slows turnover,
     *      which pulls it back down - and bounded on both sides regardless.
     */
    uint256 public floorPrice;

    // --- Economics ---
    // The levy: 30% of every sale, split 25% Coffers / 5% dev. The deposed sheriff
    // keeps 70%. Raised from the original 20% (15/5) to fund protocol-owned liquidity;
    // the deposed share stays high enough that buying in remains positive-sum.
    uint256 public constant COFFERS_BPS = 2_500;
    uint256 public constant DEV_BPS = 500;

    /// @notice Share of every mint routed to the Coffers, so the protocol accrues NOTT
    ///         alongside ETH and can seed liquidity without a premine.
    uint256 public constant EMISSION_COFFERS_BPS = 1_000; // 10%

    /**
     * @notice Share of emission the sitting sheriff may direct to an eligible pool.
     * @dev FIX-11: the answer to pairing NOTT against tokenized equities.
     *
     *      The protocol must never LP a stock token itself: MULTIPLIER_UPDATER_ROLE on
     *      those contracts rebases balances for splits and corporate actions, and a
     *      constant-product pool has no idea a split happened - arbitrageurs drain it at
     *      the stale ratio the moment it lands.
     *
     *      So the protocol LPs one canonical NOTT/ETH pool and nothing else. Stock pairs
     *      exist as third-party satellites whose LPs opted into rebase risk knowingly,
     *      and ordinary arbitrage against the canonical pool is what keeps every pair
     *      coherent - at no cost to the protocol, because the protocol is never the stale
     *      LP. Balancing N pairs is not something this contract has to do.
     *
     *      What the sheriff gets is the power to point *emission* at one satellite per
     *      reign. That is a real lever and a real "hot stocks get picked" signal, but it
     *      risks only capped emission, never treasury capital, and never LP exposure to a
     *      rebasing asset. Unspent, it falls through to the Coffers.
     *
     *      Note this is depth-gated in practice: splitting liquidity across N pairs
     *      multiplies slippage linearly, so satellites are only worth incentivising once
     *      the canonical pool is deep enough. That is an owner decision, expressed by
     *      which pools are marked eligible.
     */
    uint256 public constant EMISSION_FAVORED_BPS = 1_000; // 10%
    uint256 public constant DIVISOR = 10_000;
    uint256 public constant PRECISION = 1e18;

    uint256 public constant EPOCH_PERIOD = 1 hours;

    /**
     * @notice How far the asking price resets above what was just paid.
     * @dev FIX-9: this was 2e18, and it is the balance bug the Monad deployment actually
     *      suffered from. The deposed sheriff receives `MULTIPLIER * (1 - t/EPOCH)` of the
     *      price paid. At 2x, an instant flip returned 2 * 70% = 140% of cost - the taker
     *      got back MORE ETH than they paid AND kept the emission. Cost per NOTT went
     *      negative for any hold under ~15 minutes.
     *
     *      That is risk-free profit funded by the next buyer, so everyone races to flip.
     *      Turnover collapses below the escalation threshold and the price runs away: at
     *      2x, a takeover every 5 minutes reaches ~7,900 ETH within two and a half hours.
     *      A successful launch prices itself out, crashes back to the floor, repeats.
     *
     *      INVARIANT: MULTIPLIER * deposedShare < 1, i.e. holding the office must always
     *      cost something. deposedShare = 70%, so the multiplier must stay below 1/0.7
     *      (~1.428). 1.3x leaves margin: an instant flip returns 91%, a 9% cost for
     *      however much emission was earned. Enforced by a test.
     */
    uint256 public constant NEW_PRICE_MULTIPLIER = 1.3e18;

    /**
     * @notice Auction floor.
     * @dev FIX-1: the Monad deployment used `1 ether` == 1 MON. Robinhood Chain's native
     *      currency is ETH, so that same literal would price the floor in the thousands of
     *      dollars and double from there. Re-denominated to keep the floor at roughly the
     *      same real cost as the original.
     */
    uint256 public constant MIN_INIT_PRICE = 0.0001 ether;
    uint256 public constant ABS_MAX_INIT_PRICE = type(uint192).max;

    // --- Floor retargeting (FIX-12) ---
    /// @notice Ceiling on the adjusted floor, so a frenzy cannot price the office into orbit.
    uint256 public constant MAX_FLOOR_PRICE = 0.1 ether;

    /// @notice Target cadence the floor retargets toward: one takeover per epoch.
    uint256 public constant TARGET_INTERVAL = EPOCH_PERIOD;

    /// @dev Per-takeover clamp on the adjustment, so one outlier gap cannot reprice the
    ///      game. 1.25x up, 0.8x down - symmetric in log space.
    uint256 public constant FLOOR_STEP_UP_BPS = 12_500;
    uint256 public constant FLOOR_STEP_DOWN_BPS = 8_000;

    /**
     * @notice Ceiling on the asking price, as a multiple of the current floor.
     * @dev FIX-13: capping the floor was not enough. The ask is `1.3x the last price paid`
     *      and compounds independently, so any turnover faster than the escalation
     *      threshold (~14 min) still ran away - a takeover a minute compounds ~1.28x each
     *      time, which leaves the floor cap behind entirely.
     *
     *      With the floor now doing slow price discovery (FIX-12), the multiplier only
     *      needs to run the within-epoch auction, so pinning the ask to a band above the
     *      floor costs nothing and removes the last unbounded path. Max conceivable entry
     *      is MAX_FLOOR_PRICE * 4 = 0.4 ETH, and the bistable escalate-until-nobody-can-pay
     *      cycle cannot happen at any cadence.
     */
    uint256 public constant ASK_CEILING_BPS = 40_000; // 4x the floor

    // --- Emission ---
    /**
     * @notice Base emission rate, before within-reign decay.
     * @dev FIX-4: the original ran 4 NOTT/sec on a 30-day halving, which put 47.8% of all
     *      supply in month one and 86% inside a quarter - a launch-window lottery whose
     *      winners have nothing to do but sell into the pool. 0.5/sec on a 365-day halving
     *      emits the same ~22M total but front-loads only 5.9% in month one and 53% in
     *      year one.
     */
    uint256 public constant INITIAL_DPS = 0.5 ether;
    uint256 public constant HALVING_PERIOD = 365 days;
    uint256 public constant TAIL_DPS = 0.01 ether;

    // --- Within-reign decay ---
    /**
     * @dev FIX-5: emission was pure wall-clock, so an *uncontested* sheriff minted at full
     *      rate indefinitely - one address that paid the floor once could drain the schedule
     *      through any quiet stretch. Accrual now halves each epoch held without being
     *      deposed, resting at DECAY_FLOOR. Supply growth becomes activity-gated rather than
     *      time-gated: a dead market stops inflating, and the pressure is toward turnover,
     *      which is what actually generates the fees that fund liquidity.
     *
     *      Multiplier by epoch held: 100% / 50% / 25% / 12.5% / then 10% forever.
     *      A 30-day uncontested squat drops from ~1,296,000 NOTT to ~132,000.
     */
    uint256 public constant DECAY_EPOCHS = 4;         // halving steps before the floor
    uint256 public constant DECAY_FLOOR = 1e17;       // 10% of base rate, perpetual
    uint256 private constant DECAY_HEAD_SUM = 1.875e18; // sum of multipliers over epochs 0..3

    // --- Burn sink ---
    /**
     * @dev FIX-10: the token was mint-only, so nothing ever removed supply and NOTT had no
     *      job beyond being sold. Taking the office now also burns NOTT, which gives the
     *      token a use, creates structural buy pressure on the pool, and makes supply
     *      respond to demand in both directions.
     *
     *      The requirement is denominated in `dps * EPOCH_PERIOD` - one epoch of emission
     *      at the current base rate - so it tracks the schedule automatically and needs no
     *      price oracle. That denomination produces an exact equilibrium: a sheriff deposed
     *      after a full epoch earns dps*EPOCH, and the taker burns dps*EPOCH.
     *
     *        turnover     emitted/hr   burned/hr     net/hr
     *          5 min           1,800      21,600    -19,800
     *         30 min           1,800       3,600     -1,800
     *         60 min           1,800       1,800         +0
     *        120 min           1,350         900       +450
     *
     *      A hot market is net deflationary, a quiet one mildly inflationary, and one
     *      takeover per epoch is exactly neutral.
     */
    uint256 public constant BURN_ACTIVATION_SUPPLY = 250_000 ether;

    /**
     * @dev The requirement is also capped at 1/BURN_SUPPLY_CAP_DIVISOR of total supply, so
     *      it can never exceed what the market could plausibly hold. Without this, a
     *      collapse in circulating supply would make the office unaffordable to everyone
     *      and freeze it - the same permanent-brick failure mode as FIX-6, reached through
     *      economics rather than a revert.
     */
    uint256 public constant BURN_SUPPLY_CAP_DIVISOR = 100; // at most 1% of supply

    /// @dev Gas forwarded to a payout. Enough for a normal receive(), not enough to
    ///      let a hostile one burn the caller's gas.
    uint256 private constant SEND_GAS_STIPEND = 30_000;

    /// @dev Bounds the stored proclamation so reads stay cheap.
    uint256 public constant MAX_PROCLAMATION_BYTES = 256;

    event OfficeTaken(address indexed sheriff, address indexed deposed, uint256 price, string proclamation);
    event RewardsClaimed(address indexed sheriff, uint256 amount);
    event TreasuryPaid(address indexed treasury, uint256 amount);
    event DeposedPaid(address indexed deposed, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event PayoutCredited(address indexed to, uint256 amount);
    event CreditsWithdrawn(address indexed to, uint256 amount);
    event EmissionToCoffers(address indexed treasury, uint256 amount);
    event BurnedForOffice(address indexed sheriff, uint256 amount);
    event PoolEligibilityChanged(address indexed pool, bool eligible);
    event FavoredPoolSet(address indexed sheriff, address indexed pool);
    event EmissionToPool(address indexed pool, uint256 amount);
    event FloorAdjusted(uint256 previousFloor, uint256 newFloor, uint256 elapsed);

    error Reentrancy();
    error Expired();
    error EpochIdMismatch();
    error MaxPriceExceeded();
    error InsufficientPayment();
    error ProclamationTooLong();
    error NotSheriff();
    error NothingAccrued();
    error TransferFailed();
    error InsufficientNott(uint256 required, uint256 held);
    error PoolNotEligible(address pool);

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
        floorPrice = MIN_INIT_PRICE;
        slot0.initPrice = uint192(MIN_INIT_PRICE);
        slot0.startTime = uint40(block.timestamp);
        slot0.dps = INITIAL_DPS;
        // FIX-7: the original seated the deployer as the opening sheriff, who then accrued
        // from deployment until the first takeover - a stealth premine proportional to how
        // long launch took. The office starts vacant instead; nothing accrues until someone
        // actually buys it.
        slot0.sheriff = address(0);
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

    /// @dev Accrual multiplier for the n-th epoch of a reign, 1e18-scaled.
    function _decayMultiplier(uint256 epoch) private pure returns (uint256) {
        if (epoch >= DECAY_EPOCHS) return DECAY_FLOOR;
        return PRECISION >> epoch; // 1e18 / 5e17 / 2.5e17 / 1.25e17, all exact
    }

    /**
     * @notice Decay-weighted seconds elapsed `x` seconds into a reign, 1e18-scaled.
     * @dev The integral of the decay curve from 0 to x. Expressing accrual as a cumulative
     *      function is what lets mid-reign claims compose correctly: any claim is simply
     *      F(now) - F(last), so the decay is measured from the reign's start no matter how
     *      often the sheriff draws. Closed-form past the floor, so a long reign costs no
     *      more gas than a short one.
     */
    function _weightedSeconds(uint256 x) private pure returns (uint256 w) {
        uint256 epoch = x / EPOCH_PERIOD;
        uint256 remainder = x % EPOCH_PERIOD;

        if (epoch >= DECAY_EPOCHS) {
            w = EPOCH_PERIOD * DECAY_HEAD_SUM;
            w += (epoch - DECAY_EPOCHS) * EPOCH_PERIOD * DECAY_FLOOR;
        } else {
            for (uint256 i = 0; i < epoch; ++i) {
                w += EPOCH_PERIOD * _decayMultiplier(i);
            }
        }

        w += remainder * _decayMultiplier(epoch);
    }

    /**
     * @notice Mints accrued NOTT, routing a slice to the Coffers.
     * @dev FIX-8: with no premine (FIX-7) and minting gated to the office, the protocol
     *      owned zero NOTT and could never seed a pool - the Coffers accumulated ETH with
     *      nothing to pair it against, and buying NOTT requires a pool to already exist.
     *      Routing a slice of every mint to the Coffers means the treasury accrues *both*
     *      sides of the pair organically, so liquidity can be seeded without a premine.
     */
    function _mintAccrued(address sheriff, uint256 owed) private {
        if (owed == 0) return;

        uint256 toCoffers = (owed * EMISSION_COFFERS_BPS) / DIVISOR;
        uint256 toFavored = (owed * EMISSION_FAVORED_BPS) / DIVISOR;
        uint256 toSheriff = owed - toCoffers - toFavored;

        INottToken(token).mint(sheriff, toSheriff);
        emit RewardsClaimed(sheriff, toSheriff);

        address pool = favoredPool;
        // Re-check eligibility at mint time: a pool revoked mid-reign must stop earning
        // immediately rather than paying out until the next takeover.
        if (toFavored > 0 && pool != address(0) && eligiblePools[pool]) {
            INottToken(token).mint(pool, toFavored);
            emit EmissionToPool(pool, toFavored);
        } else {
            toCoffers += toFavored; // undirected emission falls through to the Coffers
        }

        if (toCoffers > 0) {
            INottToken(token).mint(treasury, toCoffers);
            emit EmissionToCoffers(treasury, toCoffers);
        }
    }

    /// @notice Curate which pools a sheriff may direct emission to.
    function setPoolEligibility(address pool, bool eligible) external onlyOwner {
        if (pool == address(0)) revert PoolNotEligible(pool);
        eligiblePools[pool] = eligible;
        emit PoolEligibilityChanged(pool, eligible);
    }

    /// @notice Point this reign's incentive slice at an eligible pool.
    function setFavoredPool(address pool) external {
        if (msg.sender != slot0.sheriff) revert NotSheriff();
        if (pool != address(0) && !eligiblePools[pool]) revert PoolNotEligible(pool);

        favoredPool = pool;
        emit FavoredPoolSet(msg.sender, pool);
    }

    /**
     * @notice NOTT that must be burned to take the office right now.
     * @dev Zero until circulating supply reaches BURN_ACTIVATION_SUPPLY - at genesis
     *      nobody holds any NOTT, so requiring a burn immediately would make the office
     *      unclaimable and the token unmintable, deadlocking the launch.
     */
    function currentBurnRequirement() public view returns (uint256) {
        uint256 supply = INottToken(token).totalSupply();
        if (supply < BURN_ACTIVATION_SUPPLY) return 0;

        uint256 scheduled = slot0.dps * EPOCH_PERIOD;
        uint256 cap = supply / BURN_SUPPLY_CAP_DIVISOR;
        return scheduled < cap ? scheduled : cap;
    }

    /// @notice NOTT owed to the sitting sheriff for the unclaimed part of the current reign.
    function _accrued(Slot0 memory s) private view returns (uint256) {
        if (s.sheriff == address(0)) return 0; // vacant office accrues to nobody
        uint256 reignStart = s.startTime;
        uint256 from = _accrualStart(s) - reignStart;
        uint256 to = block.timestamp - reignStart;
        return ((_weightedSeconds(to) - _weightedSeconds(from)) * s.dps) / PRECISION;
    }

    function _dpsAt(uint256 time) private view returns (uint256 dps) {
        uint256 halvings = time <= genesisTime ? 0 : (time - genesisTime) / HALVING_PERIOD;
        // Past 255 halvings the shift is undefined; emission is long since at the tail.
        if (halvings > 255) return TAIL_DPS;

        dps = INITIAL_DPS >> halvings;
        return dps < TAIL_DPS ? TAIL_DPS : dps;
    }

    function _priceOf(Slot0 memory s) private view returns (uint256) {
        uint256 floor = floorPrice;
        uint256 elapsed = block.timestamp - s.startTime;
        if (elapsed >= EPOCH_PERIOD) return floor;

        uint256 price = s.initPrice - (uint256(s.initPrice) * elapsed) / EPOCH_PERIOD;
        return price < floor ? floor : price;
    }

    /**
     * @notice Retarget the floor toward one takeover per epoch.
     * @dev Proportional, so it is self-correcting: half the target interval doubles the
     *      pressure, twice the interval halves it. Clamped per step and absolutely.
     */
    function _adjustFloor(uint256 elapsed) private {
        uint256 current = floorPrice;
        if (elapsed == 0) elapsed = 1; // same-block takeover

        uint256 next = (current * TARGET_INTERVAL) / elapsed;

        uint256 upper = (current * FLOOR_STEP_UP_BPS) / DIVISOR;
        uint256 lower = (current * FLOOR_STEP_DOWN_BPS) / DIVISOR;
        if (next > upper) next = upper;
        else if (next < lower) next = lower;

        if (next > MAX_FLOOR_PRICE) next = MAX_FLOOR_PRICE;
        if (next < MIN_INIT_PRICE) next = MIN_INIT_PRICE;

        if (next != current) {
            floorPrice = next;
            emit FloorAdjusted(current, next, elapsed);
        }
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

        // Burn the taker's NOTT before anything else changes hands, so a shortfall aborts
        // cleanly rather than part-way through the settlement.
        uint256 burnAmount = currentBurnRequirement();
        if (burnAmount > 0) {
            uint256 held = INottToken(token).balanceOf(msg.sender);
            if (held < burnAmount) revert InsufficientNott(burnAmount, held);

            INottToken(token).burnFrom(msg.sender, burnAmount);
            emit BurnedForOffice(msg.sender, burnAmount);
        }

        // Settle the outgoing sheriff's mining before the seat changes hands.
        uint256 owed = _accrued(s);
        if (owed > 0 && s.sheriff != address(0)) {
            _mintAccrued(s.sheriff, owed);
        }

        // FIX-3: the original paid out the fee split and the deposed sheriff *before*
        // writing slot0, leaving the contract in a pre-takeover state across four external
        // calls. It was safe only because of the reentrancy guard. State is now advanced
        // first so the guard is a backstop rather than the sole defence.
        // Retarget the floor on the interval just observed, then clamp the new ask to it.
        _adjustFloor(block.timestamp - s.startTime);

        uint256 newInitPrice = (price * NEW_PRICE_MULTIPLIER) / PRECISION;

        uint256 ceiling = (floorPrice * ASK_CEILING_BPS) / DIVISOR;
        if (newInitPrice > ceiling) newInitPrice = ceiling;
        if (newInitPrice > ABS_MAX_INIT_PRICE) newInitPrice = ABS_MAX_INIT_PRICE;
        else if (newInitPrice < floorPrice) newInitPrice = floorPrice;

        unchecked { s.epochId++; }
        s.initPrice = uint192(newInitPrice);
        s.startTime = uint40(block.timestamp);
        s.dps = _dpsAt(block.timestamp);
        s.sheriff = msg.sender;
        s.proclamation = proclamation;
        slot0 = s;
        lastClaimTime = 0;
        favoredPool = address(0); // each sheriff makes their own pick

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
            uint256 devCut = (price * DEV_BPS) / DIVISOR;
            uint256 coffers = (price * COFFERS_BPS) / DIVISOR;
            uint256 toDeposed = price - devCut - coffers;

            _send(owner(), devCut);
            _send(treasury, coffers);
            emit TreasuryPaid(treasury, coffers);

            if (deposed != address(0)) {
                _send(deposed, toDeposed);
                emit DeposedPaid(deposed, toDeposed);
            } else {
                // Office was vacant: nobody to depose, so the whole share goes to the Coffers.
                _send(treasury, toDeposed);
                emit TreasuryPaid(treasury, toDeposed);
            }
        }

        if (excess > 0) _send(msg.sender, excess);
    }

    /// @dev Never reverts. A failed payout is escrowed rather than blocking the caller.
    function _send(address to, uint256 amount) private {
        if (amount == 0 || to == address(0)) return;

        (bool ok, ) = payable(to).call{value: amount, gas: SEND_GAS_STIPEND}("");
        if (!ok) {
            credits[to] += amount;
            totalCredits += amount;
            emit PayoutCredited(to, amount);
        }
    }

    /// @notice Withdraw a payout that could not be delivered at the time it was owed.
    function withdrawCredits() external nonReentrant {
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert NothingAccrued();

        credits[msg.sender] = 0;
        totalCredits -= amount;
        // Full gas here: the recipient asked for this, so a costly fallback is their problem.
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit CreditsWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Draw accrued NOTT without giving up the seat.
     * @dev Shares _accrualStart() with takeOffice(), so claiming here correctly reduces
     *      the payout on eventual deposition rather than stacking with it.
     */
    function claimRewards() external nonReentrant {
        Slot0 memory s = slot0;
        if (msg.sender != s.sheriff) revert NotSheriff();

        uint256 owed = _accrued(s);
        if (owed == 0) revert NothingAccrued();

        lastClaimTime = uint40(block.timestamp);
        _mintAccrued(msg.sender, owed);
    }

    // --- Views ---

    function pendingRewards() external view returns (uint256) {
        Slot0 memory s = slot0;
        return _accrued(s);
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
            _accrued(s),
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
        // Escrowed payouts belong to their owners, not the treasury.
        uint256 balance = address(this).balance - totalCredits;
        require(balance > 0, "Office: nothing to withdraw");

        address to = treasury != address(0) ? treasury : owner();
        _send(to, balance);
        emit FundsWithdrawn(to, balance);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
