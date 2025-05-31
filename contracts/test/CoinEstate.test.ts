import { expect } from "chai";
import { ethers } from "hardhat";
import { VaultBrickToken, PropertyNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("CoinEstate Platform", function () {
  let vaultBrickToken: VaultBrickToken;
  let propertyNFT: PropertyNFT;
  let owner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  let investor3: SignerWithAddress;

  const SHARE_PRICE = ethers.utils.parseEther("2000"); // €2,000
  const MAX_SUPPLY = ethers.utils.parseEther("2500000"); // 2.5M VBK

  beforeEach(async function () {
    [owner, investor1, investor2, investor3] = await ethers.getSigners();

    // Deploy VaultBrick Token
    const VaultBrickToken = await ethers.getContractFactory("VaultBrickToken");
    vaultBrickToken = await VaultBrickToken.deploy(owner.address);
    await vaultBrickToken.deployed();

    // Deploy Property NFT
    const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
    propertyNFT = await PropertyNFT.deploy(vaultBrickToken.address, owner.address);
    await propertyNFT.deployed();

    // Add PropertyNFT as authorized minter
    await vaultBrickToken.addAuthorizedMinter(propertyNFT.address);
  });

  describe("VaultBrick Token (VBK)", function () {
    it("Should have correct initial parameters", async function () {
      expect(await vaultBrickToken.name()).to.equal("VaultBrick");
      expect(await vaultBrickToken.symbol()).to.equal("VBK");
      expect(await vaultBrickToken.decimals()).to.equal(18);
      expect(await vaultBrickToken.totalSupply()).to.equal(0);
      expect(await vaultBrickToken.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("Should allow authorized minters to mint tokens", async function () {
      await vaultBrickToken.addAuthorizedMinter(investor1.address);
      
      await vaultBrickToken.connect(investor1).mint(investor2.address, SHARE_PRICE);
      
      expect(await vaultBrickToken.balanceOf(investor2.address)).to.equal(SHARE_PRICE);
      expect(await vaultBrickToken.totalSupply()).to.equal(SHARE_PRICE);
    });

    it("Should not allow unauthorized addresses to mint", async function () {
      await expect(
        vaultBrickToken.connect(investor1).mint(investor2.address, SHARE_PRICE)
      ).to.be.revertedWith("VBK: Not authorized to mint");
    });

    it("Should not mint beyond max supply", async function () {
      await vaultBrickToken.addAuthorizedMinter(investor1.address);
      
      await expect(
        vaultBrickToken.connect(investor1).mint(investor2.address, MAX_SUPPLY.add(1))
      ).to.be.revertedWith("VBK: Exceeds max supply");
    });

    it("Should allow token burning", async function () {
      await vaultBrickToken.addAuthorizedMinter(investor1.address);
      await vaultBrickToken.connect(investor1).mint(investor1.address, SHARE_PRICE);
      
      await vaultBrickToken.connect(investor1).burn(SHARE_PRICE.div(2));
      
      expect(await vaultBrickToken.balanceOf(investor1.address)).to.equal(SHARE_PRICE.div(2));
    });

    it("Should track distribution data", async function () {
      await vaultBrickToken.addAuthorizedMinter(owner.address);
      await vaultBrickToken.mint(investor1.address, SHARE_PRICE);
      
      const recipients = [investor1.address];
      const amounts = [ethers.utils.parseEther("100")];
      
      await vaultBrickToken.distributeIncome(recipients, amounts);
      
      const holderInfo = await vaultBrickToken.getHolderInfo(investor1.address);
      expect(holderInfo.balance).to.equal(SHARE_PRICE);
      expect(holderInfo.lastDistributionTime).to.be.gt(0);
    });
  });

  describe("Property NFT", function () {
    beforeEach(async function () {
      // Create a sample property
      await propertyNFT.createProperty(
        "Tallinn, Estonia - Sample Property",
        ethers.utils.parseEther("1500000"), // €1.5M
        750, // 750 shares
        "QmSampleIPFSHash"
      );
    });

    it("Should create property correctly", async function () {
      const property = await propertyNFT.getProperty(0);
      
      expect(property.propertyAddress).to.equal("Tallinn, Estonia - Sample Property");
      expect(property.totalValue).to.equal(ethers.utils.parseEther("1500000"));
      expect(property.totalShares).to.equal(750);
      expect(property.availableShares).to.equal(750);
      expect(property.status).to.equal(0); // PropertyStatus.Active
    });

    it("Should allow property share purchase", async function () {
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });

      expect(await propertyNFT.ownerOf(0)).to.equal(investor1.address);
      expect(await propertyNFT.balanceOf(investor1.address)).to.equal(1);
      expect(await vaultBrickToken.balanceOf(investor1.address)).to.equal(SHARE_PRICE);

      const property = await propertyNFT.getProperty(0);
      expect(property.availableShares).to.equal(749);

      const propertyShare = await propertyNFT.getPropertyShare(0);
      expect(propertyShare.propertyId).to.equal(0);
      expect(propertyShare.owner).to.equal(investor1.address);
      expect(propertyShare.shareNumber).to.equal(1);
    });

    it("Should require correct payment for share purchase", async function () {
      await expect(
        propertyNFT.connect(investor1).purchasePropertyShare(0, {
          value: SHARE_PRICE.sub(1),
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should refund excess payment", async function () {
      const initialBalance = await investor1.getBalance();
      const excessPayment = SHARE_PRICE.add(ethers.utils.parseEther("100"));
      
      const tx = await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: excessPayment,
      });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const finalBalance = await investor1.getBalance();
      const expectedBalance = initialBalance.sub(SHARE_PRICE).sub(gasUsed);
      
      expect(finalBalance).to.be.closeTo(expectedBalance, ethers.utils.parseEther("0.01"));
    });

    it("Should update property status when funding complete", async function () {
      // Create small property with only 2 shares for testing
      await propertyNFT.createProperty(
        "Small Test Property",
        ethers.utils.parseEther("4000"), // €4,000
        2, // 2 shares
        "QmTestIPFSHash"
      );

      // Purchase first share
      await propertyNFT.connect(investor1).purchasePropertyShare(1, {
        value: SHARE_PRICE,
      });

      let property = await propertyNFT.getProperty(1);
      expect(property.status).to.equal(0); // Still Active

      // Purchase second share
      await propertyNFT.connect(investor2).purchasePropertyShare(1, {
        value: SHARE_PRICE,
      });

      property = await propertyNFT.getProperty(1);
      expect(property.status).to.equal(1); // FundingComplete
      expect(property.availableShares).to.equal(0);
    });

    it("Should distribute property income correctly", async function () {
      // Purchase shares
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      await propertyNFT.connect(investor2).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });

      // Update property status to operational
      await propertyNFT.updatePropertyStatus(0, 3); // PropertyStatus.Operational

      // Distribute income
      const totalIncome = ethers.utils.parseEther("1000");
      await propertyNFT.distributePropertyIncome(0, totalIncome);

      const property = await propertyNFT.getProperty(0);
      expect(property.lastIncomeDistribution).to.be.gt(0);
    });

    it("Should record property sale correctly", async function () {
      // Purchase shares
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      await propertyNFT.connect(investor2).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });

      // Record sale
      const salePrice = ethers.utils.parseEther("1600000"); // €1.6M
      await propertyNFT.recordPropertySale(0, salePrice);

      const property = await propertyNFT.getProperty(0);
      expect(property.status).to.equal(4); // PropertyStatus.Sold
    });

    it("Should return correct platform statistics", async function () {
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });

      const stats = await propertyNFT.getPlatformStats();
      expect(stats.totalProperties).to.equal(1);
      expect(stats.totalNFTs).to.equal(1);
      expect(stats.activeProperties).to.equal(1);
    });

    it("Should track owner token IDs correctly", async function () {
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });

      const tokenIds = await propertyNFT.getOwnerTokenIds(investor1.address);
      expect(tokenIds.length).to.equal(2);
      expect(tokenIds[0]).to.equal(0);
      expect(tokenIds[1]).to.equal(1);
    });

    it("Should handle NFT transfers correctly", async function () {
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });

      // Transfer NFT
      await propertyNFT.connect(investor1).transferFrom(
        investor1.address,
        investor2.address,
        0
      );

      expect(await propertyNFT.ownerOf(0)).to.equal(investor2.address);
      
      const investor1TokenIds = await propertyNFT.getOwnerTokenIds(investor1.address);
      const investor2TokenIds = await propertyNFT.getOwnerTokenIds(investor2.address);
      
      expect(investor1TokenIds.length).to.equal(0);
      expect(investor2TokenIds.length).to.equal(1);
      expect(investor2TokenIds[0]).to.equal(0);

      const propertyShare = await propertyNFT.getPropertyShare(0);
      expect(propertyShare.owner).to.equal(investor2.address);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete investment flow", async function () {
      // Create property
      await propertyNFT.createProperty(
        "Complete Flow Test Property",
        ethers.utils.parseEther("2000000"), // €2M
        1000, // 1000 shares
        "QmCompleteFlowHash"
      );

      // Multiple investors purchase shares
      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      await propertyNFT.connect(investor2).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });
      await propertyNFT.connect(investor3).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });

      // Verify VBK token distribution
      expect(await vaultBrickToken.balanceOf(investor1.address)).to.equal(SHARE_PRICE);
      expect(await vaultBrickToken.balanceOf(investor2.address)).to.equal(SHARE_PRICE);
      expect(await vaultBrickToken.balanceOf(investor3.address)).to.equal(SHARE_PRICE);

      // Update to operational
      await propertyNFT.updatePropertyStatus(0, 3);

      // Distribute income
      const monthlyIncome = ethers.utils.parseEther("5000");
      await propertyNFT.distributePropertyIncome(0, monthlyIncome);

      // Verify platform stats
      const stats = await propertyNFT.getPlatformStats();
      expect(stats.totalNFTs).to.equal(3);
      expect(stats.totalProperties).to.equal(1);
    });

    it("Should handle emergency pause scenarios", async function () {
      // Pause contracts
      await vaultBrickToken.pause();
      await propertyNFT.pause();

      // Should not allow operations when paused
      await expect(
        propertyNFT.connect(investor1).purchasePropertyShare(0, {
          value: SHARE_PRICE,
        })
      ).to.be.revertedWith("Pausable: paused");

      await expect(
        vaultBrickToken.connect(owner).mint(investor1.address, SHARE_PRICE)
      ).to.be.revertedWith("Pausable: paused");

      // Unpause and verify operations work
      await vaultBrickToken.unpause();
      await propertyNFT.unpause();

      await propertyNFT.connect(investor1).purchasePropertyShare(0, {
        value: SHARE_PRICE,
      });

      expect(await propertyNFT.balanceOf(investor1.address)).to.equal(1);
    });
  });
});
