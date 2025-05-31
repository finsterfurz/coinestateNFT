const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Starting CoinEstate Upgradeable Deployment...");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Configuration
  const INITIAL_OWNER = deployer.address;
  const COINESTATE_WALLET = process.env.COINESTATE_WALLET || deployer.address;
  const STABLE_TOKEN = process.env.STABLE_TOKEN_ADDRESS || "0xA0b86a33E6441c41D21e4ba4e1a4c8b8DbC8a8Dc"; // Mock USDC for testnet

  console.log("\n📊 Deployment Configuration:");
  console.log("   Initial Owner:", INITIAL_OWNER);
  console.log("   CoinEstate Wallet:", COINESTATE_WALLET);
  console.log("   Stable Token:", STABLE_TOKEN);

  // Deploy VaultBrick Upgradeable Token
  console.log("\n📊 Deploying VaultBrick Upgradeable Token (VBK)...");
  const VaultBrickUpgradeable = await ethers.getContractFactory("VaultBrickUpgradeable");
  
  const vaultBrickProxy = await upgrades.deployProxy(
    VaultBrickUpgradeable,
    [INITIAL_OWNER, COINESTATE_WALLET, STABLE_TOKEN],
    {
      initializer: 'initialize',
      kind: 'uups'
    }
  );
  await vaultBrickProxy.deployed();
  
  console.log("✅ VaultBrick Proxy deployed to:", vaultBrickProxy.address);

  // Get implementation address
  const vaultBrickImplAddress = await upgrades.erc1967.getImplementationAddress(vaultBrickProxy.address);
  console.log("📄 VaultBrick Implementation:", vaultBrickImplAddress);

  // Deploy Property NFT (Compatible with Upgradeable VBK)
  console.log("\n🏠 Deploying Property NFT (Upgradeable Compatible)...");
  const PropertyNFTUpgradeable = await ethers.getContractFactory("PropertyNFTUpgradeable");
  const propertyNFT = await PropertyNFTUpgradeable.deploy(
    vaultBrickProxy.address,
    INITIAL_OWNER
  );
  await propertyNFT.deployed();
  
  console.log("✅ Property NFT deployed to:", propertyNFT.address);

  // Setup permissions
  console.log("\n🔑 Setting up permissions...");
  
  // Add PropertyNFT as authorized minter for VBK
  const addMinterTx = await vaultBrickProxy.addAuthorizedMinter(propertyNFT.address);
  await addMinterTx.wait();
  console.log("✅ PropertyNFT added as authorized VBK minter");

  // Verify setup
  console.log("\n📊 Verifying setup...");
  const isAuthorized = await vaultBrickProxy.authorizedMinters(propertyNFT.address);
  console.log("   PropertyNFT authorized:", isAuthorized);
  
  const tokenName = await vaultBrickProxy.name();
  const tokenSymbol = await vaultBrickProxy.symbol();
  const tokenCap = await vaultBrickProxy.cap();
  console.log(`   Token: ${tokenName} (${tokenSymbol})`);
  console.log(`   Cap: ${ethers.utils.formatEther(tokenCap)} VBK`);

  // Create a sample property for testing (if enabled)
  if (process.env.CREATE_SAMPLE_PROPERTY === "true") {
    console.log("\n🏘️ Creating sample property...");
    
    const samplePropertyTx = await propertyNFT.createProperty(
      "Tallinn, Estonia - Modern Apartment Complex",
      ethers.utils.parseEther("1500000"), // €1.5M total value
      750, // 750 shares at €2,000 each
      "QmSampleIPFSHash123456789" // Sample IPFS hash
    );
    await samplePropertyTx.wait();
    
    console.log("✅ Sample property created with ID: 0");
  }

  // Display deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(60));
  console.log("📋 Contract Addresses:");
  console.log("   VaultBrick Proxy (VBK):", vaultBrickProxy.address);
  console.log("   VaultBrick Implementation:", vaultBrickImplAddress);
  console.log("   Property NFT:", propertyNFT.address);
  console.log("   Deployer:", deployer.address);
  console.log("   CoinEstate Wallet:", COINESTATE_WALLET);
  console.log("   Stable Token:", STABLE_TOKEN);
  console.log("=" .repeat(60));

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      VaultBrickProxy: vaultBrickProxy.address,
      VaultBrickImplementation: vaultBrickImplAddress,
      PropertyNFT: propertyNFT.address,
    },
    configuration: {
      coinEstateWallet: COINESTATE_WALLET,
      stableToken: STABLE_TOKEN,
      initialOwner: INITIAL_OWNER,
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
    path.join(deploymentsDir, `${networkName}-upgradeable.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`💾 Deployment info saved to deployments/${networkName}-upgradeable.json`);

  // Verification instructions
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${networkName} ${vaultBrickImplAddress}`);
    console.log(`npx hardhat verify --network ${networkName} ${propertyNFT.address} "${vaultBrickProxy.address}" "${INITIAL_OWNER}"`);
  }

  // Usage instructions
  console.log("\n📚 Next Steps:");
  console.log("1. Fund the VBK contract with stable tokens for income distribution");
  console.log("2. Create properties using propertyNFT.createProperty()");
  console.log("3. Users can purchase shares using propertyNFT.purchasePropertyShare()");
  console.log("4. Distribute income using vaultBrick.distributeIncome()");
  console.log("5. Users claim income using vaultBrick.claimBatch()");

  console.log("\n⚠️  Important Notes:");
  console.log("- This is an upgradeable deployment using UUPS proxy pattern");
  console.log("- Only authorized minters can mint VBK tokens");
  console.log("- Income distributions require snapshots and cooldown periods");
  console.log("- Always test thoroughly before mainnet deployment");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
