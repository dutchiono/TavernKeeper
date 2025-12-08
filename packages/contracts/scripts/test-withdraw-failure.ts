import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Transaction hash from user
const FAILED_TX_HASH = "0x7dccfec98ee2323db48067c954c43cc703155eb44cf2f6a81391ee3505446058";

// Contract addresses (update these for your network)
const THECELLAR_V3_ADDRESS = process.env.THECELLAR_V3_ADDRESS || "0x0000000000000000000000000000000000000000";
const POSITION_MANAGER_ADDRESS = process.env.V3_POSITION_MANAGER || "0x0000000000000000000000000000000000000000";

const THECELLAR_ABI = [
    "function tokenId() view returns (uint256)",
    "function totalLiquidity() view returns (uint256)",
    "function cellarToken() view returns (address)",
    "function withdraw(uint256 lpAmount) external",
    "function wmon() view returns (address)",
    "function keepToken() view returns (address)",
];

const POSITION_MANAGER_ABI = [
    "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
];

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
];

async function main() {
    console.log("=== DIAGNOSING WITHDRAWAL FAILURE ===\n");

    const [signer] = await ethers.getSigners();
    console.log("Using signer:", signer.address);
    console.log("Network:", (await ethers.provider.getNetwork()).name, "\n");

    // Get the failed transaction
    console.log("📋 Analyzing failed transaction...");
    console.log("Transaction hash:", FAILED_TX_HASH);

    let tx;
    try {
        tx = await ethers.provider.getTransaction(FAILED_TX_HASH);
        console.log("✅ Transaction found");
    } catch (error) {
        console.log("❌ Could not fetch transaction. Trying receipt...");
        try {
            const receipt = await ethers.provider.getTransactionReceipt(FAILED_TX_HASH);
            console.log("✅ Receipt found");
            console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
            if (receipt.status === 0) {
                console.log("Transaction failed - analyzing why...");
            }
        } catch (e) {
            console.log("❌ Could not fetch transaction or receipt");
            console.log("Error:", e);
        }
    }

    // Connect to contracts
    const cellar = new ethers.Contract(THECELLAR_V3_ADDRESS, THECELLAR_ABI, ethers.provider);
    const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI, ethers.provider);

    console.log("\n📊 Current Contract State:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        // Get tokenId
        const tokenId = await cellar.tokenId();
        console.log("Token ID:", tokenId.toString());

        if (tokenId === 0n) {
            console.log("❌ ERROR: No position exists (tokenId = 0)");
            console.log("   This means withdraw() will fail with 'No position'");
            return;
        }

        // Get totalLiquidity
        const totalLiquidity = await cellar.totalLiquidity();
        console.log("Total Liquidity (CLP):", ethers.formatEther(totalLiquidity));

        // Get CLP token address
        const clpTokenAddress = await cellar.cellarToken();
        const clpToken = new ethers.Contract(clpTokenAddress, ERC20_ABI, ethers.provider);

        // Get CLP total supply
        const clpSupply = await clpToken.totalSupply();
        console.log("CLP Total Supply:", ethers.formatEther(clpSupply));

        // Get position liquidity from Uniswap
        const position = await positionManager.positions(tokenId);
        const positionLiquidity = position[7]; // liquidity is at index 7
        console.log("Position Liquidity (Uniswap):", ethers.formatEther(positionLiquidity));

        // Check for mismatch
        console.log("\n🔍 Checking for Issues:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // Issue 1: CLP supply vs position liquidity
        if (clpSupply > positionLiquidity) {
            const mismatch = clpSupply - positionLiquidity;
            console.log("⚠️  ISSUE FOUND: CLP Supply > Position Liquidity");
            console.log(`   Mismatch: ${ethers.formatEther(mismatch)} CLP`);
            console.log(`   This means ${ethers.formatEther(mismatch)} CLP tokens exist without backing liquidity`);
            console.log(`   Users can only withdraw up to ${ethers.formatEther(positionLiquidity)} CLP`);
        } else if (clpSupply < positionLiquidity) {
            const excess = positionLiquidity - clpSupply;
            console.log("✅ Position has more liquidity than CLP supply");
            console.log(`   Excess: ${ethers.formatEther(excess)} (likely from fees)`);
        } else {
            console.log("✅ CLP Supply matches Position Liquidity");
        }

        // Issue 2: Check if totalLiquidity matches
        if (totalLiquidity !== clpSupply) {
            console.log("⚠️  ISSUE FOUND: totalLiquidity != CLP Supply");
            console.log(`   totalLiquidity: ${ethers.formatEther(totalLiquidity)}`);
            console.log(`   CLP Supply: ${ethers.formatEther(clpSupply)}`);
            console.log(`   Difference: ${ethers.formatEther(totalLiquidity > clpSupply ? totalLiquidity - clpSupply : clpSupply - totalLiquidity)}`);
        } else {
            console.log("✅ totalLiquidity matches CLP Supply");
        }

        // Issue 3: Check uint128 overflow potential
        const maxUint128 = 2n ** 128n - 1n;
        if (totalLiquidity > maxUint128) {
            console.log("⚠️  ISSUE FOUND: totalLiquidity > max(uint128)");
            console.log(`   This will cause overflow when casting to uint128 in withdraw()`);
            console.log(`   max(uint128): ${ethers.formatEther(maxUint128)}`);
            console.log(`   totalLiquidity: ${ethers.formatEther(totalLiquidity)}`);
        } else {
            console.log("✅ totalLiquidity is within uint128 range");
        }

        // Try to decode the failed transaction
        if (tx) {
            console.log("\n📝 Decoding Transaction:");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            try {
                const iface = new ethers.Interface(THECELLAR_ABI);
                const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
                console.log("Function:", decoded.name);
                if (decoded.name === "withdraw") {
                    const lpAmount = decoded.args[0];
                    console.log("LP Amount requested:", ethers.formatEther(lpAmount));

                    // Check if requested amount is valid
                    if (lpAmount > totalLiquidity) {
                        console.log("❌ ERROR: Requested amount > totalLiquidity");
                        console.log(`   Requested: ${ethers.formatEther(lpAmount)}`);
                        console.log(`   Available: ${ethers.formatEther(totalLiquidity)}`);
                    } else if (lpAmount > positionLiquidity) {
                        console.log("❌ ERROR: Requested amount > position liquidity");
                        console.log(`   Requested: ${ethers.formatEther(lpAmount)}`);
                        console.log(`   Position has: ${ethers.formatEther(positionLiquidity)}`);
                        console.log(`   This will cause decreaseLiquidity() to fail`);
                    } else if (lpAmount > maxUint128) {
                        console.log("❌ ERROR: Requested amount > max(uint128)");
                        console.log(`   Requested: ${ethers.formatEther(lpAmount)}`);
                        console.log(`   max(uint128): ${ethers.formatEther(maxUint128)}`);
                        console.log(`   This will cause overflow when casting to uint128`);
                    } else {
                        console.log("✅ Requested amount seems valid");
                        console.log("   Checking other potential issues...");
                    }
                }
            } catch (e) {
                console.log("Could not decode transaction:", e);
            }
        }

        // Get user's CLP balance if we can determine the user
        if (tx && tx.from) {
            console.log("\n👤 User Analysis:");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            const userAddress = tx.from;
            const userBalance = await clpToken.balanceOf(userAddress);
            console.log("User Address:", userAddress);
            console.log("User CLP Balance:", ethers.formatEther(userBalance));

            // Check allowance
            const allowance = await clpToken.allowance(userAddress, THECELLAR_V3_ADDRESS);
            console.log("Allowance:", ethers.formatEther(allowance));

            if (allowance < userBalance) {
                console.log("⚠️  WARNING: Allowance < Balance");
                console.log("   User needs to approve more CLP tokens");
            }
        }

        console.log("\n💡 Recommendations:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("1. If CLP Supply > Position Liquidity:");
        console.log("   - Users can only withdraw up to position liquidity amount");
        console.log("   - Consider adding a check in withdraw() to prevent this");
        console.log("2. If uint128 overflow:");
        console.log("   - Fix the cast to handle large amounts properly");
        console.log("3. If totalLiquidity mismatch:");
        console.log("   - This indicates accounting issues that need investigation");

    } catch (error: any) {
        console.error("❌ Error analyzing contract:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

