const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Enhanced VaultBrick Sales Contract with Maintenance Reserve...\n");

  // Get deployment parameters
  const [deployer] = await ethers.getSigners();
  console.log("📱 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // Contract parameters
  const INITIAL_OWNER = deployer.address; // or specify a different owner
  const COIN_ESTATE_WALLET = process.env.COIN_ESTATE_WALLET || deployer.address;
  const TREASURY_WALLET = process.env.TREASURY_WALLET || deployer.address;
  const STABLE_TOKEN = process.env.STABLE_TOKEN || "0xA0b86a33E6417c3bA7FF81A380dE5d5cAE95d96E"; // Example USDC on Polygon

  console.log("📋 Deployment Parameters:");
  console.log("   Initial Owner:", INITIAL_OWNER);
  console.log("   CoinEstate Wallet:", COIN_ESTATE_WALLET);
  console.log("   Treasury Wallet:", TREASURY_WALLET);
  console.log("   Stable Token:", STABLE_TOKEN);
  console.log("");

  try {
    // Deploy the upgradeable contract
    console.log("🔧 Deploying VaultBrickSales contract...");
    const VaultBrickSales = await ethers.getContractFactory("VaultBrickSales");
    
    const vbkSales = await upgrades.deployProxy(
      VaultBrickSales,
      [
        INITIAL_OWNER,
        COIN_ESTATE_WALLET,
        TREASURY_WALLET,
        STABLE_TOKEN
      ],
      {
        initializer: "initialize",
        kind: "uups"
      }
    );

    await vbkSales.waitForDeployment();
    const contractAddress = await vbkSales.getAddress();

    console.log("✅ VaultBrickSales deployed to:", contractAddress);

    // Verify initial configuration
    console.log("\n📊 Verifying Initial Configuration:");
    
    const salesMetrics = await vbkSales.getAllMetrics();
    console.log("   Total Supply:", ethers.formatEther(salesMetrics[0]), "VBK");
    console.log("   Remaining Tokens:", ethers.formatEther(salesMetrics[2]), "VBK");
    console.log("   Platform Fee Rate:", salesMetrics[6].toString(), "% (should be 10%)");
    console.log("   Maintenance Reserve Rate:", salesMetrics[7].toString(), "%");
    console.log("   Sales Enabled:", salesMetrics[8]);

    const maintenanceInfo = await vbkSales.getMaintenanceInfo();
    console.log("   Maintenance Reserve:", ethers.formatEther(maintenanceInfo[0]), "tokens");
    console.log("   Total Maintenance Spent:", ethers.formatEther(maintenanceInfo[1]), "tokens");

    // Test basic functionality
    console.log("\n🧪 Testing Basic Functionality:");
    
    // Check if sales are enabled
    const salesEnabled = await vbkSales.salesEnabled();
    console.log("   Sales Status:", salesEnabled ? "ENABLED" : "DISABLED");

    // Check token balance of treasury
    const treasuryBalance = await vbkSales.balanceOf(TREASURY_WALLET);
    console.log("   Treasury VBK Balance:", ethers.formatEther(treasuryBalance), "VBK");

    // Environment file update instructions
    console.log("\n📝 Update your .env file:");
    console.log(`REACT_APP_VBK_SALES_CONTRACT=${contractAddress}`);
    console.log(`VBK_SALES_CONTRACT_ADDRESS=${contractAddress}`);

    // Frontend integration instructions
    console.log("\n🌐 Frontend Integration:");
    console.log("1. Update frontend/.env with the contract address above");
    console.log("2. The VBKSalesWidget component is already updated with maintenance reserve display");
    console.log("3. Test the purchase flow on your frontend");

    // Admin functions available
    console.log("\n⚙️  Available Admin Functions:");
    console.log("- distributeMonthlyIncome(): Process monthly rental income (15th of each month)");
    console.log("- withdrawMaintenance(amount, to, reason): Use maintenance funds for repairs");
    console.log("- setPlatformFeeRate(rate): Adjust platform fee (currently 10%)");
    console.log("- setMaintenanceReserveRate(rate): Adjust maintenance reserve (currently 10%)");
    console.log("- setSalesEnabled(bool): Enable/disable token sales");

    // Monthly income distribution guide
    console.log("\n📅 Monthly Income Distribution Process:");
    console.log("1. Ensure stablecoins are in the contract");
    console.log("2. Call distributeMonthlyIncome() on the 15th");
    console.log("3. Distribution breakdown:");
    console.log("   - 80% → VBK token holders (claimable)");
    console.log("   - 10% → Maintenance reserve (stored in contract)");
    console.log("   - 10% → Platform operations (sent to CoinEstate wallet)");

    // Property maintenance guide
    console.log("\n🔧 Property Maintenance Usage:");
    console.log("1. Maintenance funds accumulate automatically from monthly income");
    console.log("2. Use withdrawMaintenance() when repairs are needed");
    console.log("3. Unused funds remain in reserve for future property sale distribution");

    // Security reminders
    console.log("\n🔒 Security Reminders:");
    console.log("- Contract is upgradeable (UUPS pattern)");
    console.log("- Only owner can call admin functions");
    console.log("- Maintenance withdrawals require a reason parameter for transparency");
    console.log("- Emergency pause functionality available");

    // Next steps
    console.log("\n🎯 Next Steps:");
    console.log("1. Verify contract on block explorer");
    console.log("2. Test token purchase on frontend");
    console.log("3. Set up monthly income distribution automation");
    console.log("4. Monitor maintenance reserve accumulation");
    console.log("5. Plan Phase 2 NFT integration");

    return {
      contractAddress,
      deployer: deployer.address,
      txHash: vbkSales.deploymentTransaction()?.hash
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then((result) => {
      console.log("\n🎉 Deployment completed successfully!");
      console.log("Contract Address:", result.contractAddress);
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Deployment error:", error);
      process.exit(1);
    });
}

module.exports = main;
