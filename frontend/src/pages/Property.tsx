import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import {
  MapPinIcon,
  ChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyEuroIcon,
  ArrowLeftIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface PropertyDetails {
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
  description: string;
  location: string;
  expectedYield: number;
  images: string[];
  features: string[];
  financials: {
    purchasePrice: string;
    monthlyRent: string;
    operatingExpenses: string;
    netIncome: string;
    capRate: number;
  };
  documents: {
    name: string;
    url: string;
    type: string;
  }[];
}

const PROPERTY_STATUS = {
  0: { label: 'Active - Funding', color: 'green' },
  1: { label: 'Funding Complete', color: 'blue' },
  2: { label: 'Property Acquired', color: 'purple' },
  3: { label: 'Operational', color: 'emerald' },
  4: { label: 'Sold', color: 'gray' },
};

export const Property: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isConnected, propertyNFTContract, refreshData } = useWeb3();
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'documents'>('overview');

  // Mock property data
  const mockProperty: PropertyDetails = {
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
    description: `Premium residential complex located in the heart of Tallinn's city center. This modern development features high-quality apartments with excellent rental demand from both locals and international professionals. The property benefits from:

• Prime location with excellent transport links
• Modern amenities including gym, concierge, and parking
• High-quality finishes and energy-efficient design
• Strong rental market with low vacancy rates
• Professional property management in place

The building was completed in 2020 and has maintained 95%+ occupancy since opening. Located in Tallinn's fastest-growing district, the property is expected to benefit from continued urban development and increasing demand for quality residential accommodation.`,
    location: 'Tallinn, Estonia',
    expectedYield: 7.2,
    images: [
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop',
    ],
    features: [
      '125 residential units',
      'Underground parking (150 spaces)',
      'Fitness center and spa',
      '24/7 concierge service',
      'Rooftop terrace',
      'Energy rating: A+',
      'Smart building systems',
      'Bicycle storage',
      'Electric vehicle charging',
      'Landscaped courtyard',
    ],
    financials: {
      purchasePrice: '1500000',
      monthlyRent: '12500',
      operatingExpenses: '3500',
      netIncome: '9000',
      capRate: 7.2,
    },
    documents: [
      { name: 'Property Valuation Report', url: '#', type: 'PDF' },
      { name: 'Legal Due Diligence', url: '#', type: 'PDF' },
      { name: 'Rental Income Analysis', url: '#', type: 'PDF' },
      { name: 'Building Inspection Report', url: '#', type: 'PDF' },
      { name: 'Insurance Documentation', url: '#', type: 'PDF' },
    ],
  };

  useEffect(() => {
    loadPropertyData();
  }, [id, propertyNFTContract]);

  const loadPropertyData = async () => {
    setLoading(true);
    try {
      if (propertyNFTContract && id) {
        // In production, fetch real property data
        // const propertyData = await propertyNFTContract.getProperty(id);
      }
      
      // For demo, use mock data
      setProperty(mockProperty);
    } catch (error) {
      console.error('Error loading property:', error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!propertyNFTContract || !property) {
      toast.error('Contract not available');
      return;
    }

    try {
      toast.loading('Processing purchase...', { id: 'purchase' });

      const tx = await propertyNFTContract.purchasePropertyShare(property.id, {
        value: property.pricePerShare,
      });

      await tx.wait();

      toast.success('Property share purchased successfully!', { id: 'purchase' });
      
      // Refresh data
      await refreshData();
      await loadPropertyData();
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed', { id: 'purchase' });
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'long',
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

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">Property Not Found</h2>
            <p className="text-gray-400 mb-8">The property you're looking for doesn't exist.</p>
            <Link
              to="/properties"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fundingProgress = ((property.totalShares - property.availableShares) / property.totalShares) * 100;

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/properties"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Images */}
            <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
              <div className="relative h-96">
                <img
                  src={property.images[selectedImage]}
                  alt={property.propertyAddress}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      PROPERTY_STATUS[property.status as keyof typeof PROPERTY_STATUS].color === 'green'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : PROPERTY_STATUS[property.status as keyof typeof PROPERTY_STATUS].color === 'blue'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}
                  >
                    {PROPERTY_STATUS[property.status as keyof typeof PROPERTY_STATUS].label}
                  </span>
                </div>
              </div>
              
              {/* Image thumbnails */}
              <div className="p-4 flex space-x-2 overflow-x-auto">
                {property.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index ? 'border-blue-500' : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <img src={image} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Property Header */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-4">{property.propertyAddress}</h1>
              <div className="flex items-center text-gray-400 mb-4">
                <MapPinIcon className="w-5 h-5 mr-2" />
                {property.location}
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  Listed {formatDate(property.createdAt)}
                </div>
                <div className="flex items-center">
                  <ChartBarIcon className="w-4 h-4 mr-1" />
                  {property.expectedYield}% Expected Yield
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700">
              <div className="flex border-b border-gray-700">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'financials', label: 'Financials' },
                  { key: 'documents', label: 'Documents' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`px-6 py-4 font-medium transition-colors ${
                      activeTab === key
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                      <div className="text-gray-300 whitespace-pre-line leading-relaxed">
                        {property.description}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Property Features</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {property.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-gray-300">
                            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Financials Tab */}
                {activeTab === 'financials' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Revenue</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Monthly Rent</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(property.financials.monthlyRent)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Annual Rent</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(parseFloat(property.financials.monthlyRent) * 12)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Expenses</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Monthly Operating</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(property.financials.operatingExpenses)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Annual Operating</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(parseFloat(property.financials.operatingExpenses) * 12)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Net Income</h3>
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Monthly Net Income</span>
                          <span className="text-green-400 font-semibold">
                            {formatCurrency(property.financials.netIncome)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Annual Net Income</span>
                          <span className="text-green-400 font-semibold">
                            {formatCurrency(parseFloat(property.financials.netIncome) * 12)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cap Rate</span>
                          <span className="text-blue-400 font-semibold">
                            {property.financials.capRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Property Documentation</h3>
                    <div className="space-y-3">
                      {property.documents.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                              <PhotoIcon className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium">{doc.name}</div>
                              <div className="text-gray-400 text-sm">{doc.type}</div>
                            </div>
                          </div>
                          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Investment Summary */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Investment Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Value</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(property.totalValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Share Price</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(property.pricePerShare)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expected Yield</span>
                  <span className="text-blue-400 font-semibold">
                    {property.expectedYield}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Available Shares</span>
                  <span className="text-white font-semibold">
                    {property.availableShares}/{property.totalShares}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Funding Progress</span>
                  <span className="text-white">{fundingProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${fundingProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Purchase Button */}
              {property.status === 0 && property.availableShares > 0 ? (
                <button
                  onClick={handlePurchase}
                  disabled={!isConnected}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
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
                  className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
                >
                  {property.availableShares === 0 ? 'Sold Out' : 'Not Available'}
                </button>
              )}

              <div className="mt-4 text-xs text-gray-500 text-center">
                You will receive 1 NFT representing your property share
              </div>
            </div>

            {/* Property Stats */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Property Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserGroupIcon className="w-4 h-4 text-blue-400 mr-2" />
                    <span className="text-gray-400 text-sm">Investors</span>
                  </div>
                  <span className="text-white font-medium">
                    {property.totalShares - property.availableShares}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CurrencyEuroIcon className="w-4 h-4 text-green-400 mr-2" />
                    <span className="text-gray-400 text-sm">Raised</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatCurrency((property.totalShares - property.availableShares) * parseFloat(property.pricePerShare))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ChartBarIcon className="w-4 h-4 text-purple-400 mr-2" />
                    <span className="text-gray-400 text-sm">Monthly Income</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatCurrency(property.financials.netIncome)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
