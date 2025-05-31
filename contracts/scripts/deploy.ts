import { ethers } from "hardhat";
import { VaultBrickToken, PropertyNFT } from "../typechain-types";

async function main() {
  console.log("🚀 Starting CoinEstate deployment...");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy VaultBrick Token (VBK)
  console.log("\n📊 Deploying VaultBrick Token (VBK)...");
  const VaultBrickToken = await ethers.getContractFactory("VaultBrickToken");
  const vaultBrickToken: VaultBrickToken = await VaultBrickToken.deploy(deployer.address);
  await vaultBrickToken.deployed();
  
  console.log("✅ VaultBrick Token deployed to:", vaultBrickToken.address);

  // Deploy Property NFT
  console.log("\n🏠 Deploying Property NFT...");
  const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
  const propertyNFT: PropertyNFT = await PropertyNFT.deploy(
    vaultBrickToken.address,
    deployer.address
  );
  await propertyNFT.deployed();
  
  console.log("✅ Property NFT deployed to:", propertyNFT.address);

  // Setup permissions
  console.log("\n🔑 Setting up permissions...");
  
  // Add PropertyNFT as authorized minter for VBK
  const addMinterTx = await vaultBrickToken.addAuthorizedMinter(propertyNFT.address);
  await addMinterTx.wait();
  console.log("✅ PropertyNFT added as authorized VBK minter");

  // Verify token metrics
  console.log("\n📊 Verifying token metrics...");
  const tokenMetrics = await vaultBrickToken.getTokenMetrics();
  console.log("   Current Supply:", ethers.utils.formatEther(tokenMetrics.currentSupply), "VBK");
  console.log("   Max Supply:", ethers.utils.formatEther(tokenMetrics.maxSupply), "VBK");
  console.log("   Remaining Supply:", ethers.utils.formatEther(tokenMetrics.remainingSupply), "VBK");

  // Create a sample property for testing
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
  console.log("=" * 50);
  console.log("📋 Contract Addresses:");
  console.log("   VaultBrick Token (VBK):", vaultBrickToken.address);
  console.log("   Property NFT:", propertyNFT.address);
  console.log("   Deployer:", deployer.address);
  console.log("=" * 50);

  // Save deployment info to file
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      VaultBrickToken: vaultBrickToken.address,
      PropertyNFT: propertyNFT.address,
    },
    deployedAt: new Date().toISOString(),
    tokenMetrics: {
      maxSupply: tokenMetrics.maxSupply.toString(),
      currentSupply: tokenMetrics.currentSupply.toString(),
    },
  };

  const fs = require("fs");
  const path = require("path");
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const networkName = (await ethers.provider.getNetwork()).name;
  fs.writeFileSync(
    path.join(deploymentsDir, `${networkName}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`💾 Deployment info saved to deployments/${networkName}.json`);

  // Verification instructions
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${networkName} ${vaultBrickToken.address} "${deployer.address}"`);
    console.log(`npx hardhat verify --network ${networkName} ${propertyNFT.address} "${vaultBrickToken.address}" "${deployer.address}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
