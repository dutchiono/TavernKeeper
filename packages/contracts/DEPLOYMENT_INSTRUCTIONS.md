# Contract Deployment Instructions

## ⚠️ CRITICAL WARNING

**DO NOT DEPLOY CONTRACTS UNTIL THEY ARE CONVERTED TO UUPS PROXY PATTERN**

The current contracts are **NOT upgradeable**. They must be converted to UUPS before deployment.

---

## Pre-Deployment Requirements

### 1. Convert Contracts to UUPS

All game contracts (KeepToken, Inventory, Adventurer, TavernKeeper) need to be converted to use OpenZeppelin's UUPS upgradeable pattern.

**Required Changes:**
- Use `@openzeppelin/contracts-upgradeable` instead of `@openzeppelin/contracts`
- Extend `ERC20Upgradeable`, `ERC721Upgradeable`, `ERC1155Upgradeable`
- Replace `constructor()` with `initialize()` function
- Add `reinitialize()` if needed
- Add `proxiableUUID()` function for UUPS

**Example Pattern:**
```solidity
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract KeepToken is ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    address public treasury;
    address public tavernKeeperContract;

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

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ... rest of contract
}
```

### 2. Update Deployment Script

The deployment script needs to:
1. Deploy implementation contracts
2. Deploy UUPS proxy contracts pointing to implementations
3. Initialize proxies
4. Verify all deployments

---

## Deployment Process

### Step 1: Prepare Environment

```bash
cd packages/contracts

# Set environment variables
export FEE_RECIPIENT_ADDRESS=0x...  # Treasury wallet
export DEPLOYER_PRIVATE_KEY=0x...   # Deployer wallet private key
export MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

### Step 3: Run Tests

```bash
npx hardhat test
```

### Step 4: Deploy Contracts

```bash
npx hardhat run scripts/deploy.ts --network monad
```

### Step 5: Verify Deployments

1. Check all addresses on block explorer
2. Verify proxy points to implementation
3. Test contract functions
4. Run validation tests

### Step 6: Update Documentation

**MANDATORY:** Update `DEPLOYMENT_TRACKER.md` with:
- All deployed addresses
- Deployment transaction hashes
- Deployment dates
- Proxy admin addresses

---

## Post-Deployment Checklist

- [ ] All contracts deployed successfully
- [ ] Proxies point to correct implementations
- [ ] Contracts initialized correctly
- [ ] Fee recipient set for Inventory contract
- [ ] All addresses verified on block explorer
- [ ] `DEPLOYMENT_TRACKER.md` updated
- [ ] `.env` files updated with addresses
- [ ] `lib/contracts/registry.ts` updated
- [ ] Contract validation tests passing
- [ ] Proxy admin addresses documented and secured

---

## Upgrade Process

When upgrading contracts:

1. **Deploy new implementation:**
   ```bash
   npx hardhat run scripts/upgrade.ts --network monad
   ```

2. **Verify new implementation:**
   - Test all functions
   - Check storage layout compatibility
   - Run tests

3. **Upgrade proxy:**
   - Call `upgradeTo(newImplementation)` from proxy admin
   - Verify upgrade successful

4. **Update documentation:**
   - Add entry to Upgrade History in `DEPLOYMENT_TRACKER.md`
   - Update version numbers
   - Document changes

---

## Security Considerations

1. **Proxy Admin:**
   - Use multisig wallet for production
   - Never use single private key
   - Store admin keys securely

2. **Initialization:**
   - Only initialize once
   - Use `initializer` modifier
   - Verify initialization parameters

3. **Upgrades:**
   - Test upgrades on testnet first
   - Verify storage layout compatibility
   - Have rollback plan

4. **Fee Recipient:**
   - Use secure treasury wallet
   - Verify address before deployment
   - Test fee collection

---

## Troubleshooting

### Deployment Fails

- Check RPC connection
- Verify deployer has enough gas
- Check contract compilation errors
- Verify constructor/initialize parameters

### Proxy Not Working

- Verify proxy points to implementation
- Check initialization was called
- Verify proxy admin permissions
- Check UUPS pattern implementation

### Upgrade Fails

- Verify storage layout compatibility
- Check upgrade authorization
- Verify new implementation is valid
- Check proxy admin permissions

---

## Support

If you encounter issues:
1. Check `DEPLOYMENT_TRACKER.md` for previous deployments
2. Review contract code for errors
3. Test on local Hardhat network first
4. Verify all environment variables are set

