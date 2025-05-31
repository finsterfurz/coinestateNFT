const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Starting CoinEstate VBK Sales Deployment (Phase 1)...");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Configuration
  const INITIAL_OWNER = deployer.address;
  const COINESTATE_WALLET = process.env.COINESTATE_WALLET || deployer.address;
  const TREASURY_WALLET = process.env.TREASURY_WALLET || deployer.address;
  const STABLE_TOKEN = process.env.STABLE_TOKEN_ADDRESS || "0xA0b86a33E6441c41D21e4ba4e1a4c8b8DbC8a8Dc"; // USDC

  console.log("\n📊 Phase 1 Configuration:");
  console.log("   Initial Owner:", INITIAL_OWNER);
  console.log("   CoinEstate Wallet:", COINESTATE_WALLET);
  console.log("   Treasury Wallet:", TREASURY_WALLET);
  console.log("   Stable Token (USDC):", STABLE_TOKEN);

  // Deploy VaultBrick Sales Contract
  console.log("\n💰 Deploying VaultBrick Sales Contract...");
  const VaultBrickSales = await ethers.getContractFactory("VaultBrickSales");
  
  const vbkSalesProxy = await upgrades.deployProxy(
    VaultBrickSales,
    [INITIAL_OWNER, COINESTATE_WALLET, TREASURY_WALLET, STABLE_TOKEN],
    {
      initializer: 'initialize',
      kind: 'uups'
    }
  );
  await vbkSalesProxy.deployed();
  
  console.log("✅ VBK Sales Proxy deployed to:", vbkSalesProxy.address);

  // Get implementation address
  const vbkSalesImplAddress = await upgrades.erc1967.getImplementationAddress(vbkSalesProxy.address);
  console.log("📄 VBK Sales Implementation:", vbkSalesImplAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const name = await vbkSalesProxy.name();
  const symbol = await vbkSalesProxy.symbol();
  const cap = await vbkSalesProxy.cap();
  const salesEnabled = await vbkSalesProxy.salesEnabled();
  const treasuryBalance = await vbkSalesProxy.balanceOf(TREASURY_WALLET);
  
  console.log(`   Token: ${name} (${symbol})`);
  console.log(`   Cap: ${ethers.utils.formatEther(cap)} VBK`);
  console.log(`   Sales Enabled: ${salesEnabled}`);
  console.log(`   Treasury Balance: ${ethers.utils.formatEther(treasuryBalance)} VBK`);

  // Get sales metrics
  const salesMetrics = await vbkSalesProxy.getSalesMetrics();
  console.log("\n📊 Initial Sales Metrics:");
  console.log(`   Total Sold: ${ethers.utils.formatEther(salesMetrics[0])} VBK`);
  console.log(`   Total Revenue: €${ethers.utils.formatEther(salesMetrics[1])}`);
  console.log(`   Remaining Tokens: ${ethers.utils.formatEther(salesMetrics[2])} VBK`);
  console.log(`   Distribution Count: ${salesMetrics[3]}`);

  // Display deployment summary
  console.log("\n🎉 Phase 1 Deployment completed successfully!");
  console.log("=" .repeat(70));
  console.log("📋 Contract Addresses:");
  console.log("   VBK Sales Proxy:", vbkSalesProxy.address);
  console.log("   VBK Sales Implementation:", vbkSalesImplAddress);
  console.log("   Treasury Wallet:", TREASURY_WALLET);
  console.log("   CoinEstate Wallet:", COINESTATE_WALLET);
  console.log("   Stable Token (USDC):", STABLE_TOKEN);
  console.log("=" .repeat(70));

  // Save deployment info
  const deploymentInfo = {
    phase: "Phase 1 - VBK Sales",
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      VBKSalesProxy: vbkSalesProxy.address,
      VBKSalesImplementation: vbkSalesImplAddress,
    },
    configuration: {
      coinEstateWallet: COINESTATE_WALLET,
      treasuryWallet: TREASURY_WALLET,
      stableToken: STABLE_TOKEN,
      initialOwner: INITIAL_OWNER,
    },
    tokenomics: {
      totalSupply: ethers.utils.formatEther(cap),
      treasuryBalance: ethers.utils.formatEther(treasuryBalance),
      salesEnabled: salesEnabled,
    },
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  const fs = require("fs");
  const path = require("path");
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const networkName = (await ethers.provider.getNetwork()).name;
  fs.writeFileSync(
    path.join(deploymentsDir, `${networkName}-phase1.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`💾 Deployment info saved to deployments/${networkName}-phase1.json`);

  // Create frontend environment update
  const frontendEnv = `
# VBK Sales Contract (Phase 1)
REACT_APP_VBK_SALES_CONTRACT=${vbkSalesProxy.address}
REACT_APP_VBK_SALES_IMPL=${vbkSalesImplAddress}
REACT_APP_TREASURY_WALLET=${TREASURY_WALLET}
REACT_APP_COINESTATE_WALLET=${COINESTATE_WALLET}
REACT_APP_STABLE_TOKEN=${STABLE_TOKEN}
`;

  fs.writeFileSync(
    path.join(__dirname, "../frontend-env-update.txt"),
    frontendEnv
  );

  console.log("📝 Frontend environment variables saved to frontend-env-update.txt");

  // Usage instructions
  console.log("\n📚 Phase 1 Setup Complete - Next Steps:");
  console.log("1. 💰 Users can now buy VBK directly on your homepage");
  console.log("2. 📊 All 2.5M VBK tokens are pre-minted to treasury");
  console.log("3. 💸 Sales revenue goes directly to CoinEstate wallet");
  console.log("4. 📅 Monthly distributions scheduled for 15th of each month");
  console.log("5. 🏠 Property NFTs can be added in Phase 2");

  console.log("\n🔧 Integration Instructions:");
  console.log("1. Add VBK Sales Contract address to frontend/.env:");
  console.log(`   REACT_APP_VBK_SALES_CONTRACT=${vbkSalesProxy.address}`);
  console.log("2. Import VBKSalesWidget component on your homepage");
  console.log("3. Fund stable token contract for monthly distributions");
  console.log("4. Call distributeMonthlyIncome() on 15th of each month");

  // Verification instructions
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 To verify contracts on Etherscan:");
    console.log(`npx hardhat verify --network ${networkName} ${vbkSalesImplAddress}`);
  }

  console.log("\n⚠️  Important Phase 1 Notes:");
  console.log("- Sales are enabled by default");
  console.log("- Treasury holds all 2.5M VBK tokens for sales");
  console.log("- 5% platform fee on income distributions");
  console.log("- Users can claim income with batch claiming");
  console.log("- Contract is upgradeable for Phase 2 (NFT integration)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Phase 1 deployment failed:", error);
    process.exit(1);
  });
