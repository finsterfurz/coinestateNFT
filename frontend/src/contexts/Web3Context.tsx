import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  
  // Contract instances
  vbkContract: ethers.Contract | null;
  propertyNFTContract: ethers.Contract | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  
  // Data
  vbkBalance: string;
  nftCount: number;
  refreshData: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Contract ABIs (simplified - in production, import from compiled contracts)
const VBK_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function getTokenMetrics() view returns (uint256, uint256, uint256, uint256, bool)",
  "function getHolderInfo(address holder) view returns (uint256, uint256, uint256)"
];

const PROPERTY_NFT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function getOwnerTokenIds(address owner) view returns (uint256[])",
  "function getProperty(uint256 propertyId) view returns (tuple(uint256 id, string propertyAddress, uint256 totalValue, uint256 totalShares, uint256 availableShares, uint256 pricePerShare, string ipfsHash, uint8 status, uint256 createdAt, uint256 lastIncomeDistribution))",
  "function purchasePropertyShare(uint256 propertyId) payable",
  "function getPlatformStats() view returns (uint256, uint256, uint256, uint256)"
];

// SECURITY: Hardcoded verified contract addresses (replace with actual addresses)
const VERIFIED_CONTRACTS = {
  VBK_MAINNET: '0x0000000000000000000000000000000000000000', // TODO: Replace with actual mainnet address
  VBK_GOERLI: '0x0000000000000000000000000000000000000000',  // TODO: Replace with actual goerli address
  PROPERTY_NFT_MAINNET: '0x0000000000000000000000000000000000000000', // TODO: Replace with actual mainnet address
  PROPERTY_NFT_GOERLI: '0x0000000000000000000000000000000000000000',  // TODO: Replace with actual goerli address
} as const;

// SECURITY: Get verified contract address based on chain
const getVerifiedContractAddress = (contractType: 'VBK' | 'PROPERTY_NFT', chainId: number): string => {
  const networkSuffix = chainId === 1 ? 'MAINNET' : 'GOERLI';
  const contractKey = `${contractType}_${networkSuffix}` as keyof typeof VERIFIED_CONTRACTS;
  
  const address = VERIFIED_CONTRACTS[contractKey];
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract address not configured for ${contractType} on chain ${chainId}`);
  }
  
  return address;
};

const SUPPORTED_CHAIN_IDS = [1, 5]; // Mainnet and Goerli

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [vbkContract, setVbkContract] = useState<ethers.Contract | null>(null);
  const [propertyNFTContract, setPropertyNFTContract] = useState<ethers.Contract | null>(null);
  const [vbkBalance, setVbkBalance] = useState('0');
  const [nftCount, setNftCount] = useState(0);

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection();
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Initialize contracts when signer is available
  useEffect(() => {
    if (signer && VBK_CONTRACT_ADDRESS && PROPERTY_NFT_CONTRACT_ADDRESS) {
      initializeContracts();
    }
  }, [signer]);

  // Refresh data when contracts are available
  useEffect(() => {
    if (vbkContract && propertyNFTContract && account) {
      refreshData();
    }
  }, [vbkContract, propertyNFTContract, account]);

  const checkConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await connectWallet();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectWallet = async () => {
    // SECURITY: Verify MetaMask is the real extension
    if (!window.ethereum?.isMetaMask) {
      toast.error('Please install MetaMask wallet');
      return;
    }

    setIsConnecting(true);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      const currentChainId = Number(network.chainId);

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setChainId(currentChainId);
      setIsConnected(true);

      // SECURITY: Warn if on unsupported network
      if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
        toast.error(`Unsupported network. Please switch to Ethereum Mainnet or Goerli.`);
      } else {
        toast.success('Wallet connected successfully');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = async () => {
    await connectWallet();
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setVbkContract(null);
    setPropertyNFTContract(null);
    setVbkBalance('0');
    setNftCount(0);
    toast.success('Wallet disconnected');
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return;

    // SECURITY: Only allow switching to supported networks
    if (!SUPPORTED_CHAIN_IDS.includes(targetChainId)) {
      toast.error('Unsupported network');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        toast.error('Please add this network to MetaMask');
      } else {
        toast.error('Failed to switch network');
      }
    }
  };

  const initializeContracts = () => {
    if (!signer || !chainId) return;

    try {
      // SECURITY: Only initialize contracts for supported networks
      if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
        console.warn(`Unsupported network: ${chainId}`);
        return;
      }

      // SECURITY: Get verified contract addresses
      let vbkAddress: string;
      let propertyNFTAddress: string;
      
      try {
        vbkAddress = getVerifiedContractAddress('VBK', chainId);
        propertyNFTAddress = getVerifiedContractAddress('PROPERTY_NFT', chainId);
      } catch (error) {
        console.warn('Contracts not configured for this network:', error);
        return;
      }

      const vbk = new ethers.Contract(vbkAddress, VBK_ABI, signer);
      const propertyNFT = new ethers.Contract(propertyNFTAddress, PROPERTY_NFT_ABI, signer);

      setVbkContract(vbk);
      setPropertyNFTContract(propertyNFT);
    } catch (error) {
      console.error('Error initializing contracts:', error);
      toast.error('Failed to initialize contracts');
    }
  };

  const refreshData = async () => {
    if (!vbkContract || !propertyNFTContract || !account) return;

    try {
      // Get VBK balance
      const balance = await vbkContract.balanceOf(account);
      setVbkBalance(ethers.formatEther(balance));

      // Get NFT count
      const nftBalance = await propertyNFTContract.balanceOf(account);
      setNftCount(Number(nftBalance));
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = (chainId: string) => {
    setChainId(parseInt(chainId, 16));
    // Refresh the page to reset the app state
    window.location.reload();
  };

  const value: Web3ContextType = {
    isConnected,
    isConnecting,
    account,
    chainId,
    provider,
    signer,
    vbkContract,
    propertyNFTContract,
    connect,
    disconnect,
    switchNetwork,
    vbkBalance,
    nftCount,
    refreshData,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Utility function to format addresses
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Utility function to format token amounts
export const formatTokenAmount = (amount: string, decimals: number = 2): string => {
  const num = parseFloat(amount);
  if (num === 0) return '0';
  if (num < 0.01) return '<0.01';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};
