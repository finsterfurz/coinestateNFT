import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import {
  MapPinIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Property {
  id: number;
  propertyAddress: string;
  totalValue: string;
  totalShares: number;
  availableShares: number;
  pricePerShare: string;
  ipfsHash: string;
  status: number;
  createdAt: number;
  lastIncomeDistribution: number;
  imageUrl: string;
  description: string;
  expectedYield: number;
  location: string;
}

const PROPERTY_STATUS = {
  0: { label: 'Active', color: 'green' },
  1: { label: 'Funding Complete', color: 'blue' },
  2: { label: 'Acquired', color: 'purple' },
  3: { label: 'Operational', color: 'emerald' },
  4: { label: 'Sold', color: 'gray' },
};

export const Properties: React.FC = () => {
  const { isConnected, propertyNFTContract, refreshData } = useWeb3();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'funded' | 'operational'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'yield' | 'value'>('newest');

  // Mock data for demonstration (in production, fetch from blockchain/API)
  const mockProperties: Property[] = [
    {
      id: 0,
      propertyAddress: 'Tallinn, Estonia - Modern Apartment Complex',
      totalValue: '1500000',
      totalShares: 750,
      availableShares: 623,
      pricePerShare: '2000',
      ipfsHash: 'QmSampleHash1',
      status: 0,
      createdAt: Date.now() - 86400000 * 7,
      lastIncomeDistribution: 0,
      imageUrl: '/api/placeholder/400/300',
      description: 'Premium residential complex in Tallinn city center with modern amenities and high rental demand.',
      expectedYield: 7.2,
      location: 'Tallinn, Estonia',
    },
    {
      id: 1,
      propertyAddress: 'Riga, Latvia - Commercial Office Building',
      totalValue: '2200000',
      totalShares: 1100,
      availableShares: 0,
      pricePerShare: '2000',
      ipfsHash: 'QmSampleHash2',
      status: 3,
      createdAt: Date.now() - 86400000 * 30,
      lastIncomeDistribution: Date.now() - 86400000 * 5,
      imageUrl: '/api/placeholder/400/300',
      description: 'Class A office building in Riga\'s business district with long-term corporate tenants.',
      expectedYield: 8.5,
      location: 'Riga, Latvia',
    },
    {
      id: 2,
      propertyAddress: 'Vilnius, Lithuania - Residential Development',
      totalValue: '1800000',
      totalShares: 900,
      availableShares: 234,
      pricePerShare: '2000',
      ipfsHash: 'QmSampleHash3',
      status: 0,
      createdAt: Date.now() - 86400000 * 14,
      lastIncomeDistribution: 0,
      imageUrl: '/api/placeholder/400/300',
      description: 'New residential development in growing Vilnius suburb with excellent transport links.',
      expectedYield: 6.8,
      location: 'Vilnius, Lithuania',
    },
  ];

  useEffect(() => {
    loadProperties();
  }, [propertyNFTContract]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      if (propertyNFTContract) {
        // In production, fetch from blockchain
        // const propertyCount = await propertyNFTContract.getPropertyCount();
        // Load real property data
      }
      
      // For now, use mock data
      setProperties(mockProperties);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (propertyId: number) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!propertyNFTContract) {
      toast.error('Contract not available');
      return;
    }

    try {
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      toast.loading('Processing purchase...', { id: 'purchase' });

      const tx = await propertyNFTContract.purchasePropertyShare(propertyId, {
        value: property.pricePerShare,
      });

      await tx.wait();

      toast.success('Property share purchased successfully!', { id: 'purchase' });
      
      // Refresh data
      await refreshData();
      await loadProperties();
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed', { id: 'purchase' });
    }
  };

  const filteredProperties = properties.filter(property => {
    switch (filter) {
      case 'available':
        return property.status === 0 && property.availableShares > 0;
      case 'funded':
        return property.status === 1;
      case 'operational':
        return property.status === 3;
      default:
        return true;
    }
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case 'yield':
        return b.expectedYield - a.expectedYield;
      case 'value':
        return parseInt(b.totalValue) - parseInt(a.totalValue);
      case 'newest':
      default:
        return b.createdAt - a.createdAt;
    }
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseInt(amount) : amount;
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Investment Properties
          </h1>
          <p className="text-xl text-gray-400">
            Discover fractional real estate investment opportunities across Europe
          </p>
        </div>

        {/* Filters and Sorting */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Properties' },
              { key: 'available', label: 'Available' },
              { key: 'funded', label: 'Funded' },
              { key: 'operational', label: 'Operational' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="yield">Highest Yield</option>
            <option value="value">Highest Value</option>
          </select>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedProperties.map((property) => (
            <div
              key={property.id}
              className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105"
            >
              {/* Property Image */}
              <div className="relative h-48 bg-gray-700">
                <img
                  src={property.imageUrl}
                  alt={property.propertyAddress}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop`;
                  }}
                />
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      PROPERTY_STATUS[property.status as keyof typeof PROPERTY_STATUS].color === 'green'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : PROPERTY_STATUS[property.status as keyof typeof PROPERTY_STATUS].color === 'blue'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : PROPERTY_STATUS[property.status as keyof typeof PROPERTY_STATUS].color === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}
                  >
                    {PROPERTY_STATUS[property.status as keyof typeof PROPERTY_STATUS].label}
                  </span>
                </div>
              </div>

              {/* Property Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white pr-2 line-clamp-2">
                    {property.propertyAddress}
                  </h3>
                  <div className="text-right text-sm">
                    <div className="text-blue-400 font-semibold">
                      {property.expectedYield}%
                    </div>
                    <div className="text-gray-500">Yield</div>
                  </div>
                </div>

                <div className="flex items-center text-gray-400 text-sm mb-4">
                  <MapPinIcon className="w-4 h-4 mr-1" />
                  {property.location}
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {property.description}
                </p>

                {/* Property Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-gray-400">Total Value</div>
                    <div className="text-white font-semibold">
                      {formatCurrency(property.totalValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Share Price</div>
                    <div className="text-white font-semibold">
                      {formatCurrency(property.pricePerShare)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Funding Progress</span>
                    <span className="text-white">
                      {property.totalShares - property.availableShares}/{property.totalShares} shares
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((property.totalShares - property.availableShares) / property.totalShares) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Link
                    to={`/property/${property.id}`}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 text-center rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    View Details
                  </Link>
                  
                  {property.status === 0 && property.availableShares > 0 ? (
                    <button
                      onClick={() => handlePurchase(property.id)}
                      disabled={!isConnected}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isConnected
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isConnected ? 'Purchase Share' : 'Connect Wallet'}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      {property.availableShares === 0 ? 'Sold Out' : 'Not Available'}
                    </button>
                  )}
                </div>

                {/* Additional Info */}
                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-xs text-gray-500">
                  <span>Created {formatDate(property.createdAt)}</span>
                  {property.lastIncomeDistribution > 0 && (
                    <span>Last payout {formatDate(property.lastIncomeDistribution)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {sortedProperties.length === 0 && (
          <div className="text-center py-16">
            <ChartBarIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No properties found
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters or check back later for new opportunities.
            </p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Start Investing?
          </h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Join thousands of investors who are already earning passive income from real estate 
            through our blockchain-powered platform.
          </p>
          {!isConnected && (
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
              Connect Wallet to Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
