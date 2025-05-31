import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
  CurrencyEuroIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';

interface SalesMetrics {
  totalSold: string;
  totalRevenue: string;
  remainingTokens: string;
  distributionCount: number;
  salesEnabled: boolean;
}

interface AllMetrics {
  totalSold: string;
  totalRevenue: string;
  remainingTokens: string;
  distributionCount: number;
  maintenanceReserve: string;
  totalMaintenanceSpent: string;
  platformFeeRate: number;
  maintenanceReserveRate: number;
  salesEnabled: boolean;
}

export const VBKSalesWidget: React.FC = () => {
  const { isConnected, signer, account } = useWeb3();
  const [amount, setAmount] = useState<string>('1000');
  const [isLoading, setIsLoading] = useState(false);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);
  const [allMetrics, setAllMetrics] = useState<AllMetrics | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'USDC'>('ETH');
  const [userVBKBalance, setUserVBKBalance] = useState<string>('0');

  // Contract address (set from environment)
  const VBK_SALES_CONTRACT = process.env.REACT_APP_VBK_SALES_CONTRACT;

  // Contract ABI (updated with maintenance reserve functions)
  const VBK_SALES_ABI = [
    "function purchaseVBK(uint256 amount) external payable",
    "function purchaseVBKWithStable(uint256 amount) external",
    "function getSalesMetrics() external view returns (uint256, uint256, uint256, uint256, bool)",
    "function getAllMetrics() external view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint8, uint8, bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function VBK_PRICE_EUR() external view returns (uint256)",
    "function getMaintenanceInfo() external view returns (uint256, uint256, uint8, uint256)",
  ];

  useEffect(() => {
    if (isConnected && signer) {
      loadSalesData();
      loadAllMetrics();
      loadUserBalance();
    }
  }, [isConnected, signer, account]);

  const loadSalesData = async () => {
    try {
      if (!signer || !VBK_SALES_CONTRACT) return;

      const contract = new ethers.Contract(VBK_SALES_CONTRACT, VBK_SALES_ABI, signer);
      const metrics = await contract.getSalesMetrics();
      
      setSalesMetrics({
        totalSold: ethers.formatEther(metrics[0]),
        totalRevenue: ethers.formatEther(metrics[1]),
        remainingTokens: ethers.formatEther(metrics[2]),
        distributionCount: Number(metrics[3]),
        salesEnabled: metrics[4],
      });
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  };

  const loadAllMetrics = async () => {
    try {
      if (!signer || !VBK_SALES_CONTRACT) return;

      const contract = new ethers.Contract(VBK_SALES_CONTRACT, VBK_SALES_ABI, signer);
      const metrics = await contract.getAllMetrics();
      
      setAllMetrics({
        totalSold: ethers.formatEther(metrics[0]),
        totalRevenue: ethers.formatEther(metrics[1]),
        remainingTokens: ethers.formatEther(metrics[2]),
        distributionCount: Number(metrics[3]),
        maintenanceReserve: ethers.formatEther(metrics[4]),
        totalMaintenanceSpent: ethers.formatEther(metrics[5]),
        platformFeeRate: Number(metrics[6]),
        maintenanceReserveRate: Number(metrics[7]),
        salesEnabled: metrics[8],
      });
    } catch (error) {
      console.error('Error loading all metrics:', error);
    }
  };

  const loadUserBalance = async () => {
    try {
      if (!signer || !VBK_SALES_CONTRACT || !account) return;

      const contract = new ethers.Contract(VBK_SALES_CONTRACT, VBK_SALES_ABI, signer);
      const balance = await contract.balanceOf(account);
      setUserVBKBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error loading user balance:', error);
    }
  };

  const handlePurchase = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!signer || !VBK_SALES_CONTRACT) {
      toast.error('Contract not available');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);

    try {
      const contract = new ethers.Contract(VBK_SALES_CONTRACT, VBK_SALES_ABI, signer);
      const purchaseAmount = ethers.parseEther(amount);

      let tx;
      
      if (paymentMethod === 'ETH') {
        // Purchase with ETH
        tx = await contract.purchaseVBK(purchaseAmount, {
          value: purchaseAmount, // 1 ETH = 1 VBK for simplicity
        });
        
        toast.loading('Processing ETH payment...', { id: 'purchase' });
      } else {
        // Purchase with USDC (requires approval first)
        toast.loading('Processing USDC payment...', { id: 'purchase' });
        tx = await contract.purchaseVBKWithStable(purchaseAmount);
      }

      await tx.wait();

      toast.success(`Successfully purchased ${amount} VBK tokens!`, { id: 'purchase' });
      
      // Refresh data
      await loadSalesData();
      await loadAllMetrics();
      await loadUserBalance();
      
      // Reset form
      setAmount('1000');
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      const errorMessage = error.reason || error.message || 'Purchase failed';
      toast.error(errorMessage, { id: 'purchase' });
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePrice = () => {
    const amountNum = parseFloat(amount) || 0;
    return amountNum; // 1:1 ratio EUR
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          Buy VaultBrick (VBK) Tokens
        </h2>
        <p className="text-gray-400 text-lg">
          Secure your position in fractional real estate investment. €1 = 1 VBK
        </p>
      </div>

      {/* Sales Metrics */}
      {salesMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {parseFloat(salesMetrics.totalSold).toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">VBK Sold</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              €{parseFloat(salesMetrics.totalRevenue).toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Revenue Raised</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {parseFloat(salesMetrics.remainingTokens).toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Tokens Available</div>
          </div>
          {allMetrics && (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                €{parseFloat(allMetrics.maintenanceReserve).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Maintenance Fund</div>
            </div>
          )}
        </div>
      )}

      {/* Maintenance Reserve Information */}
      {allMetrics && (
        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/20 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            🔧 Property Maintenance System
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {allMetrics.maintenanceReserveRate}%
              </div>
              <div className="text-gray-300 text-sm">Reserve Rate</div>
              <div className="text-gray-400 text-xs mt-1">
                Of monthly income allocated to maintenance
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                €{parseFloat(allMetrics.maintenanceReserve).toLocaleString()}
              </div>
              <div className="text-gray-300 text-sm">Available Funds</div>
              <div className="text-gray-400 text-xs mt-1">
                Ready for property repairs
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                €{parseFloat(allMetrics.totalMaintenanceSpent).toLocaleString()}
              </div>
              <div className="text-gray-300 text-sm">Total Spent</div>
              <div className="text-gray-400 text-xs mt-1">
                On property maintenance
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-gray-300 text-sm">
              💡 <strong>How it works:</strong> {allMetrics.maintenanceReserveRate}% of monthly rental income is automatically 
              reserved for property maintenance. Any unused funds will be distributed to NFT holders when the property is sold.
            </p>
          </div>
        </div>
      )}

      {/* Purchase Form */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
        {/* Current Balance */}
        {isConnected && (
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Your VBK Balance:</span>
              <span className="text-white font-semibold">
                {parseFloat(userVBKBalance).toLocaleString()} VBK
              </span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount to Purchase
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              min="1"
              max={salesMetrics?.remainingTokens || "2500000"}
            step="1"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-3 text-gray-400">VBK</div>
          </div>
          <div className="mt-2 text-sm text-gray-400">
            Price: €{calculatePrice().toLocaleString()} 
            <span className="ml-2">({calculatePrice().toLocaleString()} {paymentMethod})</span>
            {allMetrics && (
              <div className="text-xs text-gray-500 mt-1">
                Distribution: {100 - allMetrics.platformFeeRate - allMetrics.maintenanceReserveRate}% to you, 
                {allMetrics.maintenanceReserveRate}% to maintenance, {allMetrics.platformFeeRate}% platform
              </div>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('ETH')}
              className={`flex items-center justify-center p-3 rounded-lg border transition-colors ${
                paymentMethod === 'ETH'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <CurrencyEuroIcon className="w-5 h-5 mr-2" />
              Pay with ETH
            </button>
            <button
              onClick={() => setPaymentMethod('USDC')}
              className={`flex items-center justify-center p-3 rounded-lg border transition-colors ${
                paymentMethod === 'USDC'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <CreditCardIcon className="w-5 h-5 mr-2" />
              Pay with USDC
            </button>
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={!isConnected || isLoading || !salesMetrics?.salesEnabled}
          className={`w-full py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center ${
            isConnected && salesMetrics?.salesEnabled && !isLoading
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <ShoppingCartIcon className="w-5 h-5 mr-2" />
          )}
          {!isConnected
            ? 'Connect Wallet to Buy'
            : !salesMetrics?.salesEnabled
            ? 'Sales Currently Disabled'
            : isLoading
            ? 'Processing...'
            : `Buy ${amount} VBK for €${calculatePrice()}`}
        </button>

        {/* Features List */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">What you get:</h4>
          <div className="space-y-3">
            <div className="flex items-center text-gray-300">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3" />
              Monthly rental income distributions
            </div>
            <div className="flex items-center text-gray-300">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3" />
              Property maintained with dedicated reserve fund
            </div>
            <div className="flex items-center text-gray-300">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3" />
              Future NFT benefits from unused maintenance funds
            </div>
            <div className="flex items-center text-gray-300">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3" />
              Tradeable on secondary markets
            </div>
          </div>
        </div>
      </div>

      {/* Income Distribution Info */}
      {salesMetrics && salesMetrics.distributionCount > 0 && (
        <div className="mt-8 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            📊 Income Distribution Breakdown
          </h3>
          <p className="text-gray-300 mb-4">
            {salesMetrics.distributionCount} distributions completed so far. 
            Next distribution scheduled for the 15th of next month.
          </p>
          {allMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-green-400">
                  {100 - allMetrics.platformFeeRate - allMetrics.maintenanceReserveRate}%
                </div>
                <div className="text-gray-300 text-sm">To VBK Holders</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-yellow-400">
                  {allMetrics.maintenanceReserveRate}%
                </div>
                <div className="text-gray-300 text-sm">Maintenance Reserve</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-400">
                  {allMetrics.platformFeeRate}%
                </div>
                <div className="text-gray-300 text-sm">Platform Operations</div>
              </div>
            </div>
          )}
          <div className="text-sm text-gray-400">
            💡 Income distributions are automatically sent to all VBK holders based on their token balance at snapshot time.
          </div>
        </div>
      )}
    </div>
  );
};
