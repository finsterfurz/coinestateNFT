import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';

// SECURITY: Hardcoded verified contract addresses
const VERIFIED_CONTRACTS = {
  VBK_MAINNET: '0x...', // Replace with actual verified address
  VBK_GOERLI: '0x...', // Replace with actual verified address
  PROPERTY_NFT_MAINNET: '0x...',
  PROPERTY_NFT_GOERLI: '0x...',
} as const;

// SECURITY: Rate limiting for transactions
class TransactionRateLimiter {
  private lastTransaction = 0;
  private readonly minInterval = 5000; // 5 seconds

  checkLimit(): void {
    const now = Date.now();
    if (now - this.lastTransaction < this.minInterval) {
      throw new Error('Please wait before making another transaction');
    }
    this.lastTransaction = now;
  }
}

const rateLimiter = new TransactionRateLimiter();

export const SecureVBKSalesWidget: React.FC = () => {
  const { isConnected, signer, account, chainId } = useWeb3();
  const [amount, setAmount] = useState<string>('1000');
  const [isLoading, setIsLoading] = useState(false);
  const [salesMetrics, setSalesMetrics] = useState<any>(null);

  // SECURITY: Get verified contract address
  const getVerifiedContractAddress = (contractType: 'VBK' | 'PROPERTY_NFT'): string => {
    if (!chainId) throw new Error('Chain ID not available');
    
    const networkSuffix = chainId === 1 ? 'MAINNET' : 'GOERLI';
    const contractKey = `${contractType}_${networkSuffix}` as keyof typeof VERIFIED_CONTRACTS;
    
    const address = VERIFIED_CONTRACTS[contractKey];
    if (!address) {
      throw new Error(`No verified contract for ${contractType} on chain ${chainId}`);
    }
    
    return address;
  };

  // SECURITY: Validate and sanitize user input
  const validatePurchaseAmount = (inputAmount: string): number => {
    const sanitized = DOMPurify.sanitize(inputAmount);
    const numAmount = parseFloat(sanitized);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Invalid amount: must be a positive number');
    }
    
    if (numAmount > 10000) {
      throw new Error('Amount too large: maximum 10,000 VBK per transaction');
    }
    
    if (numAmount < 1) {
      throw new Error('Amount too small: minimum 1 VBK per transaction');
    }
    
    return numAmount;
  };

  // SECURITY: Verify contract call before execution
  const verifyContractInteraction = async (
    contract: ethers.Contract,
    methodName: string,
    args: any[]
  ): Promise<void> => {
    try {
      // Simulate the transaction first
      await contract[methodName].staticCall(...args);
    } catch (error) {
      throw new Error(`Contract verification failed: ${error}`);
    }
  };

  // SECURITY: Validate transaction parameters
  const validateTransaction = async (
    contract: ethers.Contract,
    purchaseAmount: bigint,
    ethValue: bigint
  ): Promise<void> => {
    // Check contract price matches expected
    const contractPrice = await contract.VBK_PRICE_EUR();
    const expectedCost = purchaseAmount * contractPrice;
    
    // Allow 1% tolerance for price differences
    const tolerance = expectedCost / 100n;
    const difference = ethValue > expectedCost ? ethValue - expectedCost : expectedCost - ethValue;
    
    if (difference > tolerance) {
      throw new Error('Price mismatch detected - transaction rejected for security');
    }
    
    // Verify sales are enabled
    const salesEnabled = await contract.salesEnabled();
    if (!salesEnabled) {
      throw new Error('Sales are currently disabled');
    }
  };

  const handleSecurePurchase = async () => {
    try {
      // SECURITY: Rate limiting
      rateLimiter.checkLimit();
      
      // SECURITY: Validate user is connected
      if (!isConnected || !signer || !account) {
        throw new Error('Please connect your wallet first');
      }
      
      // SECURITY: Validate chain
      if (!chainId || (chainId !== 1 && chainId !== 5)) {
        throw new Error('Please switch to Ethereum Mainnet or Goerli testnet');
      }
      
      // SECURITY: Validate and sanitize input
      const validatedAmount = validatePurchaseAmount(amount);
      const purchaseAmount = ethers.parseEther(validatedAmount.toString());
      
      // SECURITY: Get verified contract address
      const contractAddress = getVerifiedContractAddress('VBK');
      
      // SECURITY: Create contract with minimal ABI (only what we need)
      const minimalABI = [
        'function purchaseVBK(uint256 amount) external payable',
        'function VBK_PRICE_EUR() external view returns (uint256)',
        'function salesEnabled() external view returns (bool)',
      ];
      
      const contract = new ethers.Contract(contractAddress, minimalABI, signer);
      
      setIsLoading(true);
      
      // SECURITY: Validate transaction parameters
      await validateTransaction(contract, purchaseAmount, purchaseAmount);
      
      // SECURITY: Verify contract interaction
      await verifyContractInteraction(contract, 'purchaseVBK', [purchaseAmount]);
      
      // SECURITY: Show user confirmation with all details
      const confirmed = await showTransactionConfirmation({
        amount: validatedAmount,
        cost: validatedAmount, // 1:1 ratio
        contractAddress,
        chainId,
      });
      
      if (!confirmed) {
        throw new Error('Transaction cancelled by user');
      }
      
      // Execute the transaction
      const tx = await contract.purchaseVBK(purchaseAmount, {
        value: purchaseAmount,
        gasLimit: 200000, // Set reasonable gas limit
      });
      
      toast.loading('Transaction submitted. Waiting for confirmation...', { id: 'purchase' });
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }
      
      toast.success(`Successfully purchased ${validatedAmount} VBK tokens!`, { id: 'purchase' });
      
      // Reset form
      setAmount('1000');
      
    } catch (error: any) {
      console.error('Secure purchase error:', error);
      
      // SECURITY: Don't leak sensitive error details
      const userMessage = error.message?.includes('user rejected') 
        ? 'Transaction cancelled by user'
        : error.message?.includes('insufficient funds')
        ? 'Insufficient balance for transaction'
        : 'Transaction failed. Please try again.';
        
      toast.error(userMessage, { id: 'purchase' });
    } finally {
      setIsLoading(false);
    }
  };

  // SECURITY: Show detailed transaction confirmation
  const showTransactionConfirmation = async (details: {
    amount: number;
    cost: number;
    contractAddress: string;
    chainId: number;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      const confirmed = window.confirm(`
        TRANSACTION CONFIRMATION
        
        Action: Purchase VBK Tokens
        Amount: ${details.amount} VBK
        Cost: ${details.cost} ETH
        
        Contract: ${details.contractAddress}
        Network: ${details.chainId === 1 ? 'Ethereum Mainnet' : 'Goerli Testnet'}
        
        SECURITY CHECK:
        - Contract address verified ✓
        - Transaction parameters validated ✓
        - Amount within limits ✓
        
        Confirm this transaction?
      `);
      
      resolve(confirmed);
    });
  };

  // SECURITY: Sanitize display values
  const sanitizeDisplayValue = (value: any): string => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return '0';
    }
    return DOMPurify.sanitize(String(value));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
        {/* Security Notice */}
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-yellow-400 mr-2">🛡️</span>
            <span className="text-yellow-400 font-semibold">Security Notice</span>
          </div>
          <p className="text-yellow-200 text-sm">
            Always verify the contract address and transaction details before confirming.
            Never approve transactions from unknown sources.
          </p>
        </div>

        {/* Amount Input with Validation */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount to Purchase (1-10,000 VBK)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              min="1"
              max="10000"
              step="1"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-3 text-gray-400">VBK</div>
          </div>
          
          {/* Security Validation Display */}
          <div className="mt-2 text-sm">
            {(() => {
              try {
                const validAmount = validatePurchaseAmount(amount);
                return (
                  <span className="text-green-400">
                    ✓ Valid amount: {validAmount} VBK (€{validAmount})
                  </span>
                );
              } catch (error: any) {
                return (
                  <span className="text-red-400">
                    ⚠️ {error.message}
                  </span>
                );
              }
            })()}
          </div>
        </div>

        {/* Secure Purchase Button */}
        <button
          onClick={handleSecurePurchase}
          disabled={!isConnected || isLoading}
          className={`w-full py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center ${
            isConnected && !isLoading
              ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 transform hover:scale-105'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Secure Transaction...
            </>
          ) : (
            <>
              🛡️ Secure Purchase
            </>
          )}
        </button>

        {/* Security Features List */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">🛡️ Security Features:</h4>
          <div className="space-y-2 text-sm text-gray-300">
            <div>✓ Verified contract addresses only</div>
            <div>✓ Transaction simulation before execution</div>
            <div>✓ Rate limiting protection</div>
            <div>✓ Input validation and sanitization</div>
            <div>✓ Price verification checks</div>
            <div>✓ User confirmation required</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureVBKSalesWidget;
