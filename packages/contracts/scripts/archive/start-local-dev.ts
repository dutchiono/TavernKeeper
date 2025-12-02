import { execSync, spawn } from "child_process";
import path from "path";

async function main() {
    console.log("🚀 Starting Local Hardhat Node...");

    // Start Hardhat Node
    const nodeProcess = spawn("npx", ["hardhat", "node"], {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
        shell: true
    });

    // Wait for node to start (simple timeout for now, or check output)
    console.log("⏳ Waiting for node to initialize...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("📦 Deploying Contracts to Localhost...");

    try {
        execSync("npx hardhat run scripts/deploy_v4_all.ts --network localhost", {
            cwd: path.join(__dirname, ".."),
            stdio: "inherit",
            env: { ...process.env, PRICING_SIGNER_ADDRESS: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" }
        });
        console.log("✅ Deployment Complete!");
        console.log("🌍 Local Node is running at http://127.0.0.1:8545");
        console.log("Press Ctrl+C to stop.");
    } catch (error) {
        console.error("❌ Deployment Failed:", error);
        nodeProcess.kill();
        process.exit(1);
    }
}

main();
