import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface MaintenanceInfo {
  currentReserve: string;
  totalSpent: string;
  reserveRate: number;
  availableForWithdrawal: string;
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

interface DistributionHistory {
  id: number;
  timestamp: number;
  total: string;
  toPlatform: string;
  toMaintenance: string;
  toHolders: string;
}

export const AdminMaintenancePanel: React.FC = () => {
  const { isConnected, signer, account } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo | null>(null);
  const [allMetrics, setAllMetrics] = useState<AllMetrics | null>(null);
  const [distributionHistory, setDistributionHistory] = useState<DistributionHistory[]>([]);

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');

  // Rate adjustment
  const [newMaintenanceRate, setNewMaintenanceRate] = useState('');
  const [newPlatformRate, setNewPlatformRate] = useState('');

  const VBK_SALES_CONTRACT = process.env.REACT_APP_VBK_SALES_CONTRACT;

  const VBK_ADMIN_ABI = [
    "function owner() external view returns (address)",
    "function getAllMetrics() external view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint8, uint8, bool)",
    "function getMaintenanceInfo() external view returns (uint256, uint256, uint8, uint256)",
    "function withdrawMaintenance(uint256 amount, address to, string calldata reason) external",
    "function setMaintenanceReserveRate(uint8 rate) external",
    "function setPlatformFeeRate(uint8 rate) external",
    "function distributeMonthlyIncome() external",
    "function setSalesEnabled(bool enabled) external",
    "function pause() external",
    "function unpause() external",
    "function distributions(uint256 id) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
    "function distributionCount() external view returns (uint256)",
  ];

  useEffect(() => {
    if (isConnected && signer) {
      checkOwnership();
      loadAllData();
    }
  }, [isConnected, signer, account]);

  const checkOwnership = async () => {
    try {
      if (!signer || !VBK_SALES_CONTRACT || !account) return;

      const contract = new ethers.Contract(VBK_SALES_CONTRACT, VBK_ADMIN_ABI, signer);
      const owner = await contract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());
    } catch (error) {
      console.error('Error checking ownership:', error);
    }
  };

  const loadAllData = async () => {
    try {
      if (!signer || !VBK_SALES_CONTRACT) return;

      const contract = new ethers.Contract(VBK_SALES_CONTRACT, VBK_ADMIN_ABI, signer);

      // Load maintenance info
      const maintenanceData = await contract.getMaintenanceInfo();
      setMaintenanceInfo({
        currentReserve: ethers.formatEther(maintenanceData[0]),
        totalSpent: ethers.formatEther(maintenanceData[1]),
        reserveRate: Number(maintenanceData[2]),
        availableForWithdrawal: ethers.formatEther(maintenanceData[3]),
      });

      // Load all metrics
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

      // Load distribution history
      const distributionCount = Number(metrics[3]);
      const history: DistributionHistory[] = [];
      
      for (let i = Math.max(1, distributionCount - 4); i <= distributionCount; i++) {
        try {
          const dist = await contract.distributions(i);
          history.push({
            id: i,
            timestamp: Number(dist[0]),
            total: ethers.formatEther(dist[2]),
            toPlatform: ethers.formatEther(dist[3]),
            toMaintenance: ethers.formatEther(dist[4]),
            toHolders: ethers.formatEther(dist[5]),
          });
        } catch (error) {
          console.warn(`Failed to load distribution ${i}:`, error);
        }
      }
      
      setDistributionHistory(history.reverse());

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleWithdrawMaintenance = async () => {
    if (!withdrawAmount || !recipientAddress || !withdrawReason) {
      toast.error('Please fill all fields');
      return;
    }

    if (!ethers.isAddress(recipientAddress)) {
      toast.error('Invalid recipient address');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > parseFloat(maintenanceInfo?.availableForWithdrawal || '0')) {
      toast.error('Invalid amount');
      return;
    }

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(VBK_SALES_CONTRACT!, VBK_ADMIN_ABI, signer!);
      const withdrawAmountWei = ethers.parseEther(withdrawAmount);

      const tx = await contract.withdrawMaintenance(
        withdrawAmountWei,
        recipientAddress,
        withdrawReason
      );

      toast.loading('Processing maintenance withdrawal...', { id: 'withdraw' });
      await tx.wait();

      toast.success(
        `Successfully withdrew €${withdrawAmount} for: ${withdrawReason}`,
        { id: 'withdraw' }
      );

      // Reset form and reload data
      setWithdrawAmount('');
      setRecipientAddress('');
      setWithdrawReason('');
      await loadAllData();

    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.reason || 'Withdrawal failed', { id: 'withdraw' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistributeIncome = async () => {
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(VBK_SALES_CONTRACT!, VBK_ADMIN_ABI, signer!);
      
      const tx = await contract.distributeMonthlyIncome();
      toast.loading('Processing monthly distribution...', { id: 'distribute' });
      await tx.wait();

      toast.success('Monthly income distributed successfully!', { id: 'distribute' });
      await loadAllData();

    } catch (error: any) {
      console.error('Distribution error:', error);
      toast.error(error.reason || 'Distribution failed', { id: 'distribute' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRates = async () => {
    if (!newMaintenanceRate && !newPlatformRate) {
      toast.error('Please enter at least one rate to update');
      return;
    }

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(VBK_SALES_CONTRACT!, VBK_ADMIN_ABI, signer!);

      if (newMaintenanceRate) {
        const rate = parseInt(newMaintenanceRate);
        if (rate < 0 || rate > 25) {
          toast.error('Maintenance rate must be between 0-25%');
          return;
        }
        
        const tx1 = await contract.setMaintenanceReserveRate(rate);
        await tx1.wait();
        toast.success(`Maintenance rate updated to ${rate}%`);
      }

      if (newPlatformRate) {
        const rate = parseInt(newPlatformRate);
        if (rate < 0 || rate > 20) {
          toast.error('Platform rate must be between 0-20%');
          return;
        }
        
        const tx2 = await contract.setPlatformFeeRate(rate);
        await tx2.wait();
        toast.success(`Platform rate updated to ${rate}%`);
      }

      setNewMaintenanceRate('');
      setNewPlatformRate('');
      await loadAllData();

    } catch (error: any) {
      console.error('Rate update error:', error);
      toast.error(error.reason || 'Rate update failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-800 rounded-2xl border border-red-700 p-8 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You are not the contract owner. Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          🏗️ Property Maintenance Admin Panel
        </h1>
        <p className="text-gray-400 text-lg">
          Manage maintenance reserves and property operations
        </p>
      </div>

      {/* Quick Stats */}
      {maintenanceInfo && allMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 text-center">
            <WrenchScrewdriverIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">
              €{parseFloat(maintenanceInfo.currentReserve).toLocaleString()}
            </div>
            <div className="text-gray-300 text-sm">Available Reserve</div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 text-center">
            <CurrencyDollarIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">
              €{parseFloat(maintenanceInfo.totalSpent).toLocaleString()}
            </div>
            <div className="text-gray-300 text-sm">Total Spent</div>
          </div>
          
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 text-center">
            <ChartBarIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">
              {maintenanceInfo.reserveRate}%
            </div>
            <div className="text-gray-300 text-sm">Reserve Rate</div>
          </div>
          
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 text-center">
            <CalendarIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-400">
              {allMetrics.distributionCount}
            </div>
            <div className="text-gray-300 text-sm">Distributions</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Maintenance Withdrawal */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <WrenchScrewdriverIcon className="w-6 h-6 mr-2 text-yellow-400" />
            Withdraw Maintenance Funds
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (EUR)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                max={maintenanceInfo?.availableForWithdrawal || "0"}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <div className="text-xs text-gray-400 mt-1">
                Available: €{parseFloat(maintenanceInfo?.availableForWithdrawal || '0').toLocaleString()}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Withdrawal
              </label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="e.g., Roof repair, HVAC maintenance, Plumbing fix..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            
            <button
              onClick={handleWithdrawMaintenance}
              disabled={isLoading || !withdrawAmount || !recipientAddress || !withdrawReason}
              className="w-full py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : 'Withdraw Funds'}
            </button>
          </div>
        </div>

        {/* Monthly Distribution */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2 text-green-400" />
            Monthly Income Distribution
          </h3>
          
          <div className="space-y-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h4 className="font-semibold text-white mb-2">Current Distribution Rates:</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-400">
                    {allMetrics ? 100 - allMetrics.platformFeeRate - allMetrics.maintenanceReserveRate : 0}%
                  </div>
                  <div className="text-xs text-gray-400">To Holders</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-400">
                    {allMetrics?.maintenanceReserveRate || 0}%
                  </div>
                  <div className="text-xs text-gray-400">Maintenance</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-400">
                    {allMetrics?.platformFeeRate || 0}%
                  </div>
                  <div className="text-xs text-gray-400">Platform</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDistributeIncome}
              disabled={isLoading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : 'Distribute Monthly Income'}
            </button>
            
            <div className="text-xs text-gray-400">
              💡 Run this on the 15th of each month after rental income is received
            </div>
          </div>
        </div>
      </div>

      {/* Rate Adjustment */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <ChartBarIcon className="w-6 h-6 mr-2 text-blue-400" />
          Adjust Distribution Rates
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Maintenance Reserve Rate (%)
            </label>
            <input
              type="number"
              value={newMaintenanceRate}
              onChange={(e) => setNewMaintenanceRate(e.target.value)}
              placeholder={allMetrics?.maintenanceReserveRate.toString() || "10"}
              min="0"
              max="25"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Platform Fee Rate (%)
            </label>
            <input
              type="number"
              value={newPlatformRate}
              onChange={(e) => setNewPlatformRate(e.target.value)}
              placeholder={allMetrics?.platformFeeRate.toString() || "5"}
              min="0"
              max="20"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <button
          onClick={handleUpdateRates}
          disabled={isLoading || (!newMaintenanceRate && !newPlatformRate)}
          className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Updating...' : 'Update Rates'}
        </button>
      </div>

      {/* Recent Distributions */}
      {distributionHistory.length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-6">Recent Distributions</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 text-gray-300">Date</th>
                  <th className="text-right py-3 text-gray-300">Total</th>
                  <th className="text-right py-3 text-gray-300">To Holders</th>
                  <th className="text-right py-3 text-gray-300">Maintenance</th>
                  <th className="text-right py-3 text-gray-300">Platform</th>
                </tr>
              </thead>
              <tbody>
                {distributionHistory.map((dist) => (
                  <tr key={dist.id} className="border-b border-gray-700/50">
                    <td className="py-3 text-gray-300">
                      {new Date(dist.timestamp * 1000).toLocaleDateString()}
                    </td>
                    <td className="text-right py-3 text-white font-semibold">
                      €{parseFloat(dist.total).toLocaleString()}
                    </td>
                    <td className="text-right py-3 text-green-400">
                      €{parseFloat(dist.toHolders).toLocaleString()}
                    </td>
                    <td className="text-right py-3 text-yellow-400">
                      €{parseFloat(dist.toMaintenance).toLocaleString()}
                    </td>
                    <td className="text-right py-3 text-blue-400">
                      €{parseFloat(dist.toPlatform).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
