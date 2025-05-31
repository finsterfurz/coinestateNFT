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

contract VaultBrickUpgradeable is Initializable,
    ERC20CappedUpgradeable,
    ERC20BurnableUpgradeable,
    ERC20SnapshotUpgradeable,
    Ownable2StepUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable {

    using SafeERC20 for IERC20;

    uint256 private constant WAD = 1e18;
    uint256 public constant CLAIM_EXPIRATION_TIME = 180 days;
    uint256 public constant SNAPSHOT_COOLDOWN = 30 days;
    uint256 public constant MINIMUM_DISTRIBUTION_AMOUNT = 1_000 ether; 
    uint256 public constant MINIMUM_TOTAL_SUPPLY = 1_000 ether;
    uint256 public constant MINIMUM_USER_BALANCE = 1 ether;

    uint256 public deployedAt;
    address public coinEstateWallet;
    IERC20 public stableToken;
    uint8 public coinEstateRate;
    uint8 public pufferRate;
    uint256 public lastSnapshotTimestamp;
    bool public resetDone;

    // CoinEstate Integration
    mapping(address => bool) public authorizedMinters;
    
    struct Distribution {
        uint256 timestamp;
        uint256 snapshotId;
        uint256 total;
        uint256 toCoinEstate;
        uint256 toPuffer;
        uint256 toHolders;
        uint256 claimedTotal;
        bool swept;
    }

    mapping(uint256 => Distribution) public distributions;
    uint256 public distributionCount;
    mapping(address => mapping(uint256 => bool)) public hasClaimed;
    bool public distributionEnabled;

    event Claim(address indexed user, uint256 indexed distributionId, uint256 amount);
    event DistributionRecorded(uint256 indexed id, uint256 total, uint256 toCoinEstate, uint256 toPuffer, uint256 toHolders);
    event SweepUnclaimed(uint256 indexed distributionId, uint256 amount);
    event DistributionRatesUpdated(uint8 coinEstateRate, uint8 pufferRate);
    event StableTokenSet(address indexed token);
    event CoinEstateWalletSet(address indexed wallet);
    event DistributionEnabled(bool enabled);
    event AuthorizedMinterAdded(address indexed minter);
    event AuthorizedMinterRemoved(address indexed minter);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _coinEstateWallet,
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
        require(_stableToken != address(0), "Invalid token");

        string memory sym = IERC20Metadata(_stableToken).symbol();
        uint8 dec = IERC20Metadata(_stableToken).decimals();
        require(bytes(sym).length > 0, "Invalid token");
        require(dec >= 6 && dec <= 18, "Invalid decimals");
        
        _transferOwnership(initialOwner);
        
        coinEstateWallet = _coinEstateWallet;
        stableToken = IERC20(_stableToken);
        
        lastSnapshotTimestamp = block.timestamp;
        deployedAt = block.timestamp;
        
        coinEstateRate = 10;
        pufferRate = 10;
        distributionEnabled = true;

        emit StableTokenSet(_stableToken);
        emit CoinEstateWalletSet(_coinEstateWallet);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // CoinEstate Integration Functions
    function addAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid address");
        authorizedMinters[minter] = true;
        emit AuthorizedMinterAdded(minter);
    }

    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit AuthorizedMinterRemoved(minter);
    }

    function mint(address to, uint256 amount) external {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        require(totalSupply() + amount <= cap(), "Cap exceeded");
        _mint(to, amount);
    }

    function setCoinEstateWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        coinEstateWallet = _wallet;
        emit CoinEstateWalletSet(_wallet);
    }

    function resetStableToken(address _newToken) external onlyOwner {
        require(!resetDone, "Already reset");
        require(block.timestamp <= deployedAt + 1 days, "Reset window closed");
        require(_newToken != address(0), "Invalid token");
        
        string memory sym = IERC20Metadata(_newToken).symbol();
        uint8 dec = IERC20Metadata(_newToken).decimals();
        require(bytes(sym).length > 0, "Invalid token");
        require(dec >= 6 && dec <= 18, "Invalid decimals");

        stableToken = IERC20(_newToken);
        resetDone = true;
        emit StableTokenSet(_newToken);
    }

    function enableDistributions(bool _enabled) external onlyOwner {
        distributionEnabled = _enabled;
        emit DistributionEnabled(_enabled);
    }

    function setDistributionRates(uint8 _coinEstateRate, uint8 _pufferRate) external onlyOwner {
        require(_coinEstateRate + _pufferRate <= 20, "Max 20% total fees");
        coinEstateRate = _coinEstateRate;
        pufferRate = _pufferRate;
        emit DistributionRatesUpdated(_coinEstateRate, _pufferRate);
    }

    function distributeIncome() external onlyOwner nonReentrant whenNotPaused {
        require(distributionEnabled, "Distributions disabled");
        require(block.timestamp >= lastSnapshotTimestamp + SNAPSHOT_COOLDOWN, "Cooldown active");
        
        uint256 amount = stableToken.balanceOf(address(this));
        require(amount >= MINIMUM_DISTRIBUTION_AMOUNT, "Amount too small");
        require(totalSupply() >= MINIMUM_TOTAL_SUPPLY, "Not enough supply");

        uint256 toCoinEstate = (amount * coinEstateRate) / 100;
        uint256 toPuffer = (amount * pufferRate) / 100;
        uint256 toHolders = amount - toCoinEstate - toPuffer;

        if (toCoinEstate > 0) stableToken.safeTransfer(coinEstateWallet, toCoinEstate);
        if (toPuffer > 0) stableToken.safeTransfer(owner(), toPuffer);

        uint256 snapshotId = _snapshot();
        lastSnapshotTimestamp = block.timestamp;

        distributions[++distributionCount] = Distribution({
            timestamp: block.timestamp,
            snapshotId: snapshotId,
            total: amount,
            toCoinEstate: toCoinEstate,
            toPuffer: toPuffer,
            toHolders: toHolders,
            claimedTotal: 0,
            swept: false
        });

        emit DistributionRecorded(distributionCount, amount, toCoinEstate, toPuffer, toHolders);
    }

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

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(stableToken), "Cannot recover stable token");
        require(tokenAddress != address(this), "Cannot recover VBK");
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20SnapshotUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function getDistributions(uint256 fromId, uint256 toId) external view returns (Distribution[] memory) {
        require(fromId > 0 && toId >= fromId && toId <= distributionCount, "Invalid range");
        Distribution[] memory list = new Distribution[](toId - fromId + 1);
        for (uint256 i = fromId; i <= toId; i++) {
            list[i - fromId] = distributions[i];
        }
        return list;
    }

    // FIXED: Single definition of getClaimableAmounts
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
}
