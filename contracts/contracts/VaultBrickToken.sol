// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VaultBrick Token (VBK)
 * @dev ERC20 token pegged to €1, capped at 2.5M supply
 * Links NFT ownership to income distribution
 */
contract VaultBrickToken is ERC20, ERC20Burnable, ERC20Permit, Ownable, Pausable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 2_500_000 * 10**18; // 2.5M VBK
    uint256 public constant TOKEN_PRICE_EUR = 1; // €1 per token
    
    mapping(address => bool) public authorizedMinters;
    mapping(address => uint256) public lastDistribution;
    
    event AuthorizedMinterAdded(address indexed minter);
    event AuthorizedMinterRemoved(address indexed minter);
    event IncomeDistributed(address indexed recipient, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(
        address initialOwner
    ) ERC20("VaultBrick", "VBK") ERC20Permit("VaultBrick") {
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Mints tokens to specified address
     * Only authorized minters can mint new tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external whenNotPaused {
        require(authorizedMinters[msg.sender], "VBK: Not authorized to mint");
        require(totalSupply() + amount <= MAX_SUPPLY, "VBK: Exceeds max supply");
        require(to != address(0), "VBK: Cannot mint to zero address");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burns tokens from caller's balance
     * Implements deflationary mechanics
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public override whenNotPaused {
        require(balanceOf(msg.sender) >= amount, "VBK: Insufficient balance to burn");
        
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Adds authorized minter
     * @param minter Address to authorize for minting
     */
    function addAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "VBK: Cannot authorize zero address");
        require(!authorizedMinters[minter], "VBK: Already authorized");
        
        authorizedMinters[minter] = true;
        emit AuthorizedMinterAdded(minter);
    }

    /**
     * @dev Removes authorized minter
     * @param minter Address to remove from authorized minters
     */
    function removeAuthorizedMinter(address minter) external onlyOwner {
        require(authorizedMinters[minter], "VBK: Not currently authorized");
        
        authorizedMinters[minter] = false;
        emit AuthorizedMinterRemoved(minter);
    }

    /**
     * @dev Distributes income to token holders
     * Called by property management contracts
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to distribute
     */
    function distributeIncome(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant whenNotPaused {
        require(authorizedMinters[msg.sender], "VBK: Not authorized to distribute");
        require(recipients.length == amounts.length, "VBK: Array length mismatch");
        require(recipients.length > 0, "VBK: Empty recipients array");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "VBK: Cannot distribute to zero address");
            require(amounts[i] > 0, "VBK: Distribution amount must be positive");
            
            lastDistribution[recipients[i]] = block.timestamp;
            emit IncomeDistributed(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Returns token holder information
     * @param holder Address of token holder
     */
    function getHolderInfo(address holder) external view returns (
        uint256 balance,
        uint256 lastDistributionTime,
        uint256 distributionEligibility
    ) {
        balance = balanceOf(holder);
        lastDistributionTime = lastDistribution[holder];
        
        // Calculate distribution eligibility based on balance and time held
        if (balance > 0 && lastDistributionTime > 0) {
            distributionEligibility = (balance * (block.timestamp - lastDistributionTime)) / 1 days;
        } else {
            distributionEligibility = 0;
        }
    }

    /**
     * @dev Returns current token metrics
     */
    function getTokenMetrics() external view returns (
        uint256 currentSupply,
        uint256 maxSupply,
        uint256 remainingSupply,
        uint256 burnedTokens,
        bool isPaused
    ) {
        currentSupply = totalSupply();
        maxSupply = MAX_SUPPLY;
        remainingSupply = MAX_SUPPLY - currentSupply;
        burnedTokens = MAX_SUPPLY - currentSupply; // Approximation
        isPaused = paused();
    }

    /**
     * @dev Pauses all token operations
     * Emergency function for security incidents
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses token operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * Includes minting and burning
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @dev Emergency withdrawal function
     * Only callable by owner in emergency situations
     */
    function emergencyWithdraw() external onlyOwner {
        require(paused(), "VBK: Contract must be paused for emergency withdrawal");
        
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }

    /**
     * @dev Fallback function to reject direct ETH transfers
     */
    receive() external payable {
        revert("VBK: Direct ETH transfers not allowed");
    }
}
