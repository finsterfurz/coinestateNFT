import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { name: 'How It Works', href: '/about' },
      { name: 'Properties', href: '/properties' },
      { name: 'Tokenomics', href: '/about#tokenomics' },
      { name: 'Dashboard', href: '/dashboard' },
    ],
    legal: [
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Risk Disclosure', href: '/risks' },
      { name: 'Compliance', href: '/compliance' },
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Developer API', href: '/docs' },
    ],
    community: [
      { name: 'Discord', href: 'https://discord.gg/coinestate' },
      { name: 'Twitter', href: 'https://twitter.com/coinestate' },
      { name: 'Telegram', href: 'https://t.me/coinestate' },
      { name: 'Medium', href: 'https://medium.com/@coinestate' },
    ],
  };

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                CoinEstate
              </h3>
            </div>
            <p className="mt-4 text-sm text-gray-400 max-w-md">
              Fractional real estate investment through blockchain technology. 
              Own property shares starting at €2,000 and earn passive income through stablecoins.
            </p>
            <div className="mt-6 flex space-x-4">
              <div className="text-xs text-gray-500">
                <div className="font-semibold text-gray-400">VaultBrick (VBK)</div>
                <div>ERC20 • €1.00 per token</div>
                <div>2.5M token cap</div>
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
              Platform
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
              Support
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
              Community
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>&copy; {currentYear} CoinEstate. All rights reserved.</span>
              <span className="hidden md:inline">•</span>
              <span className="text-xs">coinestate.io</span>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Estonian Company</span>
              </div>
              <span className="hidden md:inline">•</span>
              <span>EU Compliant</span>
              <span className="hidden md:inline">•</span>
              <span>Ethereum Mainnet</span>
            </div>
          </div>
        </div>

        {/* Investment Disclaimer */}
        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            <strong className="text-gray-400">Investment Disclaimer:</strong> 
            {' '}This platform facilitates real estate investment opportunities. All investments carry risk. 
            Please conduct your own research and consult with financial advisors before investing. 
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </footer>
  );
};
