// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VaultBrick Token - Phase 1: Direct Sales
 * @dev Optimized for direct VBK sales on homepage with automated monthly distributions
 */
contract VaultBrickSales is Initializable,
    ERC20CappedUpgradeable,
    ERC20BurnableUpgradeable,
    ERC20SnapshotUpgradeable,
    Ownable2StepUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable {

    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant CLAIM_EXPIRATION_TIME = 180 days;
    uint256 public constant MINIMUM_DISTRIBUTION_AMOUNT = 1_000 ether;
    uint256 public constant MINIMUM_USER_BALANCE = 1 ether;
    uint256 public constant VBK_PRICE_EUR = 1 ether; // €1.00 per VBK
    
    // Configuration
    uint256 public deployedAt;
    address public coinEstateWallet;
    address public treasuryWallet;
    IERC20 public stableToken;
    uint8 public platformFeeRate; // Platform operations fee
    uint8 public maintenanceReserveRate; // "Puffer" - property maintenance reserve
    uint256 public lastDistributionTimestamp;
    uint256 public nextDistributionDate; // 15th of each month
    
    // Maintenance Reserve ("Puffer") System
    uint256 public maintenanceReserve; // Accumulated funds for property maintenance
    uint256 public totalMaintenanceSpent; // Track total maintenance expenditures
    
    // Sales tracking
    uint256 public totalSold;
    uint256 public totalRevenue;
    bool public salesEnabled;
    
    // Distribution system
    struct Distribution {
        uint256 timestamp;
        uint256 snapshotId;
        uint256 total;
        uint256 toPlatform;
        uint256 toMaintenance; // Amount allocated to maintenance reserve
        uint256 toHolders;
        uint256 claimedTotal;
        bool swept;
    }

    mapping(uint256 => Distribution) public distributions;
    uint256 public distributionCount;
    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    // Events
    event VBKPurchased(address indexed buyer, uint256 amount, uint256 price);
    event DistributionRecorded(uint256 indexed id, uint256 total, uint256 toPlatform, uint256 toMaintenance, uint256 toHolders);
    event Claim(address indexed user, uint256 indexed distributionId, uint256 amount);
    event SweepUnclaimed(uint256 indexed distributionId, uint256 amount);
    event SalesEnabled(bool enabled);
    event NextDistributionScheduled(uint256 timestamp);
    event MaintenanceWithdrawal(address indexed to, uint256 amount, string reason);
    event MaintenanceReserveUpdated(uint256 newAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _coinEstateWallet,
        address _treasuryWallet,
        address _stableToken
    ) public initializer {
        __ERC20_init("VaultBrick", "VBK");
        __ERC20Capped_init(2_500_000 * 10 ** decimals());
        __Ownable2Step_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __ERC20Snapshot_init();
        __UUPSUpgradeable_init();

        require(initialOwner != address(0), "Invalid owner");
        require(_coinEstateWallet != address(0), "Invalid wallet");
        require(_treasuryWallet != address(0), "Invalid treasury");
        require(_stableToken != address(0), "Invalid token");

        // Validate stable token
        string memory sym = IERC20Metadata(_stableToken).symbol();
        uint8 dec = IERC20Metadata(_stableToken).decimals();
        require(bytes(sym).length > 0, "Invalid token");
        require(dec >= 6 && dec <= 18, "Invalid decimals");
        
        _transferOwnership(initialOwner);
        
        coinEstateWallet = _coinEstateWallet;
        treasuryWallet = _treasuryWallet;
        stableToken = IERC20(_stableToken);
        
        deployedAt = block.timestamp;
        platformFeeRate = 10; // 10% platform fee (was 5%)
        maintenanceReserveRate = 10; // 10% maintenance reserve ("puffer")
        salesEnabled = true;
        
        // Pre-mint all tokens to treasury for sales
        _mint(_treasuryWallet, 2_500_000 * 10 ** decimals());
        
        // Schedule first distribution for next 15th
        _scheduleNextDistribution();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ SALES FUNCTIONS ============

    /**
     * @dev Purchase VBK tokens directly (for homepage integration)
     * @param amount Amount of VBK tokens to purchase
     */
    function purchaseVBK(uint256 amount) external payable nonReentrant whenNotPaused {
        require(salesEnabled, "Sales disabled");
        require(amount > 0, "Amount must be positive");
        require(amount <= balanceOf(treasuryWallet), "Insufficient treasury balance");
        
        uint256 cost = amount; // 1 VBK = €1 = 1 ETH equivalent for simplicity
        require(msg.value >= cost, "Insufficient payment");
        
        // Transfer VBK from treasury to buyer
        _transfer(treasuryWallet, msg.sender, amount);
        
        // Send payment to CoinEstate wallet
        payable(coinEstateWallet).transfer(cost);
        
        // Update metrics
        totalSold += amount;
        totalRevenue += cost;
        
        emit VBKPurchased(msg.sender, amount, cost);
        
        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    /**
     * @dev Purchase VBK with stable tokens (alternative payment method)
     */
    function purchaseVBKWithStable(uint256 amount) external nonReentrant whenNotPaused {
        require(salesEnabled, "Sales disabled");
        require(amount > 0, "Amount must be positive");
        require(amount <= balanceOf(treasuryWallet), "Insufficient treasury balance");
        
        uint256 cost = amount; // 1:1 ratio with stable token
        
        // Transfer stable token from buyer to CoinEstate wallet
        stableToken.safeTransferFrom(msg.sender, coinEstateWallet, cost);
        
        // Transfer VBK from treasury to buyer
        _transfer(treasuryWallet, msg.sender, amount);
        
        totalSold += amount;
        totalRevenue += cost;
        
        emit VBKPurchased(msg.sender, amount, cost);
    }

    /**
     * @dev Enable/disable VBK sales
     */
    function setSalesEnabled(bool _enabled) external onlyOwner {
        salesEnabled = _enabled;
        emit SalesEnabled(_enabled);
    }

    // ============ AUTOMATED DISTRIBUTION SYSTEM ============

    /**
     * @dev Automated monthly distribution (called on 15th of each month)
     * Allocates income: Platform Fee + Maintenance Reserve + Token Holders
     */
    function distributeMonthlyIncome() external onlyOwner nonReentrant whenNotPaused {
        require(block.timestamp >= nextDistributionDate, "Too early for distribution");
        
        uint256 amount = stableToken.balanceOf(address(this));
        require(amount >= MINIMUM_DISTRIBUTION_AMOUNT, "Amount too small");
        require(totalSupply() >= MINIMUM_USER_BALANCE, "Not enough supply");

        // Calculate allocations
        uint256 toPlatform = (amount * platformFeeRate) / 100;
        uint256 toMaintenance = (amount * maintenanceReserveRate) / 100;
        uint256 toHolders = amount - toPlatform - toMaintenance;

        // Send platform fee
        if (toPlatform > 0) {
            stableToken.safeTransfer(coinEstateWallet, toPlatform);
        }

        // Add to maintenance reserve (keep in contract)
        if (toMaintenance > 0) {
            maintenanceReserve += toMaintenance;
        }

        // Create snapshot for distribution
        uint256 snapshotId = _snapshot();
        lastDistributionTimestamp = block.timestamp;

        distributions[++distributionCount] = Distribution({
            timestamp: block.timestamp,
            snapshotId: snapshotId,
            total: amount,
            toPlatform: toPlatform,
            toMaintenance: toMaintenance,
            toHolders: toHolders,
            claimedTotal: 0,
            swept: false
        });

        emit DistributionRecorded(distributionCount, amount, toPlatform, toMaintenance, toHolders);
        emit MaintenanceReserveUpdated(maintenanceReserve);
        
        // Schedule next distribution
        _scheduleNextDistribution();
    }

    /**
     * @dev Schedule next distribution for 15th of next month
     */
    function _scheduleNextDistribution() internal {
        uint256 currentTime = block.timestamp;
        uint256 year = (currentTime / 365 days) + 1970;
        uint256 month = ((currentTime % 365 days) / 30 days) + 1;
        
        // Next month, 15th day
        if (month == 12) {
            year += 1;
            month = 1;
        } else {
            month += 1;
        }
        
        // Calculate timestamp for 15th of next month
        nextDistributionDate = currentTime + 30 days; // Simplified - in production use proper date calculation
        
        emit NextDistributionScheduled(nextDistributionDate);
    }

    /**
     * @dev Manual trigger for monthly distribution (backup)
     */
    function triggerEmergencyDistribution() external onlyOwner {
        require(block.timestamp >= lastDistributionTimestamp + 25 days, "Too soon");
        
        uint256 amount = stableToken.balanceOf(address(this));
        if (amount >= MINIMUM_DISTRIBUTION_AMOUNT) {
            // Force distribution even if not 15th
            nextDistributionDate = block.timestamp;
            distributeMonthlyIncome();
        }
    }

    // ============ CLAIMING SYSTEM ============

    /**
     * @dev Get claimable amounts for user
     */
    function getClaimableAmounts(address user, uint256[] calldata ids) 
        external 
        view 
        returns (uint256[] memory amounts) 
    {
        amounts = new uint256[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 distId = ids[i];
            if (_isClaimable(user, distId)) {
                Distribution memory dist = distributions[distId];
                uint256 userBalance = balanceOfAt(user, dist.snapshotId);
                uint256 supplyAt = totalSupplyAt(dist.snapshotId);
                if (supplyAt > 0) {
                    amounts[i] = (dist.toHolders * userBalance) / supplyAt;
                }
            }      
        }
    }

    /**
     * @dev Claim income from multiple distributions
     */
    function claimBatch(uint256[] calldata ids) external nonReentrant whenNotPaused {
        uint256 totalClaimable;
        uint256 currentBalance = stableToken.balanceOf(address(this));
        
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 distId = ids[i];
            if (distId == 0 || distId > distributionCount) continue;
            
            Distribution storage dist = distributions[distId];
            if (hasClaimed[msg.sender][distId] || 
                block.timestamp > dist.timestamp + CLAIM_EXPIRATION_TIME ||
                dist.swept) continue;
            
            uint256 userBalance = balanceOfAt(msg.sender, dist.snapshotId);
            if (userBalance < MINIMUM_USER_BALANCE) continue;
            
            uint256 supplyAt = totalSupplyAt(dist.snapshotId);
            if (supplyAt == 0) continue;
            
            uint256 share = (dist.toHolders * userBalance) / supplyAt;
            if (share == 0) continue;
            
            totalClaimable += share;
            hasClaimed[msg.sender][distId] = true;
            dist.claimedTotal += share;
            
            emit Claim(msg.sender, distId, share);
        }
        
        require(totalClaimable > 0, "Nothing to claim");
        require(totalClaimable <= currentBalance, "Insufficient contract balance");
        stableToken.safeTransfer(msg.sender, totalClaimable);
    }

    /**
     * @dev Get pending distribution IDs for user
     */
    function getPendingDistributionIds(address user) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](distributionCount);
        uint256 count;
        
        for (uint256 i = 1; i <= distributionCount; i++) {
            if (_isClaimable(user, i)) temp[count++] = i;
        }
        
        uint256[] memory ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) ids[i] = temp[i];
        
        return ids;
    }

    function _isClaimable(address user, uint256 distId) private view returns (bool) {
        Distribution memory dist = distributions[distId];
        if (dist.snapshotId == 0) return false;
        
        return 
            !hasClaimed[user][distId] &&
            block.timestamp <= dist.timestamp + CLAIM_EXPIRATION_TIME &&
            !dist.swept &&
            balanceOfAt(user, dist.snapshotId) >= MINIMUM_USER_BALANCE &&
            totalSupplyAt(dist.snapshotId) > 0;
    }

    // ============ MAINTENANCE RESERVE FUNCTIONS ============

    /**
     * @dev Withdraw from maintenance reserve for property repairs
     * @param amount Amount to withdraw
     * @param to Recipient address (contractor, repair service, etc.)
     * @param reason Description of maintenance work
     */
    function withdrawMaintenance(
        uint256 amount, 
        address to, 
        string calldata reason
    ) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(amount <= maintenanceReserve, "Insufficient maintenance funds");
        require(to != address(0), "Invalid recipient");
        require(bytes(reason).length > 0, "Reason required");
        
        maintenanceReserve -= amount;
        totalMaintenanceSpent += amount;
        
        stableToken.safeTransfer(to, amount);
        
        emit MaintenanceWithdrawal(to, amount, reason);
        emit MaintenanceReserveUpdated(maintenanceReserve);
    }

    /**
     * @dev Get maintenance reserve information
     */
    function getMaintenanceInfo() external view returns (
        uint256 currentReserve,
        uint256 totalSpent,
        uint8 reserveRate,
        uint256 availableForWithdrawal
    ) {
        return (
            maintenanceReserve,
            totalMaintenanceSpent,
            maintenanceReserveRate,
            maintenanceReserve // Same as current reserve since it's available
        );
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Set platform fee rate
     */
    function setPlatformFeeRate(uint8 _rate) external onlyOwner {
        require(_rate <= 20, "Max 20% fee");
        platformFeeRate = _rate;
    }

    /**
     * @dev Set maintenance reserve rate ("puffer" percentage)
     */
    function setMaintenanceReserveRate(uint8 _rate) external onlyOwner {
        require(_rate <= 25, "Max 25% reserve");
        maintenanceReserveRate = _rate;
    }

    /**
     * @dev Sweep unclaimed funds after expiration
     */
    function sweepUnclaimed(uint256 distributionId) external onlyOwner nonReentrant {
        require(distributionId > 0 && distributionId <= distributionCount, "Invalid ID");
        Distribution storage dist = distributions[distributionId];
        
        require(!dist.swept, "Already swept");
        require(block.timestamp > dist.timestamp + CLAIM_EXPIRATION_TIME, "Claim period active");
        
        uint256 unclaimed = dist.toHolders - dist.claimedTotal;
        require(unclaimed > 0, "Nothing to sweep");
        
        dist.swept = true;
        stableToken.safeTransfer(coinEstateWallet, unclaimed);
        emit SweepUnclaimed(distributionId, unclaimed);
    }

    /**
     * @dev Get comprehensive sales and reserve metrics
     */
    function getSalesMetrics() external view returns (
        uint256 _totalSold,
        uint256 _totalRevenue,
        uint256 _remainingTokens,
        uint256 _distributionCount,
        bool _salesEnabled
    ) {
        return (
            totalSold,
            totalRevenue,
            balanceOf(treasuryWallet),
            distributionCount,
            salesEnabled
        );
    }

    /**
     * @dev Get all contract metrics including maintenance reserve
     */
    function getAllMetrics() external view returns (
        uint256 _totalSold,
        uint256 _totalRevenue,
        uint256 _remainingTokens,
        uint256 _distributionCount,
        uint256 _maintenanceReserve,
        uint256 _totalMaintenanceSpent,
        uint8 _platformFeeRate,
        uint8 _maintenanceReserveRate,
        bool _salesEnabled
    ) {
        return (
            totalSold,
            totalRevenue,
            balanceOf(treasuryWallet),
            distributionCount,
            maintenanceReserve,
            totalMaintenanceSpent,
            platformFeeRate,
            maintenanceReserveRate,
            salesEnabled
        );
    }

    /**
     * @dev Emergency functions
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(stableToken), "Cannot recover stable token");
        require(tokenAddress != address(this), "Cannot recover VBK");
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }

    // ============ REQUIRED OVERRIDES ============

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20SnapshotUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}
