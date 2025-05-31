const { ethers } = require("hardhat");
const cron = require("node-cron");

/**
 * Automated Monthly Distribution System
 * Runs on 15th of each month to distribute income to VBK holders
 */
class AutomatedDistributionSystem {
  constructor(contractAddress, privateKey, provider) {
    this.contractAddress = contractAddress;
    this.wallet = new ethers.Wallet(privateKey, provider);
    
    // Contract ABI for distribution functions
    this.contractABI = [
      "function distributeMonthlyIncome() external",
      "function triggerEmergencyDistribution() external",
      "function getSalesMetrics() external view returns (uint256, uint256, uint256, uint256, bool)",
      "function distributionCount() external view returns (uint256)",
      "function nextDistributionDate() external view returns (uint256)",
      "function stableToken() external view returns (address)",
      "function balanceOf(address account) external view returns (uint256)",
    ];
    
    this.contract = new ethers.Contract(contractAddress, this.contractABI, this.wallet);
    this.isRunning = false;
  }

  /**
   * Start the automated distribution system
   */
  start() {
    console.log("🚀 Starting Automated Distribution System...");
    console.log(`📅 Scheduled for 15th of each month at 09:00 UTC`);
    console.log(`📍 Contract: ${this.contractAddress}`);
    console.log(`👤 Wallet: ${this.wallet.address}`);
    
    // Schedule for 15th of each month at 09:00 UTC
    cron.schedule('0 9 15 * *', async () => {
      await this.executeDistribution();
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    // Emergency check - runs daily to catch missed distributions
    cron.schedule('0 12 * * *', async () => {
      await this.checkEmergencyDistribution();
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    // Health check - runs every hour
    cron.schedule('0 * * * *', async () => {
      await this.healthCheck();
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    this.isRunning = true;
    console.log("✅ Automated Distribution System started successfully!");
  }

  /**
   * Execute monthly distribution
   */
  async executeDistribution() {
    try {
      console.log("\n🎯 Starting Monthly Distribution Process...");
      
      // Check if we're ready for distribution
      const nextDistDate = await this.contract.nextDistributionDate();
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (currentTime < nextDistDate) {
        console.log("⏰ Too early for distribution, skipping...");
        return;
      }
      
      // Check stable token balance
      const stableTokenAddress = await this.contract.stableToken();
      const stableTokenContract = new ethers.Contract(
        stableTokenAddress,
        ["function balanceOf(address) external view returns (uint256)"],
        this.wallet
      );
      
      const contractBalance = await stableTokenContract.balanceOf(this.contractAddress);
      const minimumAmount = ethers.parseEther("1000"); // 1000 minimum
      
      if (contractBalance < minimumAmount) {
        console.log(`❌ Insufficient balance for distribution: ${ethers.formatEther(contractBalance)} < 1000`);
        await this.sendAlert("INSUFFICIENT_BALANCE", {
          balance: ethers.formatEther(contractBalance),
          minimum: "1000"
        });
        return;
      }
      
      console.log(`💰 Contract balance: ${ethers.formatEther(contractBalance)} stable tokens`);
      
      // Get current metrics before distribution
      const beforeMetrics = await this.contract.getSalesMetrics();
      const beforeCount = await this.contract.distributionCount();
      
      console.log(`📊 Before distribution - Count: ${beforeCount}, Sold: ${ethers.formatEther(beforeMetrics[0])} VBK`);
      
      // Execute distribution
      console.log("🔄 Executing distribution transaction...");
      const tx = await this.contract.distributeMonthlyIncome({
        gasLimit: 500000, // Set gas limit for safety
      });
      
      console.log(`📤 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
      
      // Verify distribution was successful
      const afterCount = await this.contract.distributionCount();
      const afterMetrics = await this.contract.getSalesMetrics();
      
      if (afterCount > beforeCount) {
        console.log(`🎉 Distribution successful! New count: ${afterCount}`);
        console.log(`💎 Distributed to holders of ${ethers.formatEther(afterMetrics[0])} VBK tokens`);
        
        await this.sendAlert("DISTRIBUTION_SUCCESS", {
          distributionId: afterCount.toString(),
          amount: ethers.formatEther(contractBalance),
          recipients: ethers.formatEther(afterMetrics[0]),
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
        });
      } else {
        throw new Error("Distribution count did not increase");
      }
      
    } catch (error) {
      console.error("❌ Distribution failed:", error);
      await this.sendAlert("DISTRIBUTION_FAILED", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check for emergency distribution (if missed regular schedule)
   */
  async checkEmergencyDistribution() {
    try {
      const nextDistDate = await this.contract.nextDistributionDate();
      const currentTime = Math.floor(Date.now() / 1000);
      const daysSinceScheduled = (currentTime - nextDistDate) / (24 * 60 * 60);
      
      // If more than 5 days past scheduled date, trigger emergency distribution
      if (daysSinceScheduled > 5) {
        console.log(`⚠️ Emergency distribution needed - ${daysSinceScheduled.toFixed(1)} days overdue`);
        
        const tx = await this.contract.triggerEmergencyDistribution({
          gasLimit: 500000,
        });
        
        await tx.wait();
        console.log("🚨 Emergency distribution executed");
        
        await this.sendAlert("EMERGENCY_DISTRIBUTION", {
          daysOverdue: daysSinceScheduled.toFixed(1),
          transactionHash: tx.hash,
        });
      }
    } catch (error) {
      console.error("Error in emergency check:", error);
    }
  }

  /**
   * Health check - verify system is working
   */
  async healthCheck() {
    try {
      // Check wallet balance
      const balance = await this.wallet.getBalance();
      const balanceETH = ethers.formatEther(balance);
      
      if (parseFloat(balanceETH) < 0.1) {
        await this.sendAlert("LOW_ETH_BALANCE", {
          balance: balanceETH,
          wallet: this.wallet.address,
        });
      }
      
      // Check contract connection
      await this.contract.distributionCount();
      
      // Silent success - only log issues
    } catch (error) {
      console.error("❌ Health check failed:", error);
      await this.sendAlert("HEALTH_CHECK_FAILED", {
        error: error.message,
      });
    }
  }

  /**
   * Send alerts (Discord webhook, email, etc.)
   */
  async sendAlert(type, data) {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      contract: this.contractAddress,
      wallet: this.wallet.address,
      data,
    };
    
    console.log(`🚨 ALERT [${type}]:`, JSON.stringify(data, null, 2));
    
    // Send to Discord webhook if configured
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        const webhook = require('discord-webhook-node');
        const hook = new webhook.Webhook(process.env.DISCORD_WEBHOOK_URL);
        
        const embed = new webhook.MessageBuilder()
          .setTitle(`CoinEstate Alert: ${type}`)
          .setDescription(JSON.stringify(data, null, 2))
          .setColor('#ff0000')
          .setTimestamp();
        
        await hook.send(embed);
      } catch (error) {
        console.error("Failed to send Discord alert:", error);
      }
    }
    
    // Send to Slack if configured
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const axios = require('axios');
        await axios.post(process.env.SLACK_WEBHOOK_URL, {
          text: `CoinEstate Alert: ${type}`,
          attachments: [{
            color: 'danger',
            fields: Object.entries(data).map(([key, value]) => ({
              title: key,
              value: value.toString(),
              short: true,
            })),
          }],
        });
      } catch (error) {
        console.error("Failed to send Slack alert:", error);
      }
    }
  }

  /**
   * Stop the distribution system
   */
  stop() {
    console.log("🛑 Stopping Automated Distribution System...");
    cron.destroy();
    this.isRunning = false;
    console.log("✅ Automated Distribution System stopped.");
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      contractAddress: this.contractAddress,
      walletAddress: this.wallet.address,
      nextDistribution: "15th of each month at 09:00 UTC",
    };
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  const CONTRACT_ADDRESS = process.env.VBK_SALES_CONTRACT;
  const PRIVATE_KEY = process.env.DISTRIBUTION_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const RPC_URL = process.env.MAINNET_URL || "http://localhost:8545";
  
  if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
    console.error("❌ Missing required environment variables:");
    console.error("   VBK_SALES_CONTRACT");
    console.error("   DISTRIBUTION_PRIVATE_KEY (or PRIVATE_KEY)");
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const distributionSystem = new AutomatedDistributionSystem(
    CONTRACT_ADDRESS,
    PRIVATE_KEY,
    provider
  );
  
  switch (command) {
    case 'start':
      distributionSystem.start();
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\n📋 Received SIGINT, stopping gracefully...');
        distributionSystem.stop();
        process.exit(0);
      });
      
      // Keep alive
      setInterval(() => {
        // Process stays alive
      }, 1000);
      break;
      
    case 'test':
      console.log("🧪 Testing distribution...");
      await distributionSystem.executeDistribution();
      break;
      
    case 'status':
      console.log("📊 System Status:", distributionSystem.getStatus());
      break;
      
    case 'emergency':
      console.log("🚨 Triggering emergency distribution...");
      await distributionSystem.checkEmergencyDistribution();
      break;
      
    default:
      console.log("📚 CoinEstate Automated Distribution System");
      console.log("");
      console.log("Commands:");
      console.log("  start     - Start the automated distribution system");
      console.log("  test      - Test distribution execution");
      console.log("  status    - Check system status");
      console.log("  emergency - Trigger emergency distribution check");
      console.log("");
      console.log("Environment variables required:");
      console.log("  VBK_SALES_CONTRACT     - Contract address");
      console.log("  DISTRIBUTION_PRIVATE_KEY - Private key for transactions");
      console.log("  MAINNET_URL           - RPC endpoint");
      console.log("  DISCORD_WEBHOOK_URL   - Optional: Discord alerts");
      console.log("  SLACK_WEBHOOK_URL     - Optional: Slack alerts");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AutomatedDistributionSystem };
