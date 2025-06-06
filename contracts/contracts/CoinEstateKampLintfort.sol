// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CoinEstate Kamp-Lintfort Collection
 * @dev Specific NFT collection for the €1.795M Kamp-Lintfort mixed-use property complex
 * @notice 2,500 NFTs at €1,000 each for premium downtown property community membership
 */
contract CoinEstateKampLintfort is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Kamp-Lintfort Collection Constants
    uint256 public constant KAMP_LINTFORT_MAX_SUPPLY = 2500;
    uint256 public constant MINT_PRICE_EUR = 1000 ether; // €1,000 in wei format
    uint256 public constant PROPERTY_VALUE_EUR = 1795000 ether; // €1.795M in wei format
    
    // Property Details
    struct PropertyDetails {
        string name;
        string location;
        address propertyManager;
        uint256 totalCommercialSpace; // 1,094 m²
        uint256 totalResidentialSpace; // 1,009 m²
        uint256 totalPlotSize; // 1,797 m²
        uint256 totalParkingSpaces; // 15 (4 garages + 11 parking)
        string buildingDetails; // Haus I-III info
    }
    
    // Member Tiers
    enum MemberTier {
        Standard,   // 1-9 NFTs
        Gold,       // 10+ NFTs
        Platinum    // 100+ NFTs
    }
    
    // Member Benefits
    struct MemberBenefits {
        MemberTier tier;
        uint256 baseDiscountPercentage;
        uint256 maxDiscountPercentage;
        bool hasExclusiveAccess;
        uint256 totalNFTsHeld;
        uint256 joinDate;
        uint256 totalIncomeReceived;
    }
    
    // Revenue Management (MiCA Compliance)
    struct RevenueStatus {
        uint256 totalRevenue;
        uint256 frozenRevenue; // 90% frozen until MiCA compliance
        uint256 operationalRevenue; // 10% for operations
        bool micaCompliant;
        uint256 lastDistribution;
    }
    
    Counters.Counter private _tokenIdCounter;
    
    // State Variables
    PropertyDetails public kampLintfortProperty;
    RevenueStatus public revenueStatus;
    
    // Mappings
    mapping(address => MemberBenefits) public memberBenefits;
    mapping(address => uint256[]) public memberTokens;
    mapping(uint256 => uint256) public tokenMintPrice;
    mapping(uint256 => uint256) public tokenMintDate;
    
    // Platform Settings
    address public treasuryWallet;
    address public propertyManagementWallet;
    uint256 public platformFeePercentage = 10; // 10% platform fee
    bool public mintingActive = false;
    uint256 public launchDate; // Juli 2025
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 price, MemberTier tier);
    event TierUpgraded(address indexed member, MemberTier newTier, uint256 totalNFTs);
    event RevenueDistributed(uint256 totalAmount, uint256 frozenAmount, uint256 operationalAmount);
    event MiCAComplianceUpdated(bool compliant, uint256 timestamp);
    event PropertyDetailsUpdated(string name, string location);
    
    constructor(
        address _treasuryWallet,
        address _propertyManagementWallet,
        address initialOwner
    ) ERC721("CoinEstate Kamp-Lintfort", "CEKL") {
        treasuryWallet = _treasuryWallet;
        propertyManagementWallet = _propertyManagementWallet;
        _transferOwnership(initialOwner);
        
        // Initialize Kamp-Lintfort property details
        kampLintfortProperty = PropertyDetails({
            name: "Kamp-Lintfort Mixed-Use Complex",
            location: "Downtown Kamp-Lintfort, NRW, Germany",
            propertyManager: _propertyManagementWallet,
            totalCommercialSpace: 1094, // m²
            totalResidentialSpace: 1009, // m²
            totalPlotSize: 1797, // m²
            totalParkingSpaces: 15,
            buildingDetails: "Haus I (1967), Haus II (1976), Haus III (1920) - Historic buildings with modern amenities"
        });
        
        // Initialize revenue status
        revenueStatus = RevenueStatus({
            totalRevenue: 0,
            frozenRevenue: 0,
            operationalRevenue: 0,
            micaCompliant: false,
            lastDistribution: 0
        });
    }
    
    /**
     * @dev Mint Kamp-Lintfort community membership NFT
     * @param to Address to mint NFT to
     */
    function mintCommunityNFT(address to) external payable nonReentrant whenNotPaused {
        require(mintingActive, "Minting not active yet - Juli 2025 launch");
        require(msg.value >= MINT_PRICE_EUR, "Insufficient payment - 1000 EUR required");
        require(_tokenIdCounter.current() < KAMP_LINTFORT_MAX_SUPPLY, "Maximum supply reached (2,500 NFTs)");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Store mint information
        tokenMintPrice[tokenId] = msg.value;
        tokenMintDate[tokenId] = block.timestamp;
        
        // Update member tracking
        memberTokens[to].push(tokenId);
        _updateMemberTier(to);
        
        // Mint NFT
        _safeMint(to, tokenId);
        
        // Set metadata URI (IPFS hash for Kamp-Lintfort collection)
        string memory tokenURI = string(abi.encodePacked(
            "ipfs://QmKampLintfortCollection/metadata/",
            Strings.toString(tokenId),
            ".json"
        ));
        _setTokenURI(tokenId, tokenURI);
        
        // Handle payment
        _handlePayment(msg.value);
        
        // Refund excess
        if (msg.value > MINT_PRICE_EUR) {
            payable(msg.sender).transfer(msg.value - MINT_PRICE_EUR);
        }
        
        emit NFTMinted(to, tokenId, MINT_PRICE_EUR, memberBenefits[to].tier);
    }
    
    /**
     * @dev Batch mint multiple NFTs (for large purchases)
     */
    function batchMintNFTs(address to, uint256 quantity) external payable nonReentrant whenNotPaused {
        require(mintingActive, "Minting not active yet - Juli 2025 launch");
        require(quantity > 0 && quantity <= 100, "Invalid quantity (1-100)");
        require(msg.value >= MINT_PRICE_EUR * quantity, "Insufficient payment");
        require(_tokenIdCounter.current() + quantity <= KAMP_LINTFORT_MAX_SUPPLY, "Exceeds maximum supply");
        
        uint256 totalCost = MINT_PRICE_EUR * quantity;
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            
            tokenMintPrice[tokenId] = MINT_PRICE_EUR;
            tokenMintDate[tokenId] = block.timestamp;
            memberTokens[to].push(tokenId);
            
            _safeMint(to, tokenId);
            
            string memory tokenURI = string(abi.encodePacked(
                "ipfs://QmKampLintfortCollection/metadata/",
                Strings.toString(tokenId),
                ".json"
            ));
            _setTokenURI(tokenId, tokenURI);
        }
        
        _updateMemberTier(to);
        _handlePayment(totalCost);
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
    }
    
    /**
     * @dev Update member tier based on NFT holdings
     */
    function _updateMemberTier(address member) internal {
        uint256 nftCount = memberTokens[member].length;
        MemberTier currentTier = memberBenefits[member].tier;
        MemberTier newTier;
        
        if (nftCount >= 100) {
            newTier = MemberTier.Platinum;
        } else if (nftCount >= 10) {
            newTier = MemberTier.Gold;
        } else {
            newTier = MemberTier.Standard;
        }
        
        if (newTier != currentTier) {
            memberBenefits[member] = MemberBenefits({
                tier: newTier,
                baseDiscountPercentage: _getBaseDiscount(newTier),
                maxDiscountPercentage: _getMaxDiscount(newTier, nftCount),
                hasExclusiveAccess: newTier == MemberTier.Platinum,
                totalNFTsHeld: nftCount,
                joinDate: memberBenefits[member].joinDate == 0 ? block.timestamp : memberBenefits[member].joinDate,
                totalIncomeReceived: memberBenefits[member].totalIncomeReceived
            });
            
            emit TierUpgraded(member, newTier, nftCount);
        } else {
            memberBenefits[member].totalNFTsHeld = nftCount;
            memberBenefits[member].maxDiscountPercentage = _getMaxDiscount(newTier, nftCount);
        }
    }
    
    /**
     * @dev Calculate base discount for tier
     */
    function _getBaseDiscount(MemberTier tier) internal pure returns (uint256) {
        if (tier == MemberTier.Platinum) return 50;
        if (tier == MemberTier.Gold) return 20;
        return 0; // Standard tier
    }
    
    /**
     * @dev Calculate maximum discount based on tier and NFT count
     */
    function _getMaxDiscount(MemberTier tier, uint256 nftCount) internal pure returns (uint256) {
        if (tier == MemberTier.Platinum) {
            // Platinum: Up to 90% discount
            return 90;
        } else if (tier == MemberTier.Gold) {
            // Gold: 20% base + additional per NFT (max 90%)
            uint256 additionalDiscount = (nftCount - 10) * 5; // 5% per additional NFT
            return 20 + (additionalDiscount > 70 ? 70 : additionalDiscount); // Max 90%
        }
        return 0; // Standard tier
    }
    
    /**
     * @dev Handle payment distribution (90% frozen for MiCA compliance)
     */
    function _handlePayment(uint256 amount) internal {
        uint256 frozenAmount = (amount * 90) / 100; // 90% frozen
        uint256 operationalAmount = amount - frozenAmount;
        
        revenueStatus.totalRevenue += amount;
        revenueStatus.frozenRevenue += frozenAmount;
        revenueStatus.operationalRevenue += operationalAmount;
        
        // Send operational amount to treasury
        if (operationalAmount > 0) {
            payable(treasuryWallet).transfer(operationalAmount);
        }
        
        // Frozen amount stays in contract until MiCA compliance
    }
    
    /**
     * @dev Distribute property income to NFT holders (post-MiCA compliance)
     */
    function distributePropertyIncome() external payable onlyOwner nonReentrant {
        require(revenueStatus.micaCompliant, "MiCA compliance required for income distribution");
        require(msg.value > 0, "Income amount must be positive");
        require(totalSupply() > 0, "No NFT holders to distribute to");
        
        uint256 platformFee = (msg.value * platformFeePercentage) / 100;
        uint256 distributionAmount = msg.value - platformFee;
        uint256 incomePerNFT = distributionAmount / totalSupply();
        
        // Distribute to all current NFT holders
        for (uint256 i = 0; i < totalSupply(); i++) {
            uint256 tokenId = tokenByIndex(i);
            address owner = ownerOf(tokenId);
            
            memberBenefits[owner].totalIncomeReceived += incomePerNFT;
            payable(owner).transfer(incomePerNFT);
        }
        
        // Send platform fee to treasury
        if (platformFee > 0) {
            payable(treasuryWallet).transfer(platformFee);
        }
        
        revenueStatus.lastDistribution = block.timestamp;
        emit RevenueDistributed(msg.value, 0, distributionAmount);
    }
    
    /**
     * @dev Get member information
     */
    function getMemberInfo(address member) external view returns (
        MemberBenefits memory benefits,
        uint256[] memory tokenIds,
        uint256 totalSpent
    ) {
        benefits = memberBenefits[member];
        tokenIds = memberTokens[member];
        
        totalSpent = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            totalSpent += tokenMintPrice[tokenIds[i]];
        }
    }
    
    /**
     * @dev Get collection statistics
     */
    function getCollectionStats() external view returns (
        uint256 totalMinted,
        uint256 remainingSupply,
        uint256 totalRevenue,
        uint256 frozenRevenue,
        uint256 averagePrice,
        bool micaCompliant
    ) {
        totalMinted = totalSupply();
        remainingSupply = KAMP_LINTFORT_MAX_SUPPLY - totalMinted;
        totalRevenue = revenueStatus.totalRevenue;
        frozenRevenue = revenueStatus.frozenRevenue;
        averagePrice = totalMinted > 0 ? totalRevenue / totalMinted : 0;
        micaCompliant = revenueStatus.micaCompliant;
    }
    
    /**
     * @dev Get property details
     */
    function getPropertyDetails() external view returns (PropertyDetails memory) {
        return kampLintfortProperty;
    }
    
    // Admin Functions
    function setMintingActive(bool active) external onlyOwner {
        mintingActive = active;
    }
    
    function setLaunchDate(uint256 _launchDate) external onlyOwner {
        launchDate = _launchDate;
    }
    
    function updateMiCACompliance(bool compliant) external onlyOwner {
        revenueStatus.micaCompliant = compliant;
        emit MiCAComplianceUpdated(compliant, block.timestamp);
    }
    
    function updatePropertyDetails(
        string memory name,
        string memory location,
        address manager
    ) external onlyOwner {
        kampLintfortProperty.name = name;
        kampLintfortProperty.location = location;
        kampLintfortProperty.propertyManager = manager;
        emit PropertyDetailsUpdated(name, location);
    }
    
    function updateTreasuryWallet(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasuryWallet = newTreasury;
    }
    
    function updatePlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 20, "Fee too high (max 20%)");
        platformFeePercentage = newFeePercentage;
    }
    
    /**
     * @dev Emergency withdrawal of frozen funds (post-MiCA compliance only)
     */
    function emergencyWithdrawFrozenFunds() external onlyOwner {
        require(revenueStatus.micaCompliant, "MiCA compliance required");
        require(revenueStatus.frozenRevenue > 0, "No frozen funds to withdraw");
        
        uint256 amount = revenueStatus.frozenRevenue;
        revenueStatus.frozenRevenue = 0;
        
        payable(treasuryWallet).transfer(amount);
    }
    
    // Required overrides for multiple inheritance
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Update member tracking on transfer
        if (from != address(0) && to != address(0)) {
            // Remove from old owner
            uint256[] storage fromTokens = memberTokens[from];
            for (uint256 i = 0; i < fromTokens.length; i++) {
                if (fromTokens[i] == tokenId) {
                    fromTokens[i] = fromTokens[fromTokens.length - 1];
                    fromTokens.pop();
                    break;
                }
            }
            
            // Add to new owner
            memberTokens[to].push(tokenId);
            
            // Update tiers for both parties
            _updateMemberTier(from);
            _updateMemberTier(to);
        }
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        require(paused(), "Contract must be paused for emergency withdrawal");
        payable(owner()).transfer(address(this).balance);
    }
    
    // Prevent accidental ETH sends
    receive() external payable {
        revert("Use mintCommunityNFT() to purchase membership NFTs");
    }
}