// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./VaultBrickToken.sol";

/**
 * @title PropertyNFT
 * @dev ERC721 NFT representing fractional ownership of real estate properties
 * Each NFT represents a €2,000 share in a property
 */
contract PropertyNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    struct Property {
        uint256 id;
        string propertyAddress;
        uint256 totalValue;
        uint256 totalShares;
        uint256 availableShares;
        uint256 pricePerShare;
        string ipfsHash;
        PropertyStatus status;
        uint256 createdAt;
        uint256 lastIncomeDistribution;
    }

    struct PropertyShare {
        uint256 propertyId;
        address owner;
        uint256 shareNumber;
        uint256 purchasePrice;
        uint256 purchaseDate;
        uint256 lastIncomeCollection;
    }

    enum PropertyStatus {
        Active,
        FundingComplete,
        Acquired,
        Operational,
        Sold
    }

    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _propertyIdCounter;

    VaultBrickToken public vaultBrickToken;
    
    uint256 public constant SHARE_PRICE = 2000 * 10**18; // €2,000 in wei equivalent
    uint256 public constant MAX_TOTAL_NFTS = 1000;
    
    mapping(uint256 => Property) public properties;
    mapping(uint256 => PropertyShare) public propertyShares;
    mapping(uint256 => uint256[]) public propertyToTokenIds;
    mapping(address => uint256[]) public ownerToTokenIds;
    
    event PropertyCreated(uint256 indexed propertyId, string propertyAddress, uint256 totalValue, uint256 totalShares);
    event PropertySharePurchased(uint256 indexed tokenId, uint256 indexed propertyId, address indexed buyer, uint256 shareNumber);
    event PropertyStatusChanged(uint256 indexed propertyId, PropertyStatus newStatus);
    event IncomeDistributed(uint256 indexed propertyId, uint256 totalAmount, uint256 timestamp);
    event PropertySold(uint256 indexed propertyId, uint256 salePrice, uint256 timestamp);

    constructor(
        address _vaultBrickToken,
        address initialOwner
    ) ERC721("CoinEstate Property", "CESTATE") {
        vaultBrickToken = VaultBrickToken(_vaultBrickToken);
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Creates a new property for fractional ownership
     * @param propertyAddress Physical address of the property
     * @param totalValue Total value of the property in EUR (wei equivalent)
     * @param totalShares Number of shares to divide property into
     * @param ipfsHash IPFS hash containing property metadata
     */
    function createProperty(
        string memory propertyAddress,
        uint256 totalValue,
        uint256 totalShares,
        string memory ipfsHash
    ) external onlyOwner whenNotPaused {
        require(bytes(propertyAddress).length > 0, "Property address cannot be empty");
        require(totalValue > 0, "Total value must be positive");
        require(totalShares > 0, "Total shares must be positive");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        uint256 propertyId = _propertyIdCounter.current();
        _propertyIdCounter.increment();

        properties[propertyId] = Property({
            id: propertyId,
            propertyAddress: propertyAddress,
            totalValue: totalValue,
            totalShares: totalShares,
            availableShares: totalShares,
            pricePerShare: SHARE_PRICE,
            ipfsHash: ipfsHash,
            status: PropertyStatus.Active,
            createdAt: block.timestamp,
            lastIncomeDistribution: 0
        });

        emit PropertyCreated(propertyId, propertyAddress, totalValue, totalShares);
    }

    /**
     * @dev Purchases a property share NFT
     * @param propertyId ID of the property to purchase share in
     */
    function purchasePropertyShare(uint256 propertyId) external payable nonReentrant whenNotPaused {
        Property storage property = properties[propertyId];
        require(property.id == propertyId, "Property does not exist");
        require(property.status == PropertyStatus.Active, "Property not available for purchase");
        require(property.availableShares > 0, "No shares available");
        require(totalSupply() < MAX_TOTAL_NFTS, "Maximum NFTs reached");

        // Check payment (in a real implementation, this would involve stablecoin transfer)
        require(msg.value >= SHARE_PRICE, "Insufficient payment");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        uint256 shareNumber = property.totalShares - property.availableShares + 1;
        
        propertyShares[tokenId] = PropertyShare({
            propertyId: propertyId,
            owner: msg.sender,
            shareNumber: shareNumber,
            purchasePrice: SHARE_PRICE,
            purchaseDate: block.timestamp,
            lastIncomeCollection: block.timestamp
        });

        property.availableShares--;
        propertyToTokenIds[propertyId].push(tokenId);
        ownerToTokenIds[msg.sender].push(tokenId);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, property.ipfsHash);

        // Mint corresponding VBK tokens
        vaultBrickToken.mint(msg.sender, SHARE_PRICE);

        emit PropertySharePurchased(tokenId, propertyId, msg.sender, shareNumber);

        // Check if funding is complete
        if (property.availableShares == 0) {
            property.status = PropertyStatus.FundingComplete;
            emit PropertyStatusChanged(propertyId, PropertyStatus.FundingComplete);
        }

        // Refund excess payment
        if (msg.value > SHARE_PRICE) {
            payable(msg.sender).transfer(msg.value - SHARE_PRICE);
        }
    }

    /**
     * @dev Updates property status
     * @param propertyId ID of the property
     * @param newStatus New status for the property
     */
    function updatePropertyStatus(uint256 propertyId, PropertyStatus newStatus) external onlyOwner {
        require(properties[propertyId].id == propertyId, "Property does not exist");
        
        properties[propertyId].status = newStatus;
        emit PropertyStatusChanged(propertyId, newStatus);
    }

    /**
     * @dev Distributes income from property to NFT holders
     * @param propertyId ID of the property generating income
     * @param totalIncome Total income to distribute
     */
    function distributePropertyIncome(uint256 propertyId, uint256 totalIncome) external onlyOwner nonReentrant {
        Property storage property = properties[propertyId];
        require(property.id == propertyId, "Property does not exist");
        require(property.status == PropertyStatus.Operational, "Property not operational");
        require(totalIncome > 0, "Income must be positive");

        uint256[] memory tokenIds = propertyToTokenIds[propertyId];
        require(tokenIds.length > 0, "No shareholders found");

        uint256 incomePerShare = totalIncome / tokenIds.length;
        
        address[] memory recipients = new address[](tokenIds.length);
        uint256[] memory amounts = new uint256[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            address shareOwner = ownerOf(tokenIds[i]);
            recipients[i] = shareOwner;
            amounts[i] = incomePerShare;
            
            propertyShares[tokenIds[i]].lastIncomeCollection = block.timestamp;
        }

        // Distribute income via VBK token contract
        vaultBrickToken.distributeIncome(recipients, amounts);

        property.lastIncomeDistribution = block.timestamp;
        emit IncomeDistributed(propertyId, totalIncome, block.timestamp);
    }

    /**
     * @dev Records property sale and distributes proceeds
     * @param propertyId ID of the sold property
     * @param salePrice Final sale price of the property
     */
    function recordPropertySale(uint256 propertyId, uint256 salePrice) external onlyOwner nonReentrant {
        Property storage property = properties[propertyId];
        require(property.id == propertyId, "Property does not exist");
        require(salePrice > 0, "Sale price must be positive");

        uint256[] memory tokenIds = propertyToTokenIds[propertyId];
        uint256 proceedsPerShare = salePrice / tokenIds.length;

        address[] memory recipients = new address[](tokenIds.length);
        uint256[] memory amounts = new uint256[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            address shareOwner = ownerOf(tokenIds[i]);
            recipients[i] = shareOwner;
            amounts[i] = proceedsPerShare;
        }

        // Distribute sale proceeds
        vaultBrickToken.distributeIncome(recipients, amounts);

        property.status = PropertyStatus.Sold;
        emit PropertySold(propertyId, salePrice, block.timestamp);
        emit PropertyStatusChanged(propertyId, PropertyStatus.Sold);
    }

    /**
     * @dev Returns property information
     * @param propertyId ID of the property
     */
    function getProperty(uint256 propertyId) external view returns (Property memory) {
        require(properties[propertyId].id == propertyId, "Property does not exist");
        return properties[propertyId];
    }

    /**
     * @dev Returns property share information
     * @param tokenId ID of the NFT token
     */
    function getPropertyShare(uint256 tokenId) external view returns (PropertyShare memory) {
        require(_exists(tokenId), "Token does not exist");
        return propertyShares[tokenId];
    }

    /**
     * @dev Returns all token IDs owned by an address
     * @param owner Address to query
     */
    function getOwnerTokenIds(address owner) external view returns (uint256[] memory) {
        return ownerToTokenIds[owner];
    }

    /**
     * @dev Returns all token IDs for a property
     * @param propertyId ID of the property
     */
    function getPropertyTokenIds(uint256 propertyId) external view returns (uint256[] memory) {
        return propertyToTokenIds[propertyId];
    }

    /**
     * @dev Returns platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 totalProperties,
        uint256 totalNFTs,
        uint256 totalValueLocked,
        uint256 activeProperties
    ) {
        totalProperties = _propertyIdCounter.current();
        totalNFTs = totalSupply();
        
        uint256 totalValue = 0;
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < totalProperties; i++) {
            if (properties[i].status == PropertyStatus.Active || 
                properties[i].status == PropertyStatus.Operational) {
                totalValue += properties[i].totalValue;
                activeCount++;
            }
        }
        
        totalValueLocked = totalValue;
        activeProperties = activeCount;
    }

    // Required overrides
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

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraw contract balance (emergency only)
     */
    function withdraw() external onlyOwner {
        require(paused(), "Contract must be paused for withdrawal");
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        payable(owner()).transfer(balance);
    }
}
