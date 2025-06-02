# CoinEstate Platform

**Blockchain-based Real Estate Investment Platform**

A modern platform enabling fractional real estate ownership through blockchain technology. Built with React, Node.js, and Solidity smart contracts.

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript
- **GSAP** for animations
- **Web3.js** for blockchain interaction
- **Tailwind CSS** for styling

### Smart Contracts
- **Solidity** for ERC20 and ERC721 contracts
- **Hardhat** development environment
- **OpenZeppelin** security standards
- **Ethereum** compatible networks

### Backend
- **Node.js** with Express
- **PostgreSQL** for data storage
- **Redis** for caching
- **IPFS** for metadata storage

## 📁 Project Structure

```
coinestate-platform/
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Page components
│   │   ├── hooks/      # Custom React hooks
│   │   └── utils/      # Utility functions
│   └── public/         # Static assets
├── contracts/          # Smart contracts
│   ├── contracts/      # Solidity files
│   ├── test/          # Contract tests
│   └── scripts/       # Deployment scripts
├── backend/           # API server
│   └── src/           # Backend source code
└── docs/              # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/finsterfurz/coinestate-platform.git
cd coinestate-platform
```

2. **Install dependencies**
```bash
# Install all dependencies
npm run install:all

# Or install individually
cd frontend && npm install
cd ../backend && npm install
cd ../contracts && npm install
```

3. **Environment setup**
```bash
# Copy environment files
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp contracts/.env.example contracts/.env
```

4. **Start development servers**
```bash
# Start all services
npm run dev

# Or start individually
npm run dev:frontend  # React app (port 3000)
npm run dev:backend   # API server (port 3001)
npm run dev:contracts # Local blockchain
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Test individually
npm run test:frontend
npm run test:backend
npm run test:contracts
```

## 🏗️ Building

```bash
# Build for production
npm run build

# Build individually
npm run build:frontend
npm run build:contracts
```

## 📋 Available Scripts

```bash
# Development
npm run dev                    # Start all services
npm run install:all           # Install all dependencies

# Testing
npm run test                  # Run all tests
npm run test:contracts        # Smart contract tests

# Building
npm run build                 # Build all components
npm run lint                  # Lint all code

# Deployment
npm run deploy:contracts:localhost  # Deploy to local network
npm run deploy:contracts:goerli    # Deploy to testnet
```

## 🔧 Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_CHAIN_ID=1
REACT_APP_VBK_CONTRACT_ADDRESS=
REACT_APP_PROPERTY_NFT_CONTRACT_ADDRESS=
```

### Backend (.env)
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/coinestate
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
```

### Contracts (.env)
```
PRIVATE_KEY=your_private_key
INFURA_PROJECT_ID=your_infura_id
ETHERSCAN_API_KEY=your_etherscan_key
```

## 📚 Documentation

- [Smart Contract Documentation](./docs/contracts.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Architecture

The platform consists of three main components:

- **Smart Contracts**: ERC20 tokens and ERC721 NFTs for ownership representation
- **Frontend Application**: React-based user interface with Web3 integration
- **Backend API**: Node.js server for data management and automation

## 🛡️ Security

- Smart contracts follow OpenZeppelin standards
- Comprehensive test coverage
- Regular security audits recommended
- Environment variables for sensitive data

---

**Note**: This is a development platform. Ensure proper security audits and legal compliance before production deployment.
