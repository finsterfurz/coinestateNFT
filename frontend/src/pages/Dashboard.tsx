import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3, formatTokenAmount } from '../contexts/Web3Context';
import {
  WalletIcon,
  ChartBarIcon,
  CurrencyEuroIcon,
  HomeIcon,
  TrendingUpIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

interface UserNFT {
  tokenId: number;
  propertyId: number;
  propertyAddress: string;
  shareNumber: number;
  purchasePrice: string;
  purchaseDate: number;
  lastIncomeCollection: number;
  currentValue: string;
  totalEarnings: string;
  imageUrl: string;
}

interface IncomeHistory {
  date: number;
  amount: string;
  propertyId: number;
  propertyAddress: string;
  transactionHash: string;
}

export const Dashboard: React.FC = () => {
  const {
    isConnected,
    account,
    vbkBalance,
    nftCount,
    vbkContract,
    propertyNFTContract,
    refreshData,
  } = useWeb3();

  const [userNFTs, setUserNFTs] = useState<UserNFT[]>([]);
  const [incomeHistory, setIncomeHistory] = useState<IncomeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInvestment, setTotalInvestment] = useState('0');
  const [totalEarnings, setTotalEarnings] = useState('0');
  const [portfolioValue, setPortfolioValue] = useState('0');

  // Mock data for demonstration
  const mockUserNFTs: UserNFT[] = [
    {
      tokenId: 1,
      propertyId: 0,
      propertyAddress: 'Tallinn, Estonia - Modern Apartment Complex',
      shareNumber: 127,
      purchasePrice: '2000',
      purchaseDate: Date.now() - 86400000 * 45,
      lastIncomeCollection: Date.now() - 86400000 * 5,
      currentValue: '2080',
      totalEarnings: '156.50',
      imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop',
    },
    {
      tokenId: 5,
      propertyId: 1,
      propertyAddress: 'Riga, Latvia - Commercial Office Building',
      shareNumber: 89,
      purchasePrice: '2000',
      purchaseDate: Date.now() - 86400000 * 30,
      lastIncomeCollection: Date.now() - 86400000 * 5,
      currentValue: '2120',
      totalEarnings: '203.75',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    },
  ];

  const mockIncomeHistory: IncomeHistory[] = [
    {
      date: Date.now() - 86400000 * 5,
      amount: '18.50',
      propertyId: 0,
      propertyAddress: 'Tallinn, Estonia - Modern Apartment Complex',
      transactionHash: '0x1234...5678',
    },
    {
      date: Date.now() - 86400000 * 5,
      amount: '22.75',
      propertyId: 1,
      propertyAddress: 'Riga, Latvia - Commercial Office Building',
      transactionHash: '0x2345...6789',
    },
    {
      date: Date.now() - 86400000 * 35,
      amount: '19.25',
      propertyId: 0,
      propertyAddress: 'Tallinn, Estonia - Modern Apartment Complex',
      transactionHash: '0x3456...7890',
    },
    {
      date: Date.now() - 86400000 * 35,
      amount: '24.50',
      propertyId: 1,
      propertyAddress: 'Riga, Latvia - Commercial Office Building',
      transactionHash: '0x4567...8901',
    },
  ];

  useEffect(() => {
    if (isConnected && account) {
      loadDashboardData();
    }
  }, [isConnected, account, vbkContract, propertyNFTContract]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (propertyNFTContract && account) {
        // In production, fetch real data from blockchain
        // const tokenIds = await propertyNFTContract.getOwnerTokenIds(account);
        // Load real NFT and income data
      }

      // For demo, use mock data
      setUserNFTs(mockUserNFTs);
      setIncomeHistory(mockIncomeHistory);

      // Calculate totals
      const totalInv = mockUserNFTs.reduce((sum, nft) => sum + parseFloat(nft.purchasePrice), 0);
      const totalEarn = mockUserNFTs.reduce((sum, nft) => sum + parseFloat(nft.totalEarnings), 0);
      const portfolioVal = mockUserNFTs.reduce((sum, nft) => sum + parseFloat(nft.currentValue), 0);

      setTotalInvestment(totalInv.toString());
      setTotalEarnings(totalEarn.toString());
      setPortfolioValue(portfolioVal.toString());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateROI = (purchasePrice: string, currentValue: string, totalEarnings: string) => {
    const invested = parseFloat(purchasePrice);
    const current = parseFloat(currentValue);
    const earnings = parseFloat(totalEarnings);
    const totalReturn = (current - invested) + earnings;
    return ((totalReturn / invested) * 100).toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <WalletIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to view your investment dashboard and track your property portfolio.
            </p>
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Investment Dashboard
          </h1>
          <p className="text-gray-400">
            Welcome back! Here's your property investment overview.
          </p>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <WalletIcon className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs text-gray-400">VBK Balance</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatTokenAmount(vbkBalance)}
            </div>
            <div className="text-sm text-gray-400">VBK Tokens</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <HomeIcon className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs text-gray-400">Properties</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{nftCount}</div>
            <div className="text-sm text-gray-400">Property NFTs</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-xs text-gray-400">Portfolio Value</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(portfolioValue)}
            </div>
            <div className="flex items-center text-sm">
              <ArrowUpIcon className="w-4 h-4 text-green-400 mr-1" />
              <span className="text-green-400">
                +{((parseFloat(portfolioValue) - parseFloat(totalInvestment)) / parseFloat(totalInvestment) * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <CurrencyEuroIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-xs text-gray-400">Total Earnings</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(totalEarnings)}
            </div>
            <div className="text-sm text-gray-400">All-time income</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Portfolio */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Your Properties</h2>
                <Link
                  to="/properties"
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Browse More
                </Link>
              </div>

              {userNFTs.length === 0 ? (
                <div className="text-center py-8">
                  <HomeIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">
                    No Properties Yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Start building your real estate portfolio today.
                  </p>
                  <Link
                    to="/properties"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse Properties
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {userNFTs.map((nft) => (
                    <div
                      key={nft.tokenId}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <img
                          src={nft.imageUrl}
                          alt={nft.propertyAddress}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-white font-semibold text-sm truncate">
                                {nft.propertyAddress}
                              </h3>
                              <p className="text-gray-400 text-xs">
                                Share #{nft.shareNumber} • NFT #{nft.tokenId}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-semibold text-sm">
                                {formatCurrency(nft.currentValue)}
                              </div>
                              <div className={`text-xs flex items-center ${
                                parseFloat(calculateROI(nft.purchasePrice, nft.currentValue, nft.totalEarnings)) >= 0
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }`}>
                                {parseFloat(calculateROI(nft.purchasePrice, nft.currentValue, nft.totalEarnings)) >= 0 ? (
                                  <ArrowUpIcon className="w-3 h-3 mr-1" />
                                ) : (
                                  <ArrowDownIcon className="w-3 h-3 mr-1" />
                                )}
                                {calculateROI(nft.purchasePrice, nft.currentValue, nft.totalEarnings)}%
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                            <div>
                              <div className="text-gray-400">Invested</div>
                              <div className="text-white font-medium">
                                {formatCurrency(nft.purchasePrice)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400">Earned</div>
                              <div className="text-green-400 font-medium">
                                {formatCurrency(nft.totalEarnings)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400">Purchased</div>
                              <div className="text-white font-medium">
                                {formatDate(nft.purchaseDate)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Income History */}
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Portfolio Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Invested</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(totalInvestment)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Value</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(portfolioValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Earnings</span>
                  <span className="text-green-400 font-semibold">
                    +{formatCurrency(totalEarnings)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Return</span>
                    <span className="text-green-400 font-semibold">
                      +{((parseFloat(portfolioValue) + parseFloat(totalEarnings) - parseFloat(totalInvestment)) / parseFloat(totalInvestment) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Income */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Income</h2>
              {incomeHistory.length === 0 ? (
                <div className="text-center py-4">
                  <CurrencyEuroIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No income received yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomeHistory.slice(0, 5).map((income, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0"
                    >
                      <div>
                        <div className="text-white text-sm font-medium">
                          +{formatCurrency(income.amount)}
                        </div>
                        <div className="text-gray-400 text-xs truncate max-w-[150px]">
                          {income.propertyAddress}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 text-xs">
                          {formatDate(income.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {incomeHistory.length > 5 && (
                    <div className="text-center pt-2">
                      <button className="text-blue-400 hover:text-blue-300 text-sm">
                        View All Income
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
