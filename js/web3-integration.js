// Web3 Integration für CoinEstate Landing Page
import { ethers } from 'ethers';

class CoinEstateWeb3 {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.propertyNFTContract = null;
        this.vaultBrickContract = null;
        this.salesContract = null;
        this.isConnected = false;
        
        // Contract Addresses (werden nach Deployment gesetzt)
        this.contractAddresses = {
            propertyNFT: process.env.PROPERTY_NFT_ADDRESS || '',
            vaultBrick: process.env.VAULT_BRICK_ADDRESS || '',
            sales: process.env.SALES_CONTRACT_ADDRESS || ''
        };
        
        this.init();
    }
    
    async init() {
        if (typeof window.ethereum !== 'undefined') {
            this.setupEventListeners();
            await this.checkConnection();
        } else {
            this.showWeb3Warning();
        }
    }
    
    async checkConnection() {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                await this.connectWallet();
            }
        } catch (error) {
            console.error('Connection check failed:', error);
        }
    }
    
    async connectWallet() {
        try {
            await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            
            const address = await this.signer.getAddress();
            const network = await this.provider.getNetwork();
            
            this.isConnected = true;
            this.updateUI(address, network);
            
            // Initialize contracts after connection
            await this.initializeContracts();
            
            return { address, network };
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }
    
    async initializeContracts() {
        // Contract ABIs (vereinfacht - sollten aus artifacts kommen)
        const propertyNFTABI = [
            "function mint(address to, uint256 amount) external",
            "function balanceOf(address owner) view returns (uint256)",
            "function totalSupply() view returns (uint256)",
            "function maxSupply() view returns (uint256)"
        ];
        
        const vaultBrickABI = [
            "function balanceOf(address account) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ];
        
        const salesABI = [
            "function buyNFTs(uint256 quantity) external payable",
            "function getNFTPrice() view returns (uint256)",
            "function getSalesStats() view returns (uint256, uint256, uint256)"
        ];
        
        try {
            if (this.contractAddresses.propertyNFT) {
                this.propertyNFTContract = new ethers.Contract(
                    this.contractAddresses.propertyNFT,
                    propertyNFTABI,
                    this.signer
                );
            }
            
            if (this.contractAddresses.vaultBrick) {
                this.vaultBrickContract = new ethers.Contract(
                    this.contractAddresses.vaultBrick,
                    vaultBrickABI,
                    this.signer
                );
            }
            
            if (this.contractAddresses.sales) {
                this.salesContract = new ethers.Contract(
                    this.contractAddresses.sales,
                    salesABI,
                    this.signer
                );
            }
            
            // Load real-time data
            await this.loadContractData();
            
        } catch (error) {
            console.error('Contract initialization failed:', error);
        }
    }
    
    async loadContractData() {
        try {
            if (this.propertyNFTContract) {
                const totalSupply = await this.propertyNFTContract.totalSupply();
                const maxSupply = await this.propertyNFTContract.maxSupply();
                
                this.updateNFTStats(totalSupply, maxSupply);
            }
            
            if (this.salesContract) {
                const [sold, available, raised] = await this.salesContract.getSalesStats();
                const price = await this.salesContract.getNFTPrice();
                
                this.updateSalesStats(sold, available, raised, price);
            }
            
        } catch (error) {
            console.error('Failed to load contract data:', error);
        }
    }
    
    async buyNFTs(quantity) {
        if (!this.salesContract) {
            throw new Error('Sales contract not initialized');
        }
        
        try {
            const price = await this.salesContract.getNFTPrice();
            const totalCost = price * BigInt(quantity);
            
            // Add loading state
            this.setLoading(true);
            
            const tx = await this.salesContract.buyNFTs(quantity, {
                value: totalCost
            });
            
            // Show transaction hash
            this.showTransactionProgress(tx.hash);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                this.showSuccess(`Successfully purchased ${quantity} NFTs!`);
                await this.loadContractData(); // Refresh data
            } else {
                throw new Error('Transaction failed');
            }
            
        } catch (error) {
            console.error('Purchase failed:', error);
            this.showError('Purchase failed: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }
    
    setupEventListeners() {
        // Account change handler
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                this.disconnect();
            } else {
                this.connectWallet();
            }
        });
        
        // Network change handler
        window.ethereum.on('chainChanged', (chainId) => {
            window.location.reload();
        });
    }
    
    updateUI(address, network) {
        // Update connection status
        const connectButton = document.getElementById('connectWallet');
        const walletInfo = document.getElementById('walletInfo');
        
        if (connectButton) {
            connectButton.textContent = 'Connected';
            connectButton.classList.add('connected');
            connectButton.onclick = () => this.disconnect();
        }
        
        if (walletInfo) {
            walletInfo.innerHTML = `
                <div class="wallet-address">
                    ${address.slice(0, 6)}...${address.slice(-4)}
                </div>
                <div class="network">${network.name}</div>
            `;
            walletInfo.style.display = 'block';
        }
        
        // Show purchase buttons
        this.togglePurchaseInterface(true);
    }
    
    updateNFTStats(totalSupply, maxSupply) {
        const availableElement = document.querySelector('.hero-stat-value:nth-child(3)');
        if (availableElement) {
            const available = Number(maxSupply) - Number(totalSupply);
            availableElement.textContent = available.toLocaleString();
        }
        
        // Update progress bar
        const progressBar = document.getElementById('salesProgress');
        if (progressBar) {
            const percentage = (Number(totalSupply) / Number(maxSupply)) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    updateSalesStats(sold, available, raised, price) {
        // Update hero stats with real data
        const priceInEUR = Number(ethers.formatEther(price));
        
        const elements = {
            sold: document.querySelector('[data-stat="sold"]'),
            available: document.querySelector('[data-stat="available"]'),
            raised: document.querySelector('[data-stat="raised"]'),
            price: document.querySelector('[data-stat="price"]')
        };
        
        if (elements.sold) elements.sold.textContent = Number(sold).toLocaleString();
        if (elements.available) elements.available.textContent = Number(available).toLocaleString();
        if (elements.raised) elements.raised.textContent = `€${Number(ethers.formatEther(raised)).toLocaleString()}`;
        if (elements.price) elements.price.textContent = `€${priceInEUR.toLocaleString()}`;
    }
    
    togglePurchaseInterface(show) {
        const purchaseSection = document.getElementById('purchaseInterface');
        if (purchaseSection) {
            purchaseSection.style.display = show ? 'block' : 'none';
        }
    }
    
    setLoading(isLoading) {
        const buttons = document.querySelectorAll('.purchase-button');
        buttons.forEach(button => {
            button.disabled = isLoading;
            button.textContent = isLoading ? 'Processing...' : 'Purchase NFTs';
        });
    }
    
    showTransactionProgress(hash) {
        const notification = this.createNotification(
            'Transaction submitted',
            `Hash: ${hash.slice(0, 10)}...`,
            'info'
        );
        
        // Add link to explorer
        const link = document.createElement('a');
        link.href = `https://etherscan.io/tx/${hash}`;
        link.target = '_blank';
        link.textContent = 'View on Etherscan';
        notification.appendChild(link);
    }
    
    showSuccess(message) {
        this.createNotification('Success', message, 'success');
    }
    
    showError(message) {
        this.createNotification('Error', message, 'error');
    }
    
    showWeb3Warning() {
        this.createNotification(
            'Web3 Required',
            'Please install MetaMask to invest in CoinEstate NFTs',
            'warning'
        );
    }
    
    createNotification(title, message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <h4>${title}</h4>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        return notification;
    }
    
    disconnect() {
        this.isConnected = false;
        this.provider = null;
        this.signer = null;
        
        const connectButton = document.getElementById('connectWallet');
        const walletInfo = document.getElementById('walletInfo');
        
        if (connectButton) {
            connectButton.textContent = 'Connect Wallet';
            connectButton.classList.remove('connected');
            connectButton.onclick = () => this.connectWallet();
        }
        
        if (walletInfo) {
            walletInfo.style.display = 'none';
        }
        
        this.togglePurchaseInterface(false);
    }
}

// CSS für Web3 Integration
const web3Styles = `
.wallet-info {
    display: none;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 1rem;
    margin-left: 1rem;
}

.wallet-address {
    font-weight: 600;
    color: var(--primary-100);
}

.network {
    font-size: 0.875rem;
    color: var(--primary-300);
}

.purchase-interface {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    padding: 3rem;
    margin: 3rem 0;
    text-align: center;
}

.quantity-selector {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin: 2rem 0;
}

.quantity-button {
    background: var(--primary-700);
    border: 1px solid var(--glass-border);
    color: var(--primary-100);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.quantity-button:hover {
    background: var(--blue-600);
}

.quantity-input {
    background: var(--primary-800);
    border: 1px solid var(--glass-border);
    color: var(--primary-100);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    width: 100px;
    text-align: center;
}

.purchase-button {
    background: linear-gradient(135deg, var(--blue-700), var(--blue-600));
    color: var(--primary-50);
    padding: 1.25rem 2.5rem;
    border: none;
    border-radius: 16px;
    font-weight: 700;
    font-size: 1.125rem;
    cursor: pointer;
    transition: all 0.3s ease;
    margin: 1rem;
}

.purchase-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
}

.purchase-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.notification {
    position: fixed;
    top: 100px;
    right: 20px;
    background: var(--primary-900);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    z-index: 1001;
    max-width: 300px;
    box-shadow: var(--shadow-xl);
}

.notification-success {
    border-color: var(--green-500);
}

.notification-error {
    border-color: var(--red-500);
}

.notification-warning {
    border-color: var(--yellow-500);
}

.notification-info {
    border-color: var(--blue-500);
}

.sales-progress {
    background: var(--primary-700);
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin: 1rem 0;
}

.sales-progress-bar {
    background: linear-gradient(90deg, var(--blue-500), var(--green-500));
    height: 100%;
    transition: width 0.5s ease;
}

.header-cta.connected {
    background: linear-gradient(135deg, var(--green-600), var(--green-500));
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = web3Styles;
document.head.appendChild(styleSheet);

// Initialize Web3 integration
window.addEventListener('DOMContentLoaded', () => {
    window.coinEstateWeb3 = new CoinEstateWeb3();
});

export default CoinEstateWeb3;