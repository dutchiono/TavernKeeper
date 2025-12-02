const monAddress = "0x0000000000000000000000000000000000000000";

console.log("Using PoolManager:", poolManagerAddress);
console.log("Using KeepToken:", keepTokenAddress);
console.log("Using CellarHook:", cellarHookAddress);

// Deploy CellarZapV4
console.log("\nDeploying CellarZapV4...");
const CellarZapV4 = await ethers.getContractFactory("CellarZapV4");
const cellarZap = await CellarZapV4.deploy(
    poolManagerAddress,
    cellarHookAddress,
    monAddress,
    keepTokenAddress
);
await cellarZap.waitForDeployment();
const cellarZapAddress = await cellarZap.getAddress();
console.log("CellarZapV4 deployed to:", cellarZapAddress);

// Update Frontend Addresses
console.log("\nUpdating frontend addresses...");
await updateFrontendAddresses({
    CELLAR_ZAP: cellarZapAddress,
});

// Update Deployment Tracker
console.log("Updating deployment tracker...");
await updateDeploymentTracker({
    cellarZap: cellarZapAddress,
});

console.log("\nDeployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
