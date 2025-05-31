const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🔄 Starting VaultBrick Contract Upgrade...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Upgrading with account:", deployer.address);
  
  // Get existing proxy address from deployment
  const PROXY_ADDRESS = process.env.VBK_PROXY_ADDRESS;
  
  if (!PROXY_ADDRESS) {
    console.error("❌ Please set VBK_PROXY_ADDRESS environment variable");
    process.exit(1);
  }
  
  console.log("📍 Upgrading proxy at:", PROXY_ADDRESS);
  
  // Validate proxy exists and is upgradeable
  try {
    const currentImpl = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    console.log("📄 Current implementation:", currentImpl);
  } catch (error) {
    console.error("❌ Invalid proxy address or not upgradeable:", error.message);
    process.exit(1);
  }
  
  // Deploy new implementation
  console.log("\n🚀 Deploying new implementation...");
  const VaultBrickUpgradeableV2 = await ethers.getContractFactory("VaultBrickUpgradeable");
  
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, VaultBrickUpgradeableV2);
  await upgraded.deployed();
  
  console.log("✅ Upgrade completed!");
  
  // Get new implementation address
  const newImpl = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("📄 New implementation:", newImpl);
  
  // Verify upgrade
  console.log("\n🔍 Verifying upgrade...");
  const name = await upgraded.name();
  const symbol = await upgraded.symbol();
  const cap = await upgraded.cap();
  
  console.log(`   Token: ${name} (${symbol})`);
  console.log(`   Cap: ${ethers.utils.formatEther(cap)} VBK`);
  console.log("✅ Upgrade verification successful!");
  
  // Save upgrade info
  const upgradeInfo = {
    network: (await ethers.provider.getNetwork()).name,
    proxyAddress: PROXY_ADDRESS,
    previousImplementation: await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS),
    newImplementation: newImpl,
    upgrader: deployer.address,
    upgradedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };
  
  const fs = require("fs");
  const path = require("path");
  
  const upgradesDir = path.join(__dirname, "../upgrades");
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(upgradesDir, `upgrade-${timestamp}.json`),
    JSON.stringify(upgradeInfo, null, 2)
  );
  
  console.log(`💾 Upgrade info saved to upgrades/upgrade-${timestamp}.json`);
  
  // Verification instructions
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 To verify new implementation on Etherscan:");
    console.log(`npx hardhat verify --network ${(await ethers.provider.getNetwork()).name} ${newImpl}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  });
