import React from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export const About: React.FC = () => {
  const teamMembers = [
    {
      name: 'Alex Thompson',
      role: 'CEO & Co-Founder',
      bio: 'Former Goldman Sachs investment banker with 15+ years in real estate finance.',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face',
    },
    {
      name: 'Sarah Chen',
      role: 'CTO & Co-Founder',
      bio: 'Blockchain architect formerly at Ethereum Foundation and Chainlink.',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b1e9?w=300&h=300&fit=crop&crop=face',
    },
    {
      name: 'Marcus Weber',
      role: 'Head of Real Estate',
      bio: 'Real estate investment expert with €500M+ portfolio management experience.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
    },
    {
      name: 'Lisa Kowalski',
      role: 'Head of Legal & Compliance',
      bio: 'Securities lawyer specializing in digital assets and EU regulatory compliance.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face',
    },
  ];

  const milestones = [
    {
      date: 'Q4 2024',
      title: 'Platform Launch',
      description: 'CoinEstate platform goes live with first property offering in Tallinn, Estonia.',
      status: 'completed',
    },
    {
      date: 'Q1 2025',
      title: 'Estonian Company Formation',
      description: 'Legal entity established with full regulatory compliance for EU operations.',
      status: 'current',
    },
    {
      date: 'Q2 2025',
      title: 'Portfolio Expansion',
      description: 'Launch 5 additional properties across Baltic states with €10M target funding.',
      status: 'upcoming',
    },
    {
      date: 'Q3 2025',
      title: 'DAO Governance',
      description: 'Implement decentralized governance allowing token holders to vote on key decisions.',
      status: 'upcoming',
    },
    {
      date: 'Q4 2025',
      title: 'European Expansion',
      description: 'Expand operations to Western Europe with properties in Germany and Netherlands.',
      status: 'upcoming',
    },
  ];

  const stats = [
    { value: '€2M', label: 'Target Capital', description: 'Initial funding goal for platform launch' },
    { value: '1,000', label: 'NFTs Available', description: 'Property shares at €2,000 each' },
    { value: '7.2%', label: 'Expected Yield', description: 'Average annual return on investment' },
    { value: '95%', label: 'Transparency', description: 'All transactions on blockchain' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            About{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CoinEstate
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We're democratizing real estate investment through blockchain technology, 
            making property ownership accessible to everyone with transparent, fractional investments.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Traditional real estate investment requires significant capital, complex processes, 
                and limited liquidity. We're changing that by leveraging blockchain technology 
                to create fractional, transparent, and accessible property investments.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                Through VaultBrick (VBK) tokens and property NFTs, investors can own real estate 
                shares starting at just €2,000, earn passive income through automated stablecoin 
                distributions, and participate in a decentralized property investment ecosystem.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-700/50 rounded-xl p-6 text-center">
                <BuildingOffice2Icon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Real Assets</h3>
                <p className="text-gray-400 text-sm">Backed by physical properties</p>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-6 text-center">
                <ShieldCheckIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Transparent</h3>
                <p className="text-gray-400 text-sm">All transactions on blockchain</p>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-6 text-center">
                <CurrencyDollarIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Accessible</h3>
                <p className="text-gray-400 text-sm">Low minimum investment</p>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-6 text-center">
                <GlobeAltIcon className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Global</h3>
                <p className="text-gray-400 text-sm">Worldwide accessibility</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Platform by the Numbers
            </h2>
            <p className="text-xl text-gray-400">
              Key metrics that demonstrate our commitment to transparent real estate investment
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-lg font-semibold text-white mb-2">
                  {stat.label}
                </div>
                <div className="text-gray-400 text-sm">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section id="tokenomics" className="py-20 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              VaultBrick (VBK) Tokenomics
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our tokenomics are designed for sustainability, transparency, and long-term value creation 
              for both investors and the platform ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white mb-6">Token Design</h3>
              
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">VaultBrick (VBK) Token</h4>
                <div className="space-y-3 text-gray-300">
                  <p>• ERC20 standard token pegged to €1.00</p>
                  <p>• Maximum supply capped at 2.5 million VBK</p>
                  <p>• Deflationary mechanics through token burning</p>
                  <p>• Links NFT ownership to income distribution</p>
                  <p>• Enables DAO governance participation</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">Property NFTs</h4>
                <div className="space-y-3 text-gray-300">
                  <p>• ERC721 tokens representing property shares</p>
                  <p>• Each NFT = €2,000 fractional ownership</p>
                  <p>• Tradeable on secondary markets</p>
                  <p>• Includes property metadata on IPFS</p>
                  <p>• Automatic income distribution eligibility</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white mb-6">Token Distribution</h3>
              
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Token Symbol</span>
                  <span className="text-white font-semibold">VBK</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Total Supply</span>
                  <span className="text-white font-semibold">2,500,000 VBK</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Token Price</span>
                  <span className="text-white font-semibold">€1.00</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">NFT Price</span>
                  <span className="text-white font-semibold">€2,000.00</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                  <span className="text-gray-400">Blockchain</span>
                  <span className="text-white font-semibold">Ethereum</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-400">Legal Structure</span>
                  <span className="text-white font-semibold">Estonian Company</span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4">Income Distribution</h4>
                <div className="space-y-3 text-gray-300">
                  <p>• Monthly stablecoin distributions (USDC/USDT)</p>
                  <p>• Proportional to NFT/VBK holdings</p>
                  <p>• Automated smart contract execution</p>
                  <p>• Transparent on-chain records</p>
                  <p>• No minimum holding period</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-400">
              Experienced professionals from real estate, blockchain, and finance industries
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-gray-700"
                  />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{member.name}</h3>
                <p className="text-blue-400 font-medium mb-3">{member.role}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Platform Roadmap
            </h2>
            <p className="text-xl text-gray-400">
              Our strategic milestones for building the future of real estate investment
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gray-700"></div>

            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <div className="text-sm text-blue-400 font-semibold mb-2">{milestone.date}</div>
                      <h3 className="text-lg font-bold text-white mb-3">{milestone.title}</h3>
                      <p className="text-gray-400">{milestone.description}</p>
                    </div>
                  </div>
                  
                  {/* Timeline node */}
                  <div className="relative z-10">
                    <div className={`w-6 h-6 rounded-full border-4 ${
                      milestone.status === 'completed' 
                        ? 'bg-green-500 border-green-500'
                        : milestone.status === 'current'
                        ? 'bg-blue-500 border-blue-500 animate-pulse'
                        : 'bg-gray-700 border-gray-600'
                    }`}></div>
                  </div>
                  
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Legal & Compliance */}
      <section className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Legal & Compliance
            </h2>
            <p className="text-xl text-gray-400">
              Full regulatory compliance ensuring investor protection and platform security
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-700/50 rounded-xl p-6 text-center">
              <ShieldCheckIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-3">EU Compliance</h3>
              <p className="text-gray-400">
                Fully compliant with European Union securities regulations and MiCA requirements.
              </p>
            </div>
            
            <div className="bg-gray-700/50 rounded-xl p-6 text-center">
              <UsersIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-3">Investor Protection</h3>
              <p className="text-gray-400">
                KYC/AML procedures and investor accreditation ensure platform security and compliance.
              </p>
            </div>
            
            <div className="bg-gray-700/50 rounded-xl p-6 text-center">
              <ChartBarIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-3">Transparency</h3>
              <p className="text-gray-400">
                All property transactions, income distributions, and platform operations are transparent and auditable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Investing?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of investors building wealth through fractional real estate ownership
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/properties"
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Browse Properties
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-8 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
