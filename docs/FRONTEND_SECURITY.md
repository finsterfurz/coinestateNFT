# Frontend Security Hardening Guide

## 🚨 Critical Vulnerabilities to Fix

### 1. Smart Contract Address Validation
**Problem**: Environment variables can be changed, redirecting transactions to malicious contracts.

**Solution**: Hardcode critical contract addresses and validate them:

```typescript
// Secure contract address handling
const VERIFIED_CONTRACTS = {
  VBK_MAINNET: '0x1234...', // Hardcoded verified addresses
  VBK_GOERLI: '0x5678...',
  PROPERTY_NFT_MAINNET: '0x9abc...',
};

const getContractAddress = (contractName: string, chainId: number) => {
  const key = `${contractName}_${chainId === 1 ? 'MAINNET' : 'GOERLI'}`;
  const address = VERIFIED_CONTRACTS[key];
  
  if (!address) {
    throw new Error(`No verified contract for ${contractName} on chain ${chainId}`);
  }
  
  return address;
};
```

### 2. Transaction Amount Validation
**Problem**: Users could be tricked into sending more ETH than intended.

**Solution**: Add strict validation:

```typescript
const handlePurchase = async () => {
  // Validate input amount
  const amountNum = parseFloat(amount);
  if (amountNum <= 0 || amountNum > 10000) {
    throw new Error('Invalid purchase amount');
  }
  
  // Validate contract response matches expectation
  const expectedPrice = await contract.VBK_PRICE_EUR();
  const actualCost = purchaseAmount * expectedPrice;
  
  if (Math.abs(actualCost - purchaseAmount) > 0.01) {
    throw new Error('Price mismatch detected - possible attack');
  }
  
  // Proceed with transaction
};
```

### 3. Content Security Policy (CSP)
**Problem**: XSS attacks can inject malicious scripts.

**Solution**: Add CSP headers:

```html
<!-- Add to index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               connect-src 'self' https://mainnet.infura.io https://goerli.infura.io;">
```

### 4. Input Sanitization
**Problem**: User inputs and API responses could contain malicious content.

**Solution**: Sanitize all inputs:

```typescript
import DOMPurify from 'dompurify';

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input);
};

// Use for all user inputs and API responses
const displayValue = sanitizeInput(salesMetrics.totalSold);
```

### 5. Wallet Connection Security
**Problem**: Fake wallet prompts can steal private keys.

**Solution**: Add wallet verification:

```typescript
const verifyWalletConnection = async () => {
  // Check if MetaMask is the real extension
  if (!window.ethereum?.isMetaMask) {
    throw new Error('Please use MetaMask wallet');
  }
  
  // Verify the connected network
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (parseInt(chainId, 16) !== SUPPORTED_CHAIN_ID) {
    throw new Error(`Please switch to ${SUPPORTED_CHAIN_ID === 1 ? 'Mainnet' : 'Goerli'}`);
  }
  
  // Verify account ownership with signature
  const message = `Verify ownership: ${Date.now()}`;
  const signature = await signer.signMessage(message);
  // Verify signature matches connected account
};
```

### 6. Environment Variable Security
**Problem**: Sensitive config exposed in frontend.

**Solution**: Use runtime configuration:

```typescript
// Instead of process.env in frontend, fetch from secure API
const getConfig = async () => {
  const response = await fetch('/api/config', {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to load configuration');
  }
  
  return response.json();
};
```

### 7. Dependency Security
**Problem**: Malicious packages in node_modules.

**Solution**: Regular security audits:

```bash
# Run security audits
npm audit
npm audit fix

# Use exact versions (no ^ or ~)
"ethers": "6.4.0", // Not "^6.4.0"

# Monitor for vulnerabilities
npm install -g npm-check-updates
ncu --doctor
```

### 8. Hosting Security
**Problem**: Compromised hosting can inject malicious code.

**Solution**: Use secure hosting practices:

```yaml
# Vercel/Netlify security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## 🛡️ Advanced Security Measures

### 1. Subresource Integrity (SRI)
```html
<!-- Verify CDN resources -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.4.0/ethers.min.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

### 2. Transaction Simulation
```typescript
// Simulate transaction before executing
const simulateTransaction = async (txData) => {
  const simulation = await provider.call({
    to: txData.to,
    data: txData.data,
    value: txData.value,
  });
  
  // Verify expected outcome
  if (simulation.success !== true) {
    throw new Error('Transaction simulation failed');
  }
};
```

### 3. Multi-Signature Validation
```typescript
// For high-value transactions, require multiple confirmations
const requireMultiSig = async (amount: bigint) => {
  if (amount > ethers.parseEther('10')) {
    // Require additional confirmation
    const confirmed = await showMultiSigDialog();
    if (!confirmed) {
      throw new Error('Multi-signature required for large transactions');
    }
  }
};
```

### 4. Rate Limiting
```typescript
// Prevent rapid-fire transactions
const rateLimiter = {
  lastTransaction: 0,
  minInterval: 5000, // 5 seconds
  
  checkLimit() {
    const now = Date.now();
    if (now - this.lastTransaction < this.minInterval) {
      throw new Error('Please wait before making another transaction');
    }
    this.lastTransaction = now;
  }
};
```

## 🚨 Emergency Response Plan

### If Your Site Gets Compromised:

1. **Immediate Actions**:
   - Take website offline immediately
   - Disable all smart contract interactions
   - Alert users via social media/email
   - Contact hosting provider

2. **Damage Assessment**:
   - Check smart contract balances
   - Review transaction logs
   - Identify affected users
   - Document the attack vector

3. **Recovery Process**:
   - Fix security vulnerability
   - Deploy to new domain if needed
   - Implement additional security measures
   - Gradually restore service with monitoring

4. **User Communication**:
   - Transparent disclosure of what happened
   - Instructions for users to protect themselves
   - Timeline for service restoration
   - Compensation plan if applicable

## 📋 Security Checklist

### Before Deployment:
- [ ] All smart contract addresses verified and hardcoded
- [ ] CSP headers implemented
- [ ] Input sanitization in place
- [ ] Dependency audit completed
- [ ] Transaction validation logic tested
- [ ] Rate limiting implemented
- [ ] Error handling doesn't leak sensitive info
- [ ] Environment variables secured
- [ ] SRI hashes for external resources
- [ ] Security headers configured

### Ongoing Monitoring:
- [ ] Regular dependency updates
- [ ] Transaction monitoring and alerts
- [ ] User behavior analysis
- [ ] Smart contract interaction logs
- [ ] Domain/DNS monitoring
- [ ] CDN integrity checks

---

**Remember**: Frontend security is only as strong as its weakest link. Even one vulnerability can compromise the entire platform and lead to significant financial losses for users.
