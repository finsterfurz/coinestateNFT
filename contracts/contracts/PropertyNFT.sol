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
 * @title CoinEstate PropertyNFT
 * @dev NFT-based fractional real estate ownership - SIMPLIFIED MODEL
 * Each NFT represents direct ownership in a specific property
 * NO VBK TOKENS - Direct ETH/Stablecoin payments only
 */
contract PropertyNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    struct Property {
        uint256 id;
        string name;                    // "Berlin Apartment Complex"
        string location;                // "Berlin, Germany"
        string propertyAddress;         // Physical address
        uint256 totalValue;             // Total property value in EUR (wei)
        uint256 totalShares;            // Total NFT shares available
        uint256 availableShares;        // Remaining shares for sale
        uint256 pricePerShare;          // Price per NFT in EUR (wei)
        string ipfsHash;                // Property metadata and images
        PropertyStatus status;
        PropertyType propertyType;      // Investment vs Vacation
        uint256 createdAt;
        uint256 lastIncomeDistribution;
        uint256 totalIncomeDistributed; // Track total income paid out
    }

    struct PropertyShare {
        uint256 propertyId;
        address owner;
        uint256 shareNumber;            // Share #1, #2, etc. within property
        uint256 purchasePrice;          // What they paid in EUR
        uint256 purchaseDate;
        uint256 totalIncomeReceived;    // Track income for this specific NFT
        uint256 lastIncomeCollection;
    }

    struct VacationUtility {
        uint256 propertyId;
        uint256 freeWeeksPerYear;       // e.g., 1 week for Thailand villa
        uint256 discountPercentage;     // e.g., 50% for additional weeks
        bool hasVacationRights;         // If this property offers vacation utility
        uint256 maxBookingsPerYear;     // Limit bookings per NFT
    }

    enum PropertyStatus {
        Funding,        // Accepting investments
        FundingComplete, // All shares sold
        Acquired,       // Property purchased
        Operational,    // Generating income
        Sold           // Property sold, profits distributed
    }

    enum PropertyType {
        Investment,     // Pure rental investment (Germany)
        Vacation,       // Vacation rental with utility (Thailand)
        Mixed          // Both investment and vacation rights
    }

    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _propertyIdCounter;
    
    // Core mappings
    mapping(uint256 => Property) public properties;
    mapping(uint256 => PropertyShare) public propertyShares;
    mapping(uint256 => VacationUtility) public vacationUtilities;
    mapping(uint256 => uint256[]) public propertyToTokenIds;
    mapping(address => uint256[]) public ownerToTokenIds;
    
    // Payment tracking
    mapping(uint256 => uint256) public propertyRevenue; // Total revenue per property
    mapping(address => uint256) public totalUserIncome; // Total income per user
    
    // Platform settings
    uint256 public platformFeePercentage = 10; // 10% platform fee
    address public treasuryWallet;
    
    // Supported stablecoins for payments
    mapping(address => bool) public acceptedStablecoins;
    
    event PropertyCreated(uint256 indexed propertyId, string name, string location, uint256 totalValue, uint256 totalShares, PropertyType propertyType);
    event SharePurchased(uint256 indexed tokenId, uint256 indexed propertyId, address indexed buyer, uint256 shareNumber, uint256 price);
    event PropertyStatusChanged(uint256 indexed propertyId, PropertyStatus newStatus);
    event IncomeDistributed(uint256 indexed propertyId, uint256 totalAmount, uint256 platformFee, uint256 timestamp);
    event PropertySold(uint256 indexed propertyId, uint256 salePrice, uint256 profitPerShare, uint256 timestamp);
    event VacationUtilityAdded(uint256 indexed propertyId, uint256 freeWeeks, uint256 discountPercentage);

    constructor(
        address _treasuryWallet,
        address initialOwner
    ) ERC721("CoinEstate Property", "CESTATE") {
        treasuryWallet = _treasuryWallet;
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Creates a new property for fractional ownership
     * SIMPLIFIED: Direct EUR pricing, no VBK tokens involved
     */
    function createProperty(
        string memory name,
        string memory location, 
        string memory propertyAddress,
        uint256 totalValueEUR,      // in EUR (wei format: €1M = 1000000 * 10^18)
        uint256 totalShares,
        uint256 pricePerShareEUR,   // in EUR (wei format: €2000 = 2000 * 10^18)
        string memory ipfsHash,
        PropertyType propertyType
    ) external onlyOwner whenNotPaused {
        require(bytes(name).length > 0, "Property name required");
        require(bytes(location).length > 0, "Location required");
        require(totalValueEUR > 0, "Total value must be positive");
        require(totalShares > 0, "Total shares must be positive");
        require(pricePerShareEUR > 0, "Price per share must be positive");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");

        uint256 propertyId = _propertyIdCounter.current();
        _propertyIdCounter.increment();

        properties[propertyId] = Property({
            id: propertyId,
            name: name,
            location: location,
            propertyAddress: propertyAddress,
            totalValue: totalValueEUR,
            totalShares: totalShares,
            availableShares: totalShares,
            pricePerShare: pricePerShareEUR,
            ipfsHash: ipfsHash,
            status: PropertyStatus.Funding,
            propertyType: propertyType,
            createdAt: block.timestamp,
            lastIncomeDistribution: 0,
            totalIncomeDistributed: 0
        });

        emit PropertyCreated(propertyId, name, location, totalValueEUR, totalShares, propertyType);
    }

    /**
     * @dev Purchase a property share NFT with ETH
     * SIMPLIFIED: Direct payment, no VBK token minting
     */
    function purchasePropertyShare(uint256 propertyId) external payable nonReentrant whenNotPaused {
        Property storage property = properties[propertyId];
        require(property.id == propertyId, "Property does not exist");
        require(property.status == PropertyStatus.Funding, "Property not available for purchase");
        require(property.availableShares > 0, "No shares available");
        require(msg.value >= property.pricePerShare, "Insufficient payment");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        uint256 shareNumber = property.totalShares - property.availableShares + 1;
        
        propertyShares[tokenId] = PropertyShare({
            propertyId: propertyId,
            owner: msg.sender,
            shareNumber: shareNumber,
            purchasePrice: property.pricePerShare,
            purchaseDate: block.timestamp,
            totalIncomeReceived: 0,
            lastIncomeCollection: block.timestamp
        });

        property.availableShares--;
        propertyToTokenIds[propertyId].push(tokenId);
        ownerToTokenIds[msg.sender].push(tokenId);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, property.ipfsHash);

        emit SharePurchased(tokenId, propertyId, msg.sender, shareNumber, property.pricePerShare);

        // Check if funding is complete
        if (property.availableShares == 0) {
            property.status = PropertyStatus.FundingComplete;
            emit PropertyStatusChanged(propertyId, PropertyStatus.FundingComplete);
        }

        // Refund excess payment
        if (msg.value > property.pricePerShare) {
            payable(msg.sender).transfer(msg.value - property.pricePerShare);
        }

        // Send payment to treasury
        payable(treasuryWallet).transfer(property.pricePerShare);
    }

    /**
     * @dev Distribute rental income to NFT holders
     * SIMPLIFIED: Direct stablecoin distribution, no VBK tokens
     */
    function distributePropertyIncome(uint256 propertyId) external payable onlyOwner nonReentrant {
        Property storage property = properties[propertyId];
        require(property.id == propertyId, "Property does not exist");
        require(property.status == PropertyStatus.Operational, "Property not operational");
        require(msg.value > 0, "Income must be positive");

        uint256[] memory tokenIds = propertyToTokenIds[propertyId];
        require(tokenIds.length > 0, "No shareholders found");

        // Calculate platform fee
        uint256 platformFee = (msg.value * platformFeePercentage) / 100;
        uint256 distributionAmount = msg.value - platformFee;
        uint256 incomePerShare = distributionAmount / tokenIds.length;
        
        // Distribute income to each NFT holder
        for (uint256 i = 0; i < tokenIds.length; i++) {
            address shareOwner = ownerOf(tokenIds[i]);
            
            // Update tracking
            propertyShares[tokenIds[i]].totalIncomeReceived += incomePerShare;
            propertyShares[tokenIds[i]].lastIncomeCollection = block.timestamp;
            totalUserIncome[shareOwner] += incomePerShare;
            
            // Send payment
            payable(shareOwner).transfer(incomePerShare);
        }

        // Send platform fee to treasury
        if (platformFee > 0) {
            payable(treasuryWallet).transfer(platformFee);
        }

        // Update property tracking
        property.lastIncomeDistribution = block.timestamp;
        property.totalIncomeDistributed += distributionAmount;
        propertyRevenue[propertyId] += msg.value;
        
        emit IncomeDistributed(propertyId, msg.value, platformFee, block.timestamp);
    }

    /**
     * @dev Add vacation utility to a property (Thailand villa, etc.)
     */
    function addVacationUtility(
        uint256 propertyId,
        uint256 freeWeeksPerYear,
        uint256 discountPercentage,
        uint256 maxBookingsPerYear
    ) external onlyOwner {
        require(properties[propertyId].id == propertyId, "Property does not exist");
        require(freeWeeksPerYear > 0 && freeWeeksPerYear <= 52, "Invalid free weeks");
        require(discountPercentage <= 100, "Invalid discount percentage");

        vacationUtilities[propertyId] = VacationUtility({
            propertyId: propertyId,
            freeWeeksPerYear: freeWeeksPerYear,
            discountPercentage: discountPercentage,
            hasVacationRights: true,
            maxBookingsPerYear: maxBookingsPerYear
        });

        emit VacationUtilityAdded(propertyId, freeWeeksPerYear, discountPercentage);
    }

    /**
     * @dev Get comprehensive property information
     */
    function getProperty(uint256 propertyId) external view returns (
        Property memory property,
        VacationUtility memory vacation,
        uint256 totalRevenue,
        uint256 averageIncome
    ) {
        require(properties[propertyId].id == propertyId, "Property does not exist");
        
        property = properties[propertyId];
        vacation = vacationUtilities[propertyId];
        totalRevenue = propertyRevenue[propertyId];
        
        if (property.totalIncomeDistributed > 0 && propertyToTokenIds[propertyId].length > 0) {
            averageIncome = property.totalIncomeDistributed / propertyToTokenIds[propertyId].length;
        }
    }

    /**
     * @dev Get user's complete portfolio
     */
    function getUserPortfolio(address user) external view returns (
        uint256[] memory tokenIds,
        uint256[] memory propertyIds,
        uint256 totalIncome,
        uint256 totalNFTs
    ) {
        tokenIds = ownerToTokenIds[user];
        totalNFTs = tokenIds.length;
        totalIncome = totalUserIncome[user];
        
        propertyIds = new uint256[](totalNFTs);
        for (uint256 i = 0; i < totalNFTs; i++) {
            propertyIds[i] = propertyShares[tokenIds[i]].propertyId;
        }
    }

    /**
     * @dev Platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 totalProperties,
        uint256 totalNFTs,
        uint256 totalValueLocked,
        uint256 totalIncomeDistributed
    ) {
        totalProperties = _propertyIdCounter.current();
        totalNFTs = totalSupply();
        
        uint256 totalValue = 0;
        uint256 totalIncome = 0;
        
        for (uint256 i = 0; i < totalProperties; i++) {
            if (properties[i].status != PropertyStatus.Sold) {
                totalValue += properties[i].totalValue;
                totalIncome += properties[i].totalIncomeDistributed;
            }
        }
        
        totalValueLocked = totalValue;
        totalIncomeDistributed = totalIncome;
    }

    // Admin functions
    function updatePropertyStatus(uint256 propertyId, PropertyStatus newStatus) external onlyOwner {
        require(properties[propertyId].id == propertyId, "Property does not exist");
        properties[propertyId].status = newStatus;
        emit PropertyStatusChanged(propertyId, newStatus);
    }

    function updatePlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 20, "Fee too high"); // Max 20%
        platformFeePercentage = newFeePercentage;
    }

    function updateTreasuryWallet(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasuryWallet = newTreasury;
    }

    // Required overrides for multiple inheritance
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Update ownership tracking
        if (from != address(0) && to != address(0)) {
            // Remove from old owner
            uint256[] storage fromTokens = ownerToTokenIds[from];
            for (uint256 i = 0; i < fromTokens.length; i++) {
                if (fromTokens[i] == tokenId) {
                    fromTokens[i] = fromTokens[fromTokens.length - 1];
                    fromTokens.pop();
                    break;
                }
            }
            
            // Add to new owner
            ownerToTokenIds[to].push(tokenId);
            propertyShares[tokenId].owner = to;
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
        require(paused(), "Contract must be paused");
        payable(owner()).transfer(address(this).balance);
    }

    // Prevent accidental ETH sends
    receive() external payable {
        revert("Use purchasePropertyShare() to buy NFTs");
    }
}
