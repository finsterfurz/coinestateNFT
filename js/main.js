// CoinEstate Platform JavaScript
// Enhanced functionality for wallet connection, investment flow, and user experience

class CoinEstateApp {
    constructor() {
        this.walletConnected = false;
        this.currentAccount = null;
        this.web3 = null;
        this.contracts = {};
        this.investmentStep = 0;
        this.investmentData = {};
        
        this.init();
    }

    async init() {
        this.initializeEventListeners();
        this.initializeAnimations();
        this.checkWalletConnection();
        this.initializeCalculator();
        this.initializeInvestmentFlow();
    }

    // ========================
    // WALLET FUNCTIONALITY
    // ========================

    async checkWalletConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_accounts'
                });
                
                if (accounts.length > 0) {
                    this.walletConnected = true;
                    this.currentAccount = accounts[0];
                    this.updateWalletUI();
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }
        }
    }

    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            this.showNotification('Please install MetaMask or another Web3 wallet', 'error');
            return false;
        }

        try {
            // Show loading state
            this.showLoadingState('Connecting wallet...');

            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length > 0) {
                this.walletConnected = true;
                this.currentAccount = accounts[0];
                this.updateWalletUI();
                this.showNotification('Wallet connected successfully!', 'success');
                
                // Check if user is on correct network
                await this.checkNetwork();
                
                return true;
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.showNotification('Failed to connect wallet', 'error');
            return false;
        } finally {
            this.hideLoadingState();
        }
    }

    async checkNetwork() {
        try {
            const chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });

            // Polygon Mainnet (137) or Ethereum Mainnet (1)
            const supportedChains = ['0x89', '0x1'];
            
            if (!supportedChains.includes(chainId)) {
                this.showNotification('Please switch to Ethereum or Polygon network', 'warning');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking network:', error);
            return false;
        }
    }

    updateWalletUI() {
        const walletButtons = document.querySelectorAll('.wallet-connect');
        const walletInfo = document.querySelectorAll('.wallet-info');
        
        walletButtons.forEach(btn => {
            if (this.walletConnected) {
                btn.textContent = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
                btn.classList.add('connected');
            } else {
                btn.textContent = 'Connect Wallet';
                btn.classList.remove('connected');
            }
        });

        // Show/hide wallet-dependent features
        const investmentSections = document.querySelectorAll('.requires-wallet');
        investmentSections.forEach(section => {
            section.style.display = this.walletConnected ? 'block' : 'none';
        });
    }

    // ========================
    // ENHANCED CALCULATOR
    // ========================

    initializeCalculator() {
        // Sync sliders with inputs
        this.syncSliderInput('investmentSlider', 'investmentAmount');
        this.syncSliderInput('periodSlider', 'investmentPeriod');
        this.syncSliderInput('yieldSlider', 'expectedYield');

        // Add risk scenario buttons
        this.addRiskScenarioButtons();
        
        // Update calculator initially
        this.updateCalculator();
    }

    syncSliderInput(sliderId, inputId) {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        
        if (!slider || !input) return;
        
        slider.addEventListener('input', () => {
            input.value = slider.value;
            this.updateCalculator();
        });
        
        input.addEventListener('input', () => {
            slider.value = input.value;
            this.updateCalculator();
        });
    }

    addRiskScenarioButtons() {
        const calculatorContainer = document.querySelector('.calculator-inputs');
        if (!calculatorContainer) return;

        const scenarioContainer = document.createElement('div');
        scenarioContainer.className = 'scenario-buttons';
        scenarioContainer.innerHTML = `
            <label class="input-label">Risk Scenarios</label>
            <div class="scenario-grid">
                <button type="button" class="scenario-btn" data-scenario="conservative">
                    Conservative (4%)
                </button>
                <button type="button" class="scenario-btn active" data-scenario="moderate">
                    Moderate (6%)
                </button>
                <button type="button" class="scenario-btn" data-scenario="optimistic">
                    Optimistic (8%)
                </button>
            </div>
        `;

        calculatorContainer.appendChild(scenarioContainer);

        // Add event listeners
        scenarioContainer.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                scenarioContainer.querySelectorAll('.scenario-btn').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');

                // Update yield based on scenario
                const scenario = e.target.dataset.scenario;
                const yieldRates = {
                    conservative: 4,
                    moderate: 6,
                    optimistic: 8
                };

                const yieldSlider = document.getElementById('yieldSlider');
                const yieldInput = document.getElementById('expectedYield');
                
                if (yieldSlider && yieldInput) {
                    yieldSlider.value = yieldRates[scenario];
                    yieldInput.value = yieldRates[scenario];
                    this.updateCalculator();
                }
            });
        });
    }

    updateCalculator() {
        const investment = parseFloat(document.getElementById('investmentAmount')?.value) || 0;
        const period = parseFloat(document.getElementById('investmentPeriod')?.value) || 1;
        const yieldRate = parseFloat(document.getElementById('expectedYield')?.value) || 6;
        
        const nftShares = Math.floor(investment / 1000);
        const annualIncome = investment * (yieldRate / 100);
        const monthlyIncome = annualIncome / 12;
        const totalReturn = investment + (annualIncome * period);

        // Update display elements
        this.updateElement('nftShares', nftShares);
        this.updateElement('monthlyIncome', `€${Math.round(monthlyIncome)}`);
        this.updateElement('annualIncome', `€${Math.round(annualIncome)}`);
        this.updateElement('totalReturn', `€${Math.round(totalReturn).toLocaleString()}`);

        // Add investment breakdown
        this.updateInvestmentBreakdown(investment, nftShares, yieldRate);
    }

    updateInvestmentBreakdown(investment, nftShares, yieldRate) {
        const breakdownContainer = document.querySelector('.investment-breakdown');
        if (!breakdownContainer) return;

        const propertyValue = 1795000; // €1.795M
        const totalNFTs = 2500;
        const ownershipPercentage = (nftShares / totalNFTs * 100).toFixed(4);
        const propertyShare = (investment / 2500000 * propertyValue).toFixed(0);

        breakdownContainer.innerHTML = `
            <h4>Your Investment Breakdown</h4>
            <div class="breakdown-grid">
                <div class="breakdown-item">
                    <span class="breakdown-label">Property Ownership</span>
                    <span class="breakdown-value">${ownershipPercentage}%</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Property Value Share</span>
                    <span class="breakdown-value">€${parseInt(propertyShare).toLocaleString()}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">Annual Yield Rate</span>
                    <span class="breakdown-value">${yieldRate}%</span>
                </div>
            </div>
        `;
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // ========================
    // INVESTMENT FLOW
    // ========================

    initializeInvestmentFlow() {
        // Create investment flow modal
        this.createInvestmentModal();
        
        // Add click handlers for investment buttons
        document.querySelectorAll('.primary-cta, .start-investing').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startInvestmentFlow();
            });
        });
    }

    createInvestmentModal() {
        const modal = document.createElement('div');
        modal.className = 'investment-modal';
        modal.id = 'investmentModal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="coinEstate.closeInvestmentModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Investment Process</h2>
                    <button class="modal-close" onclick="coinEstate.closeInvestmentModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="investment-steps">
                        <div class="step-indicator">
                            <div class="step active" data-step="1">1</div>
                            <div class="step" data-step="2">2</div>
                            <div class="step" data-step="3">3</div>
                            <div class="step" data-step="4">4</div>
                        </div>
                        <div class="step-content" id="stepContent">
                            <!-- Dynamic content will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async startInvestmentFlow() {
        // Check wallet connection first
        if (!this.walletConnected) {
            const connected = await this.connectWallet();
            if (!connected) return;
        }

        this.investmentStep = 1;
        this.showInvestmentModal();
        this.updateInvestmentStep();
    }

    showInvestmentModal() {
        const modal = document.getElementById('investmentModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeInvestmentModal() {
        const modal = document.getElementById('investmentModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.investmentStep = 0;
    }

    updateInvestmentStep() {
        const stepContent = document.getElementById('stepContent');
        const stepIndicators = document.querySelectorAll('.step');
        
        // Update step indicators
        stepIndicators.forEach((step, index) => {
            step.classList.toggle('active', index + 1 <= this.investmentStep);
            step.classList.toggle('completed', index + 1 < this.investmentStep);
        });

        // Update step content
        switch (this.investmentStep) {
            case 1:
                stepContent.innerHTML = this.getStepOneContent();
                break;
            case 2:
                stepContent.innerHTML = this.getStepTwoContent();
                break;
            case 3:
                stepContent.innerHTML = this.getStepThreeContent();
                break;
            case 4:
                stepContent.innerHTML = this.getStepFourContent();
                break;
        }
    }

    getStepOneContent() {
        return `
            <div class="step-content-wrapper">
                <h3>Choose Your Investment</h3>
                <p>Select the number of NFTs you want to purchase (€1,000 each)</p>
                
                <div class="investment-selector">
                    <label>Number of NFTs</label>
                    <div class="nft-selector">
                        <button class="nft-btn" onclick="coinEstate.selectNFTAmount(1)">1 NFT<br><span>€1,000</span></button>
                        <button class="nft-btn" onclick="coinEstate.selectNFTAmount(5)">5 NFTs<br><span>€5,000</span></button>
                        <button class="nft-btn" onclick="coinEstate.selectNFTAmount(10)">10 NFTs<br><span>€10,000</span></button>
                        <button class="nft-btn custom" onclick="coinEstate.showCustomAmount()">Custom</button>
                    </div>
                    
                    <div class="custom-amount" id="customAmount" style="display: none;">
                        <input type="number" id="customNFTAmount" min="1" max="100" placeholder="Enter amount">
                        <button onclick="coinEstate.selectCustomAmount()">Select</button>
                    </div>
                </div>

                <div class="investment-summary" id="investmentSummary" style="display: none;">
                    <h4>Investment Summary</h4>
                    <div class="summary-item">
                        <span>NFTs:</span>
                        <span id="selectedNFTs">-</span>
                    </div>
                    <div class="summary-item">
                        <span>Total Investment:</span>
                        <span id="selectedAmount">-</span>
                    </div>
                    <div class="summary-item">
                        <span>Property Ownership:</span>
                        <span id="selectedOwnership">-</span>
                    </div>
                    <div class="summary-item">
                        <span>Est. Monthly Income:</span>
                        <span id="selectedIncome">-</span>
                    </div>
                </div>

                <div class="step-actions">
                    <button class="btn btn-primary" onclick="coinEstate.nextStep()" id="continueBtn" disabled>
                        Continue to KYC
                    </button>
                </div>
            </div>
        `;
    }

    getStepTwoContent() {
        return `
            <div class="step-content-wrapper">
                <h3>Identity Verification (KYC)</h3>
                <p>Please provide the required information for regulatory compliance</p>
                
                <form class="kyc-form" id="kycForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="firstName" required>
                        </div>
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="lastName" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Email Address *</label>
                            <input type="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label>Phone Number *</label>
                            <input type="tel" name="phone" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Country of Residence *</label>
                        <select name="country" required>
                            <option value="">Select Country</option>
                            <option value="DE">Germany</option>
                            <option value="AT">Austria</option>
                            <option value="CH">Switzerland</option>
                            <option value="NL">Netherlands</option>
                            <option value="FR">France</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="compliance-checks">
                        <label class="checkbox-label">
                            <input type="checkbox" name="accreditedInvestor" required>
                            <span class="checkmark"></span>
                            I confirm I am an accredited investor or meet minimum investment criteria
                        </label>
                        
                        <label class="checkbox-label">
                            <input type="checkbox" name="riskAcknowledgment" required>
                            <span class="checkmark"></span>
                            I understand the risks associated with real estate investment
                        </label>
                        
                        <label class="checkbox-label">
                            <input type="checkbox" name="termsAccepted" required>
                            <span class="checkmark"></span>
                            I agree to the Terms of Service and Privacy Policy
                        </label>
                    </div>
                </form>

                <div class="step-actions">
                    <button class="btn btn-secondary" onclick="coinEstate.previousStep()">
                        Back
                    </button>
                    <button class="btn btn-primary" onclick="coinEstate.submitKYC()">
                        Verify Information
                    </button>
                </div>
            </div>
        `;
    }

    getStepThreeContent() {
        return `
            <div class="step-content-wrapper">
                <h3>Payment Method</h3>
                <p>Choose how you'd like to complete your investment</p>
                
                <div class="payment-methods">
                    <div class="payment-option crypto" onclick="coinEstate.selectPayment('crypto')">
                        <div class="payment-icon">₿</div>
                        <h4>Cryptocurrency</h4>
                        <p>Pay with ETH, USDC, or USDT</p>
                        <span class="payment-badge">Instant</span>
                    </div>
                    
                    <div class="payment-option bank" onclick="coinEstate.selectPayment('bank')">
                        <div class="payment-icon">🏦</div>
                        <h4>Bank Transfer</h4>
                        <p>SEPA transfer (EU only)</p>
                        <span class="payment-badge">1-3 days</span>
                    </div>
                    
                    <div class="payment-option card" onclick="coinEstate.selectPayment('card')">
                        <div class="payment-icon">💳</div>
                        <h4>Credit Card</h4>
                        <p>Visa, Mastercard accepted</p>
                        <span class="payment-badge">Instant</span>
                    </div>
                </div>

                <div class="payment-details" id="paymentDetails" style="display: none;">
                    <!-- Payment-specific content will be inserted here -->
                </div>

                <div class="step-actions">
                    <button class="btn btn-secondary" onclick="coinEstate.previousStep()">
                        Back
                    </button>
                    <button class="btn btn-primary" onclick="coinEstate.processPayment()" id="paymentBtn" disabled>
                        Process Payment
                    </button>
                </div>
            </div>
        `;
    }

    getStepFourContent() {
        return `
            <div class="step-content-wrapper success">
                <div class="success-icon">✅</div>
                <h3>Investment Successful!</h3>
                <p>Congratulations! Your NFTs have been minted and sent to your wallet.</p>
                
                <div class="success-details">
                    <div class="detail-item">
                        <span>Transaction Hash:</span>
                        <span class="transaction-hash">0x1234...5678</span>
                    </div>
                    <div class="detail-item">
                        <span>NFTs Purchased:</span>
                        <span>${this.investmentData.nftAmount || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span>Total Investment:</span>
                        <span>€${(this.investmentData.nftAmount * 1000 || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div class="next-steps">
                    <h4>What's Next?</h4>
                    <ul>
                        <li>Your NFTs will appear in your wallet within 24 hours</li>
                        <li>Property acquisition process will begin once funding goal is reached</li>
                        <li>Monthly income distributions will start after property is rented</li>
                        <li>You'll receive email updates on property progress</li>
                    </ul>
                </div>

                <div class="step-actions">
                    <button class="btn btn-primary" onclick="coinEstate.closeInvestmentModal()">
                        Complete
                    </button>
                    <button class="btn btn-secondary" onclick="coinEstate.downloadReceipt()">
                        Download Receipt
                    </button>
                </div>
            </div>
        `;
    }

    // Investment flow methods
    selectNFTAmount(amount) {
        this.investmentData.nftAmount = amount;
        this.updateInvestmentSummary();
        
        // Update UI
        document.querySelectorAll('.nft-btn').forEach(btn => btn.classList.remove('selected'));
        event.target.classList.add('selected');
        
        document.getElementById('continueBtn').disabled = false;
    }

    showCustomAmount() {
        document.getElementById('customAmount').style.display = 'block';
        document.querySelectorAll('.nft-btn').forEach(btn => btn.classList.remove('selected'));
        event.target.classList.add('selected');
    }

    selectCustomAmount() {
        const amount = parseInt(document.getElementById('customNFTAmount').value);
        if (amount >= 1 && amount <= 100) {
            this.selectNFTAmount(amount);
            document.getElementById('customAmount').style.display = 'none';
        } else {
            this.showNotification('Please enter a valid amount (1-100 NFTs)', 'error');
        }
    }

    updateInvestmentSummary() {
        const amount = this.investmentData.nftAmount || 0;
        const totalCost = amount * 1000;
        const ownership = (amount / 2500 * 100).toFixed(4);
        const monthlyIncome = (totalCost * 0.06 / 12).toFixed(0);

        document.getElementById('selectedNFTs').textContent = amount;
        document.getElementById('selectedAmount').textContent = `€${totalCost.toLocaleString()}`;
        document.getElementById('selectedOwnership').textContent = `${ownership}%`;
        document.getElementById('selectedIncome').textContent = `€${monthlyIncome}`;
        
        document.getElementById('investmentSummary').style.display = 'block';
    }

    nextStep() {
        this.investmentStep++;
        this.updateInvestmentStep();
    }

    previousStep() {
        this.investmentStep--;
        this.updateInvestmentStep();
    }

    async submitKYC() {
        const form = document.getElementById('kycForm');
        const formData = new FormData(form);
        
        // Validate form
        if (!form.checkValidity()) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Store KYC data
        this.investmentData.kyc = Object.fromEntries(formData);
        
        // Simulate API call
        this.showLoadingState('Verifying information...');
        
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.nextStep();
            this.showNotification('Information verified successfully', 'success');
        } catch (error) {
            this.showNotification('Verification failed. Please try again.', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    selectPayment(method) {
        this.investmentData.paymentMethod = method;
        
        // Update UI
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
        event.target.classList.add('selected');
        
        // Show payment details
        this.showPaymentDetails(method);
        document.getElementById('paymentBtn').disabled = false;
    }

    showPaymentDetails(method) {
        const detailsContainer = document.getElementById('paymentDetails');
        
        switch (method) {
            case 'crypto':
                detailsContainer.innerHTML = `
                    <div class="crypto-payment">
                        <h4>Cryptocurrency Payment</h4>
                        <select id="cryptoToken">
                            <option value="USDC">USDC</option>
                            <option value="USDT">USDT</option>
                            <option value="ETH">ETH</option>
                        </select>
                        <p>You will be prompted to approve the transaction in your wallet.</p>
                    </div>
                `;
                break;
            case 'bank':
                detailsContainer.innerHTML = `
                    <div class="bank-payment">
                        <h4>Bank Transfer</h4>
                        <p>Transfer details will be provided after confirmation.</p>
                        <div class="bank-notice">
                            <strong>Note:</strong> SEPA transfers typically take 1-3 business days to process.
                        </div>
                    </div>
                `;
                break;
            case 'card':
                detailsContainer.innerHTML = `
                    <div class="card-payment">
                        <h4>Credit Card Payment</h4>
                        <div class="card-form">
                            <input type="text" placeholder="Card Number" maxlength="19">
                            <div class="card-row">
                                <input type="text" placeholder="MM/YY" maxlength="5">
                                <input type="text" placeholder="CVC" maxlength="3">
                            </div>
                            <input type="text" placeholder="Cardholder Name">
                        </div>
                    </div>
                `;
                break;
        }
        
        detailsContainer.style.display = 'block';
    }

    async processPayment() {
        const method = this.investmentData.paymentMethod;
        
        this.showLoadingState('Processing payment...');
        
        try {
            switch (method) {
                case 'crypto':
                    await this.processCryptoPayment();
                    break;
                case 'bank':
                    await this.processBankPayment();
                    break;
                case 'card':
                    await this.processCardPayment();
                    break;
            }
            
            this.nextStep();
            this.showNotification('Payment successful!', 'success');
        } catch (error) {
            this.showNotification('Payment failed. Please try again.', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    async processCryptoPayment() {
        // Simulate crypto payment
        const amount = this.investmentData.nftAmount * 1000;
        const token = document.getElementById('cryptoToken')?.value || 'USDC';
        
        // In real implementation, this would interact with smart contracts
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    async processBankPayment() {
        // Generate bank transfer instructions
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    async processCardPayment() {
        // Process card payment via Stripe or similar
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    downloadReceipt() {
        // Generate and download investment receipt
        const receiptData = {
            investmentId: 'CE-' + Date.now(),
            nftAmount: this.investmentData.nftAmount,
            totalAmount: this.investmentData.nftAmount * 1000,
            date: new Date().toISOString(),
            investor: this.investmentData.kyc
        };
        
        const receipt = `
            COINESTATE INVESTMENT RECEIPT
            ============================
            
            Investment ID: ${receiptData.investmentId}
            Date: ${new Date(receiptData.date).toLocaleDateString()}
            
            Investor: ${receiptData.investor?.firstName} ${receiptData.investor?.lastName}
            Email: ${receiptData.investor?.email}
            
            Investment Details:
            - NFTs Purchased: ${receiptData.nftAmount}
            - Total Amount: €${receiptData.totalAmount.toLocaleString()}
            - Property: Kamp-Lintfort Mixed-Use Building
            
            This receipt serves as proof of your investment in CoinEstate.
        `;
        
        const blob = new Blob([receipt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CoinEstate_Receipt_${receiptData.investmentId}.txt`;
        a.click();
    }

    // ========================
    // EMAIL & API INTEGRATION
    // ========================

    async handleEmailSignup(event) {
        event.preventDefault();
        
        const email = event.target.querySelector('input[type="email"]').value;
        
        // Enhanced email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('Please enter a valid email address.', 'error');
            return;
        }

        this.showLoadingState('Subscribing...');
        
        try {
            // In real implementation, this would call your backend API
            await this.submitEmailToAPI(email);
            
            this.showNotification('Thank you! You\'ve been added to our early access list.', 'success');
            event.target.reset();
        } catch (error) {
            this.showNotification('Failed to subscribe. Please try again.', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    async submitEmailToAPI(email) {
        // Simulated API call - replace with real endpoint
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email,
                source: 'landing_page',
                timestamp: new Date().toISOString()
            }),
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        return response.json();
    }

    // ========================
    // UI HELPERS
    // ========================

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);

        // Add entrance animation
        setTimeout(() => notification.classList.add('show'), 100);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    showLoadingState(message = 'Loading...') {
        const loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'global-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(loader);
        document.body.style.overflow = 'hidden';
    }

    hideLoadingState() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.remove();
            document.body.style.overflow = '';
        }
    }

    // ========================
    // EVENT LISTENERS
    // ========================

    initializeEventListeners() {
        // Loading screen
        window.addEventListener('load', () => {
            setTimeout(() => {
                const loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => loadingScreen.style.display = 'none', 500);
                }
            }, 1500);
        });

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.getElementById('header');
            if (header) {
                header.classList.toggle('scrolled', window.scrollY > 100);
            }
        });

        // Scroll reveal animations
        window.addEventListener('scroll', () => this.revealOnScroll());
        this.revealOnScroll(); // Initial check

        // FAQ functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('faq-question')) {
                this.toggleFAQ(e.target);
            }
        });

        // Email signup
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('email-capture')) {
                this.handleEmailSignup(e);
            }
        });

        // Smooth scrolling for anchor links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });

        // Mobile menu
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mobile-menu-toggle')) {
                this.toggleMobileMenu();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
        });

        // Wallet connection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('wallet-connect')) {
                e.preventDefault();
                this.connectWallet();
            }
        });
    }

    revealOnScroll() {
        const reveals = document.querySelectorAll('.scroll-reveal');
        
        reveals.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('revealed');
            }
        });
    }

    toggleFAQ(element) {
        const faqItem = element.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        // Close all FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Open clicked item if it wasn't active
        if (!isActive) {
            faqItem.classList.add('active');
        }
    }

    toggleMobileMenu() {
        const nav = document.querySelector('.nav');
        const isVisible = nav.style.display === 'flex';
        
        if (isVisible) {
            nav.style.display = 'none';
        } else {
            nav.style.display = 'flex';
            nav.style.position = 'absolute';
            nav.style.top = '100%';
            nav.style.left = '0';
            nav.style.right = '0';
            nav.style.background = 'var(--primary-900)';
            nav.style.flexDirection = 'column';
            nav.style.padding = '1rem';
            nav.style.borderTop = '1px solid var(--glass-border)';
        }
    }

    handleEscapeKey() {
        // Close any open modals or menus
        document.querySelectorAll('.faq-item.active').forEach(item => {
            item.classList.remove('active');
        });
        
        // Close mobile menu
        const nav = document.querySelector('.nav');
        if (nav.style.display === 'flex') {
            nav.style.display = 'none';
        }
        
        // Close investment modal
        this.closeInvestmentModal();
    }

    handleTabNavigation(e) {
        const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(document.querySelectorAll(focusableElements))
            .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
        
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                e.preventDefault();
            }
        }
    }

    // ========================
    // ANIMATIONS
    // ========================

    initializeAnimations() {
        // Initialize GSAP animations if available
        if (typeof gsap !== 'undefined') {
            this.initializeGSAPAnimations();
        }

        // Intersection Observer for scroll animations
        if ('IntersectionObserver' in window) {
            const animationObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            document.querySelectorAll('.scroll-reveal').forEach(el => {
                animationObserver.observe(el);
            });
        }
    }

    initializeGSAPAnimations() {
        // Hero animation sequence
        const heroTimeline = gsap.timeline();
        heroTimeline
            .from('.hero-badge', { opacity: 0, y: 30, duration: 0.8, delay: 0.2 })
            .from('.hero h1', { opacity: 0, y: 30, duration: 0.8 }, '-=0.6')
            .from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.8 }, '-=0.6')
            .from('.hero-description', { opacity: 0, y: 30, duration: 0.8 }, '-=0.6')
            .from('.hero-cta-group', { opacity: 0, y: 30, duration: 0.8 }, '-=0.6');

        // Trust indicators animation
        gsap.from('.trust-item', {
            opacity: 0,
            y: 50,
            duration: 0.8,
            stagger: 0.2,
            scrollTrigger: {
                trigger: '.trust-section',
                start: 'top 80%'
            }
        });

        // Calculator animation
        gsap.from('.calculator-container', {
            opacity: 0,
            scale: 0.9,
            duration: 1,
            scrollTrigger: {
                trigger: '.calculator-section',
                start: 'top 80%'
            }
        });
    }
}

// Initialize the application
const coinEstate = new CoinEstateApp();

// Make it globally available for inline event handlers
window.coinEstate = coinEstate;
