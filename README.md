# CoinEstate Platform

**Fractional Real Estate Investment through Blockchain Technology**

CoinEstate enables fractional real estate ownership through NFTs, powered by VaultBrick (VBK) tokens. Investors can own property shares starting at €2,000 and earn passive income through automated stablecoin distributions.

## 🏗️ Project Overview

- **Token**: VaultBrick (VBK) - ERC20, capped at 2.5M, pegged to €1
- **NFTs**: Fractional ownership of real-world properties
- **Target**: €2M initial capital through 1,000 NFTs at €2,000 each
- **Legal**: Estonian company structure
- **Returns**: Stablecoin distributions tied to property income

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript
- **GSAP** for animations
- **Web3.js/Ethers.js** for blockchain interaction
- **Tailwind CSS** for styling

### Smart Contracts
- **Solidity** for ERC20 and ERC721 contracts
- **Hardhat** development environment
- **OpenZeppelin** security standards
- **Ethereum** mainnet/Layer 2 deployment

### Backend
- **Node.js** with Express
- **PostgreSQL** for user data
- **Redis** for caching
- **IPFS** for NFT metadata storage

## 📁 Project Structure

```
coinestate-platform/
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── utils/      # Utility functions
│   │   └── styles/     # CSS and styling
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
- MetaMask wallet
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/coinestate-platform.git
cd coinestate-platform
```

2. **Install dependencies**
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Smart contracts
cd ../contracts
npm install
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
# Terminal 1: Frontend
cd frontend
npm start

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Local blockchain (optional)
cd contracts
npx hardhat node
```

## 📋 Development Workflow

### Smart Contract Development
```bash
cd contracts
npx hardhat compile
npx hardhat test
npx hardhat deploy --network localhost
```

### Frontend Development
```bash
cd frontend
npm start          # Development server
npm run build      # Production build
npm run test       # Run tests
```

### Backend Development
```bash
cd backend
npm run dev        # Development with hot reload
npm run test       # Run API tests
npm run migrate    # Database migrations
```

## 🔐 Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_CHAIN_ID=1
REACT_APP_VBK_CONTRACT_ADDRESS=
REACT_APP_PROPERTY_NFT_CONTRACT_ADDRESS=
REACT_APP_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

### Backend (.env)
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/coinestate
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
```

### Contracts (.env)
```
PRIVATE_KEY=your_private_key
INFURA_PROJECT_ID=your_infura_id
ETHERSCAN_API_KEY=your_etherscan_key
```

## 📊 Token Economics

- **VaultBrick (VBK)**: €1 pegged ERC20 token
- **Total Supply**: 2.5M VBK (capped)
- **NFT Price**: €2,000 per property share
- **Target Raise**: €2M (1,000 NFTs)
- **Property Purchase**: €1.4-1.5M per property
- **Income Distribution**: Automated stablecoin payouts

## 🧪 Testing

### Smart Contract Tests
```bash
cd contracts
npx hardhat test
npx hardhat coverage
```

### Frontend Tests
```bash
cd frontend
npm run test
npm run test:coverage
```

### Backend Tests
```bash
cd backend
npm run test
npm run test:e2e
```

## 🚢 Deployment

### Smart Contracts
```bash
cd contracts
npx hardhat deploy --network mainnet
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS
```

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy build/ directory
```

### Backend (Railway/Heroku)
```bash
cd backend
# Configure production environment
# Deploy via platform-specific methods
```

## 📚 Documentation

- [Smart Contract Documentation](./docs/contracts.md)
- [API Documentation](./docs/api.md)
- [Frontend Components](./docs/frontend.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## ⚖️ Legal & Compliance

- Estonian company incorporation
- EU securities compliance
- Anti-money laundering (AML) procedures
- Know Your Customer (KYC) requirements
- Property ownership transparency

## 📞 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/coinestate-platform/issues)
- **Discord**: [CoinEstate Community](#)
- **Email**: support@coinestate.io

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**⚠️ Investment Disclaimer**: This platform facilitates real estate investment opportunities. All investments carry risk. Please conduct your own research and consult with financial advisors before investing.
