# CoinEstate Smart Contracts Architecture

## Overview
The CoinEstate platform utilizes a suite of smart contracts on Ethereum-compatible blockchains to manage property NFTs, income distributions, and governance.

## Contract Structure

### 1. PropertyNFT.sol
**Main NFT contract representing fractional property ownership**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PropertyNFT is ERC721, ERC721Enumerable, AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    
    Counters.Counter private _tokenIdCounter;
    
    struct Property {
        string propertyId;           // External property identifier
        string name;                 // Property name
        string location;             // Property location
        uint256 totalValue;          // Total property value in wei
        uint256 totalNFTs;           // Total NFTs for this property
        uint256 nftPrice;            // Price per NFT in wei
        uint256 purchaseDate;        // Property acquisition timestamp
        PropertyStatus status;       // Current property status
        string metadataURI;          // IPFS metadata URI
    }
    
    struct NFTInfo {
        uint256 propertyIndex;       // Index in properties array
        uint256 mintDate;            // NFT mint timestamp
        uint256 originalPrice;       // Original purchase price
    }
    
    enum PropertyStatus {
        Fundraising,    // 0: Accepting investments
        Acquired,       // 1: Property purchased
        Operational,    // 2: Generating rental income
        Disposed       // 3: Property sold
    }
    
    Property[] public properties;
    mapping(uint256 => NFTInfo) public nftInfo;
    mapping(string => uint256) public propertyIdToIndex;
    mapping(uint256 => uint256) public totalDistributionsPerNFT;
    
    event PropertyAdded(
        uint256 indexed propertyIndex,
        string propertyId,
        string name,
        uint256 totalValue,
        uint256 totalNFTs
    );
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 indexed propertyIndex,
        uint256 price
    );
    
    event PropertyStatusUpdated(
        uint256 indexed propertyIndex,
        PropertyStatus oldStatus,
        PropertyStatus newStatus
    );
    
    constructor() ERC721("CoinEstate Property NFT", "CEPROP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PROPERTY_MANAGER_ROLE, msg.sender);
    }
    
    function addProperty(
        string memory _propertyId,
        string memory _name,
        string memory _location,
        uint256 _totalValue,
        uint256 _totalNFTs,
        uint256 _nftPrice,
        string memory _metadataURI
    ) external onlyRole(PROPERTY_MANAGER_ROLE) {
        require(_totalNFTs > 0, "Total NFTs must be greater than 0");
        require(_nftPrice > 0, "NFT price must be greater than 0");
        require(_totalValue == _totalNFTs * _nftPrice, "Value calculation mismatch");
        
        uint256 propertyIndex = properties.length;
        
        properties.push(Property({
            propertyId: _propertyId,
            name: _name,
            location: _location,
            totalValue: _totalValue,
            totalNFTs: _totalNFTs,
            nftPrice: _nftPrice,
            purchaseDate: 0,
            status: PropertyStatus.Fundraising,
            metadataURI: _metadataURI
        }));
        
        propertyIdToIndex[_propertyId] = propertyIndex;
        
        emit PropertyAdded(propertyIndex, _propertyId, _name, _totalValue, _totalNFTs);
    }
    
    function mintNFT(
        address to,
        string memory propertyId,
        uint256 quantity
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        uint256 propertyIndex = propertyIdToIndex[propertyId];
        Property storage property = properties[propertyIndex];
        
        require(property.status == PropertyStatus.Fundraising, "Property not available for minting");
        require(quantity > 0, "Quantity must be greater than 0");
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            
            nftInfo[tokenId] = NFTInfo({
                propertyIndex: propertyIndex,
                mintDate: block.timestamp,
                originalPrice: property.nftPrice
            });
            
            _safeMint(to, tokenId);
            
            emit NFTMinted(tokenId, to, propertyIndex, property.nftPrice);
        }
    }
    
    function updatePropertyStatus(
        string memory propertyId,
        PropertyStatus newStatus
    ) external onlyRole(PROPERTY_MANAGER_ROLE) {
        uint256 propertyIndex = propertyIdToIndex[propertyId];
        Property storage property = properties[propertyIndex];
        
        PropertyStatus oldStatus = property.status;
        property.status = newStatus;
        
        if (newStatus == PropertyStatus.Acquired) {
            property.purchaseDate = block.timestamp;
        }
        
        emit PropertyStatusUpdated(propertyIndex, oldStatus, newStatus);
    }
    
    function getProperty(uint256 propertyIndex) external view returns (Property memory) {
        require(propertyIndex < properties.length, "Property does not exist");
        return properties[propertyIndex];
    }
    
    function getPropertyByID(string memory propertyId) external view returns (Property memory) {
        uint256 propertyIndex = propertyIdToIndex[propertyId];
        return properties[propertyIndex];
    }
    
    function getNFTInfo(uint256 tokenId) external view returns (NFTInfo memory) {
        require(_exists(tokenId), "NFT does not exist");
        return nftInfo[tokenId];
    }
    
    function getPropertiesCount() external view returns (uint256) {
        return properties.length;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "NFT does not exist");
        
        uint256 propertyIndex = nftInfo[tokenId].propertyIndex;
        Property memory property = properties[propertyIndex];
        
        return property.metadataURI;
    }
    
    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### 2. IncomeDistribution.sol
**Manages rental income distribution to NFT holders**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract IncomeDistribution is AccessControl, ReentrancyGuard {
    using SafeMath for uint256;

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    
    IERC721 public propertyNFT;
    IERC20 public paymentToken; // USDC
    
    struct Distribution {
        uint256 propertyIndex;
        uint256 totalAmount;
        uint256 amountPerNFT;
        uint256 distributionDate;
        uint256 claimDeadline;
        bool finalized;
        mapping(uint256 => bool) claimed;
    }
    
    struct PropertyDistributionInfo {
        uint256 totalDistributions;
        uint256 totalAmountDistributed;
        uint256 managementFeeRate; // Basis points (100 = 1%)
        address managementFeeRecipient;
    }
    
    mapping(uint256 => Distribution) public distributions;
    mapping(uint256 => PropertyDistributionInfo) public propertyDistributionInfo;
    
    uint256 public distributionCounter;
    uint256 public defaultClaimPeriod = 365 days; // 1 year to claim
    
    event DistributionCreated(
        uint256 indexed distributionId,
        uint256 indexed propertyIndex,
        uint256 totalAmount,
        uint256 amountPerNFT,
        uint256 claimDeadline
    );
    
    event DistributionClaimed(
        uint256 indexed distributionId,
        uint256 indexed tokenId,
        address indexed claimant,
        uint256 amount
    );
    
    event DistributionFinalized(
        uint256 indexed distributionId,
        uint256 totalClaimed,
        uint256 unclaimedAmount
    );
    
    constructor(
        address _propertyNFT,
        address _paymentToken
    ) {
        propertyNFT = IERC721(_propertyNFT);
        paymentToken = IERC20(_paymentToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
        _grantRole(PROPERTY_MANAGER_ROLE, msg.sender);
    }
    
    function setPropertyDistributionInfo(
        uint256 propertyIndex,
        uint256 managementFeeRate,
        address managementFeeRecipient
    ) external onlyRole(PROPERTY_MANAGER_ROLE) {
        require(managementFeeRate <= 1000, "Management fee too high"); // Max 10%
        require(managementFeeRecipient != address(0), "Invalid recipient");
        
        PropertyDistributionInfo storage info = propertyDistributionInfo[propertyIndex];
        info.managementFeeRate = managementFeeRate;
        info.managementFeeRecipient = managementFeeRecipient;
    }
    
    function createDistribution(
        uint256 propertyIndex,
        uint256 grossAmount,
        uint256 totalNFTsForProperty
    ) external onlyRole(DISTRIBUTOR_ROLE) nonReentrant {
        require(grossAmount > 0, "Amount must be greater than 0");
        require(totalNFTsForProperty > 0, "Invalid NFT count");
        
        PropertyDistributionInfo storage info = propertyDistributionInfo[propertyIndex];
        
        // Calculate management fee
        uint256 managementFee = grossAmount.mul(info.managementFeeRate).div(10000);
        uint256 netAmount = grossAmount.sub(managementFee);
        uint256 amountPerNFT = netAmount.div(totalNFTsForProperty);
        
        // Transfer gross amount from distributor
        require(
            paymentToken.transferFrom(msg.sender, address(this), grossAmount),
            "Transfer failed"
        );
        
        // Pay management fee
        if (managementFee > 0 && info.managementFeeRecipient != address(0)) {
            require(
                paymentToken.transfer(info.managementFeeRecipient, managementFee),
                "Management fee transfer failed"
            );
        }
        
        uint256 distributionId = distributionCounter++;
        Distribution storage distribution = distributions[distributionId];
        
        distribution.propertyIndex = propertyIndex;
        distribution.totalAmount = netAmount;
        distribution.amountPerNFT = amountPerNFT;
        distribution.distributionDate = block.timestamp;
        distribution.claimDeadline = block.timestamp.add(defaultClaimPeriod);
        distribution.finalized = false;
        
        info.totalDistributions++;
        info.totalAmountDistributed = info.totalAmountDistributed.add(netAmount);
        
        emit DistributionCreated(
            distributionId,
            propertyIndex,
            netAmount,
            amountPerNFT,
            distribution.claimDeadline
        );
    }
    
    function claimDistribution(
        uint256 distributionId,
        uint256[] calldata tokenIds
    ) external nonReentrant {
        Distribution storage distribution = distributions[distributionId];
        
        require(!distribution.finalized, "Distribution finalized");
        require(block.timestamp <= distribution.claimDeadline, "Claim period expired");
        
        uint256 totalClaimAmount = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            require(propertyNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
            require(!distribution.claimed[tokenId], "Already claimed for this token");
            
            // Verify token belongs to correct property
            // This would need to call the PropertyNFT contract to get property index
            // for the token
            
            distribution.claimed[tokenId] = true;
            totalClaimAmount = totalClaimAmount.add(distribution.amountPerNFT);
            
            emit DistributionClaimed(distributionId, tokenId, msg.sender, distribution.amountPerNFT);
        }
        
        require(totalClaimAmount > 0, "No valid claims");
        require(
            paymentToken.transfer(msg.sender, totalClaimAmount),
            "Claim transfer failed"
        );
    }
    
    function getClaimableAmount(
        uint256 distributionId,
        uint256[] calldata tokenIds
    ) external view returns (uint256 claimableAmount, uint256[] memory claimableTokens) {
        Distribution storage distribution = distributions[distributionId];
        
        if (distribution.finalized || block.timestamp > distribution.claimDeadline) {
            return (0, new uint256[](0));
        }
        
        uint256[] memory tempClaimableTokens = new uint256[](tokenIds.length);
        uint256 claimableCount = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            if (!distribution.claimed[tokenId] && 
                propertyNFT.ownerOf(tokenId) == msg.sender) {
                tempClaimableTokens[claimableCount] = tokenId;
                claimableCount++;
                claimableAmount = claimableAmount.add(distribution.amountPerNFT);
            }
        }
        
        // Resize array to actual size
        claimableTokens = new uint256[](claimableCount);
        for (uint256 i = 0; i < claimableCount; i++) {
            claimableTokens[i] = tempClaimableTokens[i];
        }
    }
    
    function finalizeDistribution(
        uint256 distributionId
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        Distribution storage distribution = distributions[distributionId];
        
        require(!distribution.finalized, "Already finalized");
        require(
            block.timestamp > distribution.claimDeadline,
            "Claim period not expired"
        );
        
        distribution.finalized = true;
        
        // Calculate unclaimed amount and return to treasury or management
        uint256 contractBalance = paymentToken.balanceOf(address(this));
        if (contractBalance > 0) {
            PropertyDistributionInfo storage info = propertyDistributionInfo[distribution.propertyIndex];
            if (info.managementFeeRecipient != address(0)) {
                paymentToken.transfer(info.managementFeeRecipient, contractBalance);
            }
        }
        
        emit DistributionFinalized(distributionId, 0, contractBalance);
    }
    
    function getDistribution(uint256 distributionId) external view returns (
        uint256 propertyIndex,
        uint256 totalAmount,
        uint256 amountPerNFT,
        uint256 distributionDate,
        uint256 claimDeadline,
        bool finalized
    ) {
        Distribution storage distribution = distributions[distributionId];
        return (
            distribution.propertyIndex,
            distribution.totalAmount,
            distribution.amountPerNFT,
            distribution.distributionDate,
            distribution.claimDeadline,
            distribution.finalized
        );
    }
    
    function isTokenClaimed(
        uint256 distributionId,
        uint256 tokenId
    ) external view returns (bool) {
        return distributions[distributionId].claimed[tokenId];
    }
}
```

### 3. PropertyGovernance.sol
**Governance contract for property-related decisions**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PropertyGovernance is AccessControl, ReentrancyGuard {
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    
    IERC721 public propertyNFT;
    
    enum ProposalType {
        PropertySale,           // 0: Sell the property
        MajorRenovation,       // 1: Major renovation/improvement
        ManagementChange,      // 2: Change property management
        FeeAdjustment,         // 3: Adjust management fees
        Other                  // 4: Other governance decisions
    }
    
    enum ProposalStatus {
        Active,                // 0: Voting in progress
        Passed,               // 1: Proposal passed
        Failed,               // 2: Proposal failed
        Executed              // 3: Proposal executed
    }
    
    struct Proposal {
        uint256 propertyIndex;
        ProposalType proposalType;
        string title;
        string description;
        uint256 proposalDate;
        uint256 votingDeadline;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 totalEligibleVotes;
        ProposalStatus status;
        mapping(uint256 => bool) hasVoted;
        mapping(uint256 => bool) voteChoice; // true = for, false = against
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCounter;
    
    uint256 public votingPeriod = 7 days;
    uint256 public quorumPercentage = 50; // 50% quorum required
    uint256 public passingThreshold = 50; // 50% of votes must be "for"
    
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed propertyIndex,
        ProposalType proposalType,
        string title,
        uint256 votingDeadline
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        uint256 indexed tokenId,
        address indexed voter,
        bool choice,
        uint256 weight
    );
    
    event ProposalStatusChanged(
        uint256 indexed proposalId,
        ProposalStatus oldStatus,
        ProposalStatus newStatus
    );
    
    constructor(address _propertyNFT) {
        propertyNFT = IERC721(_propertyNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPOSER_ROLE, msg.sender);
    }
    
    function createProposal(
        uint256 propertyIndex,
        ProposalType proposalType,
        string memory title,
        string memory description,
        uint256 totalNFTsForProperty
    ) external onlyRole(PROPOSER_ROLE) {
        uint256 proposalId = proposalCounter++;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.propertyIndex = propertyIndex;
        proposal.proposalType = proposalType;
        proposal.title = title;
        proposal.description = description;
        proposal.proposalDate = block.timestamp;
        proposal.votingDeadline = block.timestamp + votingPeriod;
        proposal.totalEligibleVotes = totalNFTsForProperty;
        proposal.status = ProposalStatus.Active;
        
        emit ProposalCreated(
            proposalId,
            propertyIndex,
            proposalType,
            title,
            proposal.votingDeadline
        );
    }
    
    function vote(
        uint256 proposalId,
        uint256[] calldata tokenIds,
        bool choice
    ) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= proposal.votingDeadline, "Voting period ended");
        
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            require(propertyNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
            require(!proposal.hasVoted[tokenId], "Token already voted");
            
            // Verify token belongs to correct property
            // This would need to call PropertyNFT to verify
            
            proposal.hasVoted[tokenId] = true;
            proposal.voteChoice[tokenId] = choice;
            totalWeight++;
            
            emit VoteCast(proposalId, tokenId, msg.sender, choice, 1);
        }
        
        if (choice) {
            proposal.votesFor += totalWeight;
        } else {
            proposal.votesAgainst += totalWeight;
        }
        
        // Check if proposal should be finalized
        _checkProposalStatus(proposalId);
    }
    
    function _checkProposalStatus(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.status != ProposalStatus.Active) return;
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 quorumRequired = (proposal.totalEligibleVotes * quorumPercentage) / 100;
        
        // Check if voting deadline passed or quorum reached
        if (block.timestamp > proposal.votingDeadline || totalVotes >= quorumRequired) {
            ProposalStatus oldStatus = proposal.status;
            
            if (totalVotes >= quorumRequired) {
                uint256 passingVotes = (totalVotes * passingThreshold) / 100;
                
                if (proposal.votesFor >= passingVotes) {
                    proposal.status = ProposalStatus.Passed;
                } else {
                    proposal.status = ProposalStatus.Failed;
                }
            } else {
                proposal.status = ProposalStatus.Failed;
            }
            
            emit ProposalStatusChanged(proposalId, oldStatus, proposal.status);
        }
    }
    
    function executeProposal(uint256 proposalId) external onlyRole(PROPOSER_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.Passed, "Proposal not passed");
        
        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.Executed;
        
        // Here you would implement the actual execution logic
        // based on the proposal type
        
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.Executed);
    }
    
    function getProposal(uint256 proposalId) external view returns (
        uint256 propertyIndex,
        ProposalType proposalType,
        string memory title,
        string memory description,
        uint256 proposalDate,
        uint256 votingDeadline,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 totalEligibleVotes,
        ProposalStatus status
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.propertyIndex,
            proposal.proposalType,
            proposal.title,
            proposal.description,
            proposal.proposalDate,
            proposal.votingDeadline,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.totalEligibleVotes,
            proposal.status
        );
    }
    
    function hasTokenVoted(uint256 proposalId, uint256 tokenId) external view returns (bool) {
        return proposals[proposalId].hasVoted[tokenId];
    }
    
    function getTokenVoteChoice(uint256 proposalId, uint256 tokenId) external view returns (bool) {
        require(proposals[proposalId].hasVoted[tokenId], "Token has not voted");
        return proposals[proposalId].voteChoice[tokenId];
    }
    
    function setVotingParameters(
        uint256 _votingPeriod,
        uint256 _quorumPercentage,
        uint256 _passingThreshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_quorumPercentage <= 100, "Invalid quorum percentage");
        require(_passingThreshold <= 100, "Invalid passing threshold");
        
        votingPeriod = _votingPeriod;
        quorumPercentage = _quorumPercentage;
        passingThreshold = _passingThreshold;
    }
}
```

## Deployment Strategy

### Network Selection
- **Mainnet**: Ethereum (high security, high gas costs)
- **L2 Solutions**: Polygon, Arbitrum, Optimism (lower costs, good security)
- **Testnet**: Goerli/Sepolia for testing

### Deployment Order
1. Deploy `PropertyNFT.sol`
2. Deploy `IncomeDistribution.sol` with PropertyNFT address
3. Deploy `PropertyGovernance.sol` with PropertyNFT address
4. Configure roles and permissions
5. Add initial property data

### Security Considerations

#### Access Control
- Multi-signature wallet for admin functions
- Time-locked execution for critical changes
- Role-based permissions for different operations

#### Upgradability
- Use OpenZeppelin's upgradeable contracts pattern
- Implement proper storage gap for future upgrades
- Proxy pattern for contract upgrades

#### Audit Requirements
- Full smart contract audit before mainnet deployment
- Bug bounty program for security testing
- Regular security reviews for updates

### Gas Optimization

#### Batch Operations
```solidity
function batchMintNFT(
    address[] calldata recipients,
    string memory propertyId,
    uint256[] calldata quantities
) external onlyRole(MINTER_ROLE) {
    require(recipients.length == quantities.length, "Array length mismatch");
    
    for (uint256 i = 0; i < recipients.length; i++) {
        mintNFT(recipients[i], propertyId, quantities[i]);
    }
}
```

#### Efficient Storage
- Pack struct variables to minimize storage slots
- Use events instead of storage for historical data
- Implement lazy evaluation where possible

### Integration Points

#### Frontend Integration
```javascript
// Web3 integration example
const propertyNFT = new web3.eth.Contract(PropertyNFT_ABI, PROPERTY_NFT_ADDRESS);
const incomeDistribution = new web3.eth.Contract(IncomeDistribution_ABI, INCOME_DISTRIBUTION_ADDRESS);

// Mint NFT
await propertyNFT.methods.mintNFT(userAddress, propertyId, quantity).send({
    from: adminAddress,
    gas: 500000
});

// Claim distribution
await incomeDistribution.methods.claimDistribution(distributionId, tokenIds).send({
    from: userAddress,
    gas: 300000
});
```

#### Backend Integration
- Event listening for automatic updates
- Transaction monitoring and confirmation
- Metadata management (IPFS integration)

### Metadata Structure (IPFS)

```json
{
  "name": "CoinEstate Property NFT #1001",
  "description": "Fractional ownership of Kamp-Lintfort Mixed-Use Building",
  "image": "ipfs://QmPropertyImage...",
  "attributes": [
    {
      "trait_type": "Property",
      "value": "Kamp-Lintfort Mixed-Use"
    },
    {
      "trait_type": "Location",
      "value": "Kamp-Lintfort, Germany"
    },
    {
      "trait_type": "Property Type",
      "value": "Mixed-Use"
    },
    {
      "trait_type": "Total Area",
      "value": "2,103 sqm"
    },
    {
      "trait_type": "Ownership Share",
      "value": "0.04%"
    },
    {
      "trait_type": "Purchase Date",
      "value": "2024-12-20"
    }
  ],
  "external_url": "https://coinestate.io/nft/1001",
  "property_details": {
    "property_id": "prop_kamp_lintfort_001",
    "total_value": 1795000,
    "nft_count": 2500,
    "expected_yield": 6.5,
    "management_fee": 2.0
  }
}
```

### Testing Strategy

#### Unit Tests
```javascript
// Example test with Hardhat
describe("PropertyNFT", function () {
  it("Should mint NFT with correct property info", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
    const propertyNFT = await PropertyNFT.deploy();
    
    await propertyNFT.addProperty(
      "prop_test_001",
      "Test Property",
      "Test Location",
      ethers.utils.parseEther("1000"),
      100,
      ethers.utils.parseEther("10"),
      "ipfs://test"
    );
    
    await propertyNFT.mintNFT(addr1.address, "prop_test_001", 1);
    
    expect(await propertyNFT.ownerOf(0)).to.equal(addr1.address);
  });
});
```

#### Integration Tests
- Test full investment flow
- Test distribution claiming
- Test governance voting
- Test emergency scenarios

### Monitoring & Analytics

#### Events to Monitor
- NFT minting and transfers
- Distribution creation and claims
- Governance proposal activity
- Contract upgrades and admin actions

#### Metrics Tracking
- Total value locked (TVL)
- Distribution efficiency
- Governance participation rates
- Gas costs and optimization opportunities

---

**Note**: These contracts are provided as architectural guidance. Before deployment, ensure thorough testing, security audits, and compliance with applicable regulations.
