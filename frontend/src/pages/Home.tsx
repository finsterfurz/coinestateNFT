import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useInView } from 'react-intersection-observer';
import { useWeb3, formatTokenAmount } from '../contexts/Web3Context';
import { VBKSalesWidget } from '../components/VBKSalesWidget';
import {
  HomeIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BoltIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

export const Home: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { isConnected, vbkBalance, nftCount } = useWeb3();

  const [featuresRef, featuresInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [statsRef, statsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [salesRef, salesInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    // Hero animations
    if (heroRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        '.hero-title',
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
      )
        .fromTo(
          '.hero-subtitle',
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
          '-=0.5'
        )
        .fromTo(
          '.hero-cta',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
          '-=0.3'
        );
    }

    // Floating cards animation
    gsap.to('.floating-card', {
      y: -20,
      duration: 3,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: -1,
      stagger: 0.5,
    });
  }, []);

  useEffect(() => {
    if (featuresInView) {
      gsap.fromTo(
        '.feature-card',
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
        }
      );
    }
  }, [featuresInView]);

  useEffect(() => {
    if (statsInView) {
      gsap.fromTo(
        '.stat-number',
        { textContent: 0 },
        {
          textContent: (i, target) => target.getAttribute('data-value'),
          duration: 2,
          ease: 'power2.out',
          snap: { textContent: 1 },
          stagger: 0.2,
        }
      );
    }
  }, [statsInView]);

  useEffect(() => {
    if (salesInView) {
      gsap.fromTo(
        '.sales-widget',
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'power3.out',
        }
      );
    }
  }, [salesInView]);

  const features = [
    {
      icon: HomeIcon,
      title: 'Real Estate Exposure',
      description:
        'Direct ownership in physical properties through blockchain technology. Each VBK token represents your stake in our real estate portfolio.',
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Monthly Income',
      description:
        'Earn passive income through automated monthly distributions in stablecoins. Payments sent directly to your wallet on the 15th of each month.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Blockchain Security',
      description:
        'Ethereum-compatible smart contracts ensure transparent, immutable ownership records and automated distributions.',
    },
    {
      icon: ChartBarIcon,
      title: 'Low Entry Barrier',
      description:
        'Start real estate investing with just €100 worth of VBK tokens instead of hundreds of thousands for traditional property investment.',
    },
    {
      icon: BoltIcon,
      title: 'Instant Liquidity',
      description:
        'Trade your VBK tokens anytime on exchanges, providing liquidity typically unavailable in real estate investments.',
    },
    {
      icon: GlobeAltIcon,
      title: 'DAO Governance',
      description:
        'Participate in platform decisions and property selection through token-weighted voting rights in our decentralized organization.',
    },
  ];

  const stats = [
    { label: 'VBK Price', value: '1', prefix: '€', suffix: '' },
    { label: 'Total Supply', value: '2.5M', prefix: '', suffix: ' VBK' },
    { label: 'Monthly Distributions', value: '15th', prefix: '', suffix: '' },
    { label: 'Platform Fee', value: '5', prefix: '', suffix: '%' },
  ];

  const processSteps = [
    {
      number: '1',
      title: 'Buy VBK Tokens',
      description: 'Purchase VaultBrick tokens starting from €100 directly with ETH or USDC',
    },
    {
      number: '2',
      title: 'Automatic Staking',
      description: 'Your tokens are automatically staked to earn from our real estate portfolio',
    },
    {
      number: '3',
      title: 'Monthly Returns',
      description: 'Receive income distributions on the 15th of each month in stablecoins',
    },
    {
      number: '4',
      title: 'Future Access',
      description: 'Get priority access to property NFTs and advanced investment features',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="hero-title text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Real Estate Investment{' '}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Starts Here
                </span>
              </h1>
              
              <p className="hero-subtitle text-xl text-gray-300 mb-8 max-w-2xl">
                Buy VaultBrick (VBK) tokens and earn monthly income from our professionally managed 
                real estate portfolio. Start with just €100.
              </p>

              <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="#buy-vbk"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Buy VBK Tokens
                </a>
                
                {isConnected ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center px-8 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200"
                  >
                    View Dashboard
                  </Link>
                ) : (
                  <button className="inline-flex items-center px-8 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200">
                    Connect Wallet
                  </button>
                )}
              </div>

              {/* User Stats (if connected) */}
              {isConnected && (
                <div className="mt-8 flex justify-center lg:justify-start space-x-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {formatTokenAmount(vbkBalance)}
                    </div>
                    <div className="text-sm text-gray-400">VBK Balance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{nftCount}</div>
                    <div className="text-sm text-gray-400">Property NFTs</div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Cards */}
            <div className="relative h-96 lg:h-[500px]">
              <div className="floating-card absolute top-12 left-8 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 max-w-xs">
                <h4 className="text-lg font-semibold text-white mb-2">VaultBrick (VBK)</h4>
                <p className="text-gray-300 mb-2">€1.00 per token</p>
                <small className="text-gray-400">Monthly Distributions</small>
              </div>

              <div className="floating-card absolute top-32 right-4 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 max-w-xs">
                <h4 className="text-lg font-semibold text-white mb-2">Monthly Income</h4>
                <p className="text-gray-300 mb-2">15th of each month</p>
                <small className="text-gray-400">Automatic Distribution</small>
              </div>

              <div className="floating-card absolute bottom-16 left-16 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 max-w-xs">
                <h4 className="text-lg font-semibold text-white mb-2">Real Estate</h4>
                <p className="text-gray-300 mb-2">Professional Management</p>
                <small className="text-gray-400">Estonian Company</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">
                  {stat.prefix}
                  <span 
                    className="stat-number"
                    data-value={stat.value}
                  >
                    0
                  </span>
                  {stat.suffix}
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VBK Sales Widget */}
      <section id="buy-vbk" ref={salesRef} className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sales-widget">
            <VBKSalesWidget />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-20 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose VaultBrick
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Experience the future of real estate investment through blockchain technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="feature-card bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400">
              Start earning from real estate in 4 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <div key={step.number} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase 2 Teaser */}
      <section className="py-20 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Coming Soon: Property NFTs
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
              VBK token holders will get priority access to our upcoming property NFT marketplace, 
              where you can own specific fractions of individual properties starting at €2,000 per share.
            </p>
            <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">€2,000</div>
                  <div className="text-gray-400 text-sm">Per NFT Share</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400 mb-2">1,000</div>
                  <div className="text-gray-400 text-sm">NFTs Available</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400 mb-2">€2M</div>
                  <div className="text-gray-400 text-sm">First Property</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Start Your Real Estate Journey Today
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of investors earning monthly income from professional real estate management
          </p>
          <a
            href="#buy-vbk"
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Buy VBK Tokens Now
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Monthly distributions • Professional management • Estonian company
          </p>
        </div>
      </section>
    </div>
  );
};
