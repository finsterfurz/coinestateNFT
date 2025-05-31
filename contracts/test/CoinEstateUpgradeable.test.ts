import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { VaultBrickUpgradeable, PropertyNFTUpgradeable } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("CoinEstate Upgradeable Platform", function () {
  let vaultBrickToken: VaultBrickUpgradeable;
  let propertyNFT: PropertyNFTUpgradeable;
  let mockUSDC: any;
  let owner: SignerWithAddress;
  let coinEstateWallet: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  let investor3: SignerWithAddress;

  const SHARE_PRICE = ethers.utils.parseEther("2000"); // €2,000
  const MAX_SUPPLY = ethers.utils.parseEther("2500000"); // 2.5M VBK
  const INCOME_AMOUNT = ethers.utils.parseEther("10000"); // €10,000 for distribution

  beforeEach(async function () {
    [owner, coinEstateWallet, investor1, investor2, investor3] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.deployed();

    // Deploy VaultBrick Upgradeable Token
    const VaultBrickUpgradeable = await ethers.getContractFactory("VaultBrickUpgradeable");
    vaultBrickToken = await upgrades.deployProxy(
      VaultBrickUpgradeable,
      [owner.address, coinEstateWallet.address, mockUSDC.address],
      { initializer: 'initialize', kind: 'uups' }
    ) as VaultBrickUpgradeable;
    await vaultBrickToken.deployed();

    // Deploy Property NFT
    const PropertyNFTUpgradeable = await ethers.getContractFactory("PropertyNFTUpgradeable");
    propertyNFT = await PropertyNFTUpgradeable.deploy(
      vaultBrickToken.address,
      owner.address
    ) as PropertyNFTUpgradeable;
    await propertyNFT.deployed();

    // Add PropertyNFT as authorized minter
    await vaultBrickToken.addAuthorizedMinter(propertyNFT.address);
  });

  describe("VaultBrick Upgradeable Token", function () {
    it("Should initialize correctly", async function () {
      expect(await vaultBrickToken.name()).to.equal("VaultBrick");
      expect(await vaultBrickToken.symbol()).to.equal("VBK");
      expect(await vaultBrickToken.decimals()).to.equal(18);
      expect(await vaultBrickToken.cap()).to.equal(MAX_SUPPLY);
      expect(await vaultBrickToken.coinEstateWallet()).to.equal(coinEstateWallet.address);
      expect(await vaultBrickToken.stableToken()).to.equal(mockUSDC.address);
    });

    it("Should allow authorized minters to mint tokens", async function () {
      await vaultBrickToken.mint(investor1.address, SHARE_PRICE);
      expect(await vaultBrickToken.balanceOf(investor1.address)).to.equal(SHARE_PRICE);
    });

    it("Should not allow unauthorized addresses to mint", async function () {
      await expect(
        vaultBrickToken.connect(investor1).mint(investor2.address, SHARE_PRICE)
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("Should handle income distribution correctly", async function () {
      // Mint tokens to investors
      await vaultBrickToken.mint(investor1.address, SHARE_PRICE);
      await vaultBrickToken.mint(investor2.address, SHARE_PRICE);
      
      // Fund the contract with stable tokens
      await mockUSDC.mint(vaultBrickToken.address, INCOME_AMOUNT);
      
      // Wait for cooldown period (simulate)
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]); // 30 days + 1 second
      await ethers.provider.send("evm_mine", []);
      
      // Distribute income
      await vaultBrickToken.distributeIncome();
      
      // Check distribution was recorded
      expect(await vaultBrickToken.distributionCount()).to.equal(1);
      
      const distribution = await vaultBrickToken.distributions(1);
      expect(distribution.total).to.equal(INCOME_AMOUNT);
      expect(distribution.toCoinEstate).to.equal(INCOME_AMOUNT.mul(10).div(100)); // 10%
      expect(distribution.toPuffer).to.equal(INCOME_AMOUNT.mul(10).div(100)); // 10%
    });

    it("Should allow users to claim their income", async function () {
      // Setup: Mint tokens and distribute income
      await vaultBrickToken.mint(investor1.address, SHARE_PRICE);
      await vaultBrickToken.mint(investor2.address, SHARE_PRICE.mul(2)); // Double amount
      
      await mockUSDC.mint(vaultBrickToken.address, INCOME_AMOUNT);
      
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      await vaultBrickToken.distributeIncome();
      
      // Check claimable amounts
      const claimableAmounts = await vaultBrickToken.getClaimableAmounts(investor1.address, [1]);
      expect(claimableAmounts[0]).to.be.gt(0);
      
      // Claim income
      const initialBalance = await mockUSDC.balanceOf(investor1.address);
      await vaultBrickToken.connect(investor1).claimBatch([1]);
      const finalBalance = await mockUSDC.balanceOf(investor1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should handle batch claiming correctly", async function () {
      // Setup multiple distributions
      await vaultBrickToken.mint(investor1.address, SHARE_PRICE);
      
      // First distribution
      await mockUSDC.mint(vaultBrickToken.address, INCOME_AMOUNT);
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await vaultBrickToken.distributeIncome();
      
      // Second distribution
      await mockUSDC.mint(vaultBrickToken.address, INCOME_AMOUNT);
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await vaultBrickToken.distributeIncome();
      
      // Batch claim
      const initialBalance = await mockUSDC.balanceOf(investor1.address);
      await vaultBrickToken.connect(investor1).claimBatch([1, 2]);
      const finalBalance = await mockUSDC.balanceOf(investor1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
      expect(await vaultBrickToken.distributionCount()).to.equal(2);
    });

    it("Should not allow claiming after expiration", async function () {
      await vaultBrickToken.mint(investor1.address, SHARE_PRICE);
      await mockUSDC.mint(vaultBrickToken.address, INCOME_AMOUNT);
      
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await vaultBrickToken.distributeIncome();
      
      // Wait for expiration (180 days)
      await ethers.provider.send("evm_increaseTime", [180 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(
        vaultBrickToken.connect(investor1).claimBatch([1])
      ).to.be.revertedWith("Nothing to claim");
    });

    it("Should allow owner to sweep unclaimed funds", async function () {
      await vaultBrickToken.mint(investor1.address, SHARE_PRICE);
      await mockUSDC.mint(vaultBrickToken.address, INCOME_AMOUNT);
      
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await vaultBrickToken.distributeIncome();
      
      // Wait for expiration
      await ethers.provider.send("evm_increaseTime", [180 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      const initialWalletBalance = await mockUSDC.balanceOf(coinEstateWallet.address);
      await vaultBrickToken.sweepUnclaimed(1);
      const finalWalletBalance = await mockUSDC.balanceOf(coinEstateWallet.address);
      
      expect(finalWalletBalance).to.be.gt(initialWalletBalance);
    });
  });

  describe("Property NFT Integration", function () {
    beforeEach(async function () {
      // Create a sample property
      await propertyNFT.createProperty(
        "Test Property",
        ethers.utils.parseEther("1500000"),
        750,
        "QmTestHash"
      );
    });

    it("Should mint VBK tokens when purchasing property shares", async function () {
      const initialVBKBalance = await vaultBrickToken.balanceOf(investor1.address);
      
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      
      const finalVBKBalance = await vaultBrickToken.balanceOf(investor1.address);
      expect(finalVBKBalance).to.equal(initialVBKBalance.add(SHARE_PRICE));
      
      expect(await propertyNFT.ownerOf(0)).to.equal(investor1.address);
    });

    it("Should track property share ownership correctly", async function () {
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      
      const propertyShare = await propertyNFT.getPropertyShare(0);
      expect(propertyShare.propertyId).to.equal(0);
      expect(propertyShare.owner).to.equal(investor1.address);
      expect(propertyShare.purchasePrice).to.equal(SHARE_PRICE);
    });

    it("Should update property status when funding is complete", async function () {
      // Create small property with only 2 shares
      await propertyNFT.createProperty(
        "Small Property",
        ethers.utils.parseEther("4000"),
        2,
        "QmSmallHash"
      );
      
      // Purchase both shares
      await propertyNFT.connect(investor1).purchasePropertyShare(1, {
        value: SHARE_PRICE,
      });
      
      let property = await propertyNFT.getProperty(1);
      expect(property.status).to.equal(0); // Still Active
      
      await propertyNFT.connect(investor2).purchasePropertyShare(1, {
        value: SHARE_PRICE,
      });
      
      property = await propertyNFT.getProperty(1);
      expect(property.status).to.equal(1); // FundingComplete
    });

    it("Should allow income distribution integration", async function () {
      // Purchase shares
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      await propertyNFT.connect(investor2).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      
      // Fund VBK contract for distribution
      await mockUSDC.mint(vaultBrickToken.address, INCOME_AMOUNT);
      
      // Trigger distribution via PropertyNFT
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await propertyNFT.triggerIncomeDistribution();
      
      expect(await vaultBrickToken.distributionCount()).to.equal(1);
    });
  });

  describe("Upgradeability", function () {
    it("Should be upgradeable by owner", async function () {
      const VaultBrickUpgradeableV2 = await ethers.getContractFactory("VaultBrickUpgradeable");
      
      const upgraded = await upgrades.upgradeProxy(vaultBrickToken.address, VaultBrickUpgradeableV2);
      
      // Verify state is preserved
      expect(await upgraded.name()).to.equal("VaultBrick");
      expect(await upgraded.symbol()).to.equal("VBK");
      expect(await upgraded.cap()).to.equal(MAX_SUPPLY);
    });

    it("Should not be upgradeable by non-owner", async function () {
      const VaultBrickUpgradeableV2 = await ethers.getContractFactory("VaultBrickUpgradeable");
      
      await expect(
        upgrades.upgradeProxy(vaultBrickToken.address, VaultBrickUpgradeableV2.connect(investor1))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow pausing by owner", async function () {
      await vaultBrickToken.pause();
      
      await expect(
        vaultBrickToken.mint(investor1.address, SHARE_PRICE)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow token recovery", async function () {
      // Deploy another token
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const otherToken = await MockERC20.deploy("Other Token", "OTHER", 18);
      await otherToken.mint(vaultBrickToken.address, ethers.utils.parseEther("1000"));
      
      const initialBalance = await otherToken.balanceOf(owner.address);
      await vaultBrickToken.recoverERC20(otherToken.address, ethers.utils.parseEther("1000"));
      const finalBalance = await otherToken.balanceOf(owner.address);
      
      expect(finalBalance).to.equal(initialBalance.add(ethers.utils.parseEther("1000")));
    });

    it("Should not allow recovery of stable token", async function () {
      await expect(
        vaultBrickToken.recoverERC20(mockUSDC.address, ethers.utils.parseEther("1000"))
      ).to.be.revertedWith("Cannot recover stable token");
    });
  });
});

// Mock ERC20 contract for testing
const MockERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
`;
