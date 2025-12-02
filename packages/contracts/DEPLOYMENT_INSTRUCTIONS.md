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
export PRICING_SIGNER_ADDRESS=0x...  # Address of wallet that will sign prices (must match PRICING_SIGNER_PRIVATE_KEY)
```

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

### Step 3: Run Tests

### Step 4: Upgrade to Signature-Based Pricing (if upgrading existing contracts)

If upgrading existing contracts to signature-based pricing:

```bash
# Set pricing signer address (must match PRICING_SIGNER_PRIVATE_KEY in backend)
export PRICING_SIGNER_ADDRESS=0x...  # Address derived from PRICING_SIGNER_PRIVATE_KEY

# Run upgrade script
npx hardhat run scripts/upgrade_signature_pricing.ts --network monad
```

**Critical**: The signer address MUST be set after upgrade, or contracts will not work.

### Step 5: Upgrade Process (General)

3. **Upgrade proxy:**
   - Call `upgradeTo(newImplementation)` from proxy admin
   - Verify upgrade successful
   - **For signature-based pricing**: Set signer address via `setSigner()`

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

5. **Pricing Signer (for signature-based pricing):**
   - Generate a dedicated wallet for signing prices
   - Store private key securely (use `PRICING_SIGNER_PRIVATE_KEY` in backend .env)
   - Set signer address on contracts after deployment/upgrade
   - **CRITICAL**: Contracts will NOT work until signer is set
   - Use a secure, dedicated wallet (not the deployer wallet)
   - Consider using a hardware wallet or secure key management service

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

