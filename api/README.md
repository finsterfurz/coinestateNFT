# CoinEstate API Documentation

## Overview
This document outlines the backend API endpoints required for the CoinEstate platform's enhanced functionality.

## Base URL
- **Development**: `http://localhost:3000/api`
- **Staging**: `https://staging-api.coinestate.io/api`
- **Production**: `https://api.coinestate.io/api`

## Authentication
Most endpoints require either:
- **JWT Token** in Authorization header: `Bearer <token>`
- **Wallet Signature** for blockchain operations
- **API Key** for public endpoints

## Endpoints

### 📧 Email & Lead Management

#### Subscribe to Newsletter
```http
POST /subscribe
```

**Request Body:**
```json
{
  "email": "investor@example.com",
  "source": "landing_page",
  "interests": ["real_estate", "nft"],
  "timestamp": "2024-12-20T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed",
  "subscriber_id": "sub_1234567890"
}
```

#### Get Early Access
```http
POST /early-access
```

**Request Body:**
```json
{
  "email": "investor@example.com",
  "investment_interest": 5000,
  "wallet_address": "0x742d35Cc6065C6532C3F2206b4A5F5E64D2fdf47",
  "referral_source": "organic"
}
```

### 👤 User Management & KYC

#### Submit KYC Information
```http
POST /kyc/submit
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "personal_info": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+49123456789",
    "date_of_birth": "1985-03-15",
    "nationality": "DE",
    "country_of_residence": "DE"
  },
  "address": {
    "street": "Musterstraße 123",
    "city": "Berlin",
    "postal_code": "10115",
    "country": "DE"
  },
  "documents": {
    "id_document_type": "passport",
    "id_document_number": "C01X00T476",
    "id_document_expiry": "2030-05-20"
  },
  "compliance": {
    "accredited_investor": true,
    "risk_acknowledgment": true,
    "terms_accepted": true,
    "privacy_policy_accepted": true,
    "marketing_consent": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "kyc_id": "kyc_1234567890",
  "status": "pending_review",
  "estimated_review_time": "24-48 hours",
  "required_documents": [
    "government_id",
    "proof_of_address"
  ]
}
```

#### Check KYC Status
```http
GET /kyc/status/{kyc_id}
```

**Response:**
```json
{
  "kyc_id": "kyc_1234567890",
  "status": "approved",
  "approved_at": "2024-12-20T15:30:00Z",
  "reviewer_notes": "All documents verified successfully",
  "compliance_level": "accredited_investor"
}
```

### 💰 Investment & Payment Processing

#### Create Investment Intent
```http
POST /investment/intent
```

**Request Body:**
```json
{
  "nft_quantity": 5,
  "total_amount": 5000,
  "payment_method": "crypto",
  "payment_token": "USDC",
  "wallet_address": "0x742d35Cc6065C6532C3F2206b4A5F5E64D2fdf47",
  "property_id": "prop_kamp_lintfort_001"
}
```

**Response:**
```json
{
  "success": true,
  "investment_id": "inv_1234567890",
  "payment_details": {
    "payment_method": "crypto",
    "contract_address": "0x1234567890abcdef",
    "amount_required": "5000000000", // USDC with 6 decimals
    "recipient_address": "0x987654321fedcba",
    "expiry_time": "2024-12-20T16:00:00Z"
  },
  "estimated_nft_delivery": "24 hours after payment confirmation"
}
```

#### Process Payment
```http
POST /investment/payment
```

**Request Body:**
```json
{
  "investment_id": "inv_1234567890",
  "transaction_hash": "0xabcdef1234567890...",
  "payment_method": "crypto",
  "payment_token": "USDC",
  "amount_paid": "5000000000"
}
```

**Response:**
```json
{
  "success": true,
  "payment_status": "confirmed",
  "nft_mint_initiated": true,
  "nft_token_ids": [1001, 1002, 1003, 1004, 1005],
  "transaction_receipt": "receipt_1234567890"
}
```

#### Get Investment History
```http
GET /investment/history
```

**Response:**
```json
{
  "investments": [
    {
      "investment_id": "inv_1234567890",
      "property_name": "Kamp-Lintfort Mixed-Use",
      "nft_quantity": 5,
      "total_amount": 5000,
      "payment_date": "2024-12-20T12:00:00Z",
      "nft_token_ids": [1001, 1002, 1003, 1004, 1005],
      "status": "active",
      "current_value": 5150,
      "total_distributions": 245.50
    }
  ],
  "total_invested": 5000,
  "total_current_value": 5150,
  "total_income_received": 245.50
}
```

### 🏠 Property Information

#### Get Property Details
```http
GET /property/{property_id}
```

**Response:**
```json
{
  "property_id": "prop_kamp_lintfort_001",
  "name": "Kamp-Lintfort Mixed-Use Building",
  "location": {
    "address": "City Center, Kamp-Lintfort, Germany",
    "coordinates": {
      "latitude": 51.4963,
      "longitude": 6.5384
    }
  },
  "details": {
    "purchase_price": 1795000,
    "total_area": 2103,
    "residential_area": 1009,
    "commercial_area": 1094,
    "land_area": 1797,
    "parking_spaces": 15,
    "construction_year": 1985,
    "last_renovation": 2020
  },
  "investment_info": {
    "total_nfts": 2500,
    "nft_price": 1000,
    "total_funding_goal": 2500000,
    "current_funding": 1250000,
    "funding_percentage": 50,
    "investors_count": 487,
    "expected_yield": 6.5,
    "property_management_fee": 2.0
  },
  "status": {
    "funding_status": "active",
    "acquisition_status": "pending",
    "expected_acquisition_date": "2025-02-15",
    "rental_status": "not_started"
  }
}
```

#### Get Property Performance
```http
GET /property/{property_id}/performance
```

**Response:**
```json
{
  "property_id": "prop_kamp_lintfort_001",
  "performance_metrics": {
    "current_occupancy_rate": 95.5,
    "average_rent_per_sqm": 8.50,
    "annual_rental_income": 162450,
    "annual_expenses": 24500,
    "net_operating_income": 137950,
    "yield_rate": 6.8,
    "property_appreciation": 2.3
  },
  "recent_distributions": [
    {
      "distribution_date": "2024-12-01",
      "amount_per_nft": 4.25,
      "total_distributed": 10625,
      "distribution_type": "rental_income"
    }
  ],
  "upcoming_distributions": {
    "next_distribution_date": "2025-01-01",
    "estimated_amount_per_nft": 4.40
  }
}
```

### 📊 Market Data & Analytics

#### Get Market Statistics
```http
GET /market/statistics
```

**Response:**
```json
{
  "platform_stats": {
    "total_properties": 1,
    "total_investment_volume": 1250000,
    "total_investors": 487,
    "average_investment_size": 2566,
    "total_distributions_paid": 45230
  },
  "market_comparisons": {
    "traditional_real_estate_yield": 4.2,
    "reit_yield": 3.8,
    "coinestate_average_yield": 6.5,
    "outperformance_vs_traditional": 2.3
  },
  "recent_activity": {
    "new_investors_last_30_days": 23,
    "investment_volume_last_30_days": 89000,
    "average_holding_period_days": 45
  }
}
```

### 🔗 Blockchain Integration

#### Verify Wallet Ownership
```http
POST /wallet/verify
```

**Request Body:**
```json
{
  "wallet_address": "0x742d35Cc6065C6532C3F2206b4A5F5E64D2fdf47",
  "message": "I want to connect my wallet to CoinEstate",
  "signature": "0x1234567890abcdef..."
}
```

**Response:**
```json
{
  "success": true,
  "wallet_verified": true,
  "user_id": "user_1234567890",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_expires_at": "2024-12-21T10:30:00Z"
}
```

#### Get NFT Portfolio
```http
GET /nft/portfolio/{wallet_address}
```

**Response:**
```json
{
  "wallet_address": "0x742d35Cc6065C6532C3F2206b4A5F5E64D2fdf47",
  "nfts": [
    {
      "token_id": 1001,
      "property_id": "prop_kamp_lintfort_001",
      "property_name": "Kamp-Lintfort Mixed-Use",
      "ownership_percentage": 0.04,
      "purchase_date": "2024-12-20T12:00:00Z",
      "purchase_price": 1000,
      "current_estimated_value": 1030,
      "total_distributions_received": 49.00,
      "last_distribution_date": "2024-12-01",
      "last_distribution_amount": 4.25
    }
  ],
  "portfolio_summary": {
    "total_nfts": 5,
    "total_investment": 5000,
    "current_portfolio_value": 5150,
    "total_distributions": 245.00,
    "portfolio_yield": 6.2,
    "portfolio_appreciation": 3.0
  }
}
```

### 📈 Income Distribution

#### Get Distribution Schedule
```http
GET /distributions/schedule/{property_id}
```

**Response:**
```json
{
  "property_id": "prop_kamp_lintfort_001",
  "distribution_schedule": "monthly",
  "next_distribution": {
    "date": "2025-01-01",
    "estimated_amount_per_nft": 4.40,
    "estimated_total": 11000,
    "cutoff_date": "2024-12-31T23:59:59Z"
  },
  "upcoming_distributions": [
    {
      "date": "2025-02-01",
      "estimated_amount_per_nft": 4.35
    },
    {
      "date": "2025-03-01",
      "estimated_amount_per_nft": 4.50
    }
  ],
  "annual_projection": {
    "estimated_annual_per_nft": 52.00,
    "estimated_yield_rate": 5.2
  }
}
```

#### Claim Distribution
```http
POST /distributions/claim
```

**Request Body:**
```json
{
  "distribution_id": "dist_1234567890",
  "wallet_address": "0x742d35Cc6065C6532C3F2206b4A5F5E64D2fdf47",
  "nft_token_ids": [1001, 1002, 1003, 1004, 1005]
}
```

**Response:**
```json
{
  "success": true,
  "claim_transaction_hash": "0xfedcba0987654321...",
  "claimed_amount": 22.00,
  "claim_date": "2025-01-01T10:30:00Z",
  "next_claimable_date": "2025-02-01T00:00:00Z"
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_WALLET_ADDRESS",
    "message": "The provided wallet address is not valid",
    "details": {
      "field": "wallet_address",
      "received": "0xinvalid",
      "expected_format": "0x followed by 40 hexadecimal characters"
    }
  },
  "timestamp": "2024-12-20T10:30:00Z",
  "request_id": "req_1234567890"
}
```

### Common Error Codes
- `INVALID_INPUT` - Request validation failed
- `UNAUTHORIZED` - Authentication required or failed
- `FORBIDDEN` - User doesn't have permission
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error
- `BLOCKCHAIN_ERROR` - Smart contract interaction failed
- `KYC_REQUIRED` - KYC verification needed
- `INSUFFICIENT_FUNDS` - Payment amount insufficient
- `PAYMENT_FAILED` - Payment processing failed

## Rate Limiting

- **Public endpoints**: 100 requests per minute per IP
- **Authenticated endpoints**: 1000 requests per minute per user
- **Payment endpoints**: 10 requests per minute per user
- **KYC endpoints**: 5 requests per minute per user

## Webhooks

The platform supports webhooks for real-time updates:

### Webhook Events
- `kyc.approved` - KYC verification approved
- `kyc.rejected` - KYC verification rejected
- `payment.confirmed` - Payment confirmed on blockchain
- `nft.minted` - NFTs minted and transferred
- `distribution.available` - New distribution available for claiming
- `property.update` - Property status or details updated

### Webhook Payload Example
```json
{
  "event": "nft.minted",
  "timestamp": "2024-12-20T12:30:00Z",
  "data": {
    "investment_id": "inv_1234567890",
    "wallet_address": "0x742d35Cc6065C6532C3F2206b4A5F5E64D2fdf47",
    "nft_token_ids": [1001, 1002, 1003, 1004, 1005],
    "property_id": "prop_kamp_lintfort_001"
  },
  "signature": "webhook_signature_for_verification"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const CoinEstateAPI = require('@coinestate/sdk');

const client = new CoinEstateAPI({
  apiKey: 'your_api_key',
  environment: 'production' // or 'staging'
});

// Subscribe to newsletter
const subscription = await client.subscribe({
  email: 'investor@example.com',
  source: 'landing_page'
});

// Create investment
const investment = await client.createInvestment({
  nftQuantity: 5,
  paymentMethod: 'crypto',
  walletAddress: '0x742d35Cc6065C6532C3F2206b4A5F5E64D2fdf47'
});
```

### Python
```python
from coinestate import CoinEstateAPI

client = CoinEstateAPI(
    api_key='your_api_key',
    environment='production'
)

# Get property details
property_details = client.get_property('prop_kamp_lintfort_001')

# Submit KYC
kyc_result = client.submit_kyc({
    'personal_info': {
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john@example.com'
    }
})
```

---

**Note**: This API is currently in development. Endpoints and data structures may change before production release. Always refer to the latest documentation for current specifications.
