import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3, formatAddress, formatTokenAmount } from '../../contexts/Web3Context';
import { Bars3Icon, XMarkIcon, WalletIcon } from '@heroicons/react/24/outline';

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const {
    isConnected,
    isConnecting,
    account,
    connect,
    disconnect,
    vbkBalance,
    nftCount,
    chainId,
    switchNetwork,
  } = useWeb3();

  const navigation = [
    { name: 'Home', href: '/', current: location.pathname === '/' },
    { name: 'Properties', href: '/properties', current: location.pathname === '/properties' },
    { name: 'Dashboard', href: '/dashboard', current: location.pathname === '/dashboard' },
    { name: 'About', href: '/about', current: location.pathname === '/about' },
  ];

  const handleConnectWallet = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

  const isWrongNetwork = chainId && chainId !== Number(process.env.REACT_APP_CHAIN_ID || 1);

  return (
    <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  CoinEstate
                </h1>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  item.current
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-300 hover:text-white hover:border-b-2 hover:border-gray-600'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Wallet Section */}
          <div className="flex items-center space-x-4">
            {/* Network Warning */}
            {isWrongNetwork && (
              <button
                onClick={() => switchNetwork(Number(process.env.REACT_APP_CHAIN_ID || 1))}
                className="hidden md:flex items-center px-3 py-1 text-xs font-medium text-red-400 bg-red-900/20 border border-red-800 rounded-full hover:bg-red-900/30 transition-colors"
              >
                Wrong Network
              </button>
            )}

            {/* Account Info */}
            {isConnected && account && !isWrongNetwork && (
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <div className="text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span className="text-green-400 font-medium">
                      {formatTokenAmount(vbkBalance)} VBK
                    </span>
                    <span className="text-blue-400 font-medium">
                      {nftCount} NFTs
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Connect Button */}
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 ${
                isConnected
                  ? 'text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white'
                  : 'text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              <WalletIcon className="w-4 h-4 mr-2" />
              {isConnecting
                ? 'Connecting...'
                : isConnected
                ? formatAddress(account!)
                : 'Connect Wallet'}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800 border-t border-gray-700">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 text-base font-medium transition-colors ${
                  item.current
                    ? 'text-blue-400 bg-gray-700'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile Account Info */}
            {isConnected && account && !isWrongNetwork && (
              <div className="px-3 py-2 border-t border-gray-600 mt-3">
                <div className="text-sm text-gray-400 mb-2">Account Balance</div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-400 font-medium">
                    {formatTokenAmount(vbkBalance)} VBK
                  </span>
                  <span className="text-blue-400 font-medium">
                    {nftCount} NFTs
                  </span>
                </div>
              </div>
            )}

            {/* Mobile Network Warning */}
            {isWrongNetwork && (
              <div className="px-3 py-2 border-t border-gray-600">
                <button
                  onClick={() => {
                    switchNetwork(Number(process.env.REACT_APP_CHAIN_ID || 1));
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left text-red-400 text-sm font-medium"
                >
                  ⚠️ Switch to correct network
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
