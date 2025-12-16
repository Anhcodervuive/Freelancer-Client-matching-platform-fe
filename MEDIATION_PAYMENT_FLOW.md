# Mediation Payment Processing Flow

## Overview
Khi cả Client và Freelancer đồng ý với đề xuất hòa giải của Admin, hệ thống sẽ tự động xử lý thanh toán theo thỏa thuận.

## Payment Flow

### 1. Trigger Conditions
- Proposal status = `ACCEPTED_BY_ALL`
- Cả Client và Freelancer đã respond với `ACCEPTED`

### 2. Automatic Payment Processing
Khi điều kiện được đáp ứng, hệ thống sẽ:

#### Backend Processing:
1. **Update Dispute Status**: 
   - Status → `RESOLVED_SPLIT`
   - Record decision details

2. **Process Stripe Payments**:
   - **Transfer to Freelancer**: Nếu `releaseAmount > 0`
     - Chuyển tiền vào Stripe Connect Account của Freelancer
     - Tạo Transfer record trong database
   - **Refund to Client**: Nếu `refundAmount > 0`
     - Hoàn tiền về payment method gốc của Client
     - Tạo Refund record trong database

3. **Update Database**:
   - Update Escrow amounts (amountReleased, amountRefunded)
   - Update Escrow status based on distribution
   - Update Milestone status if applicable

#### Frontend Updates:
1. **Real-time UI Updates**:
   - Show "Đang xử lý thanh toán..." message
   - Display payment progress indicator
   - Update proposal status display

2. **Payment Status Tracking**:
   - Admin can view payment status
   - Users see payment completion notifications

### 3. Payment Distribution Examples

#### Example 1: Full Release
```
Escrow: $1000
Release: $1000, Refund: $0
→ Freelancer receives $1000
→ Client receives $0
```

#### Example 2: Full Refund
```
Escrow: $1000
Release: $0, Refund: $1000
→ Freelancer receives $0
→ Client receives $1000
```

#### Example 3: Split Decision
```
Escrow: $1000
Release: $600, Refund: $300
→ Freelancer receives $600
→ Client receives $300
→ Platform keeps $100 as fee
```

### 4. Error Handling

#### Stripe Errors:
- Transfer failures (invalid account, insufficient funds)
- Refund failures (payment method issues)
- Network/API errors

#### Recovery Actions:
- Automatic retry mechanisms
- Admin manual retry option
- Error notifications to relevant parties

### 5. Database Tables Used

#### Core Tables:
- `MediationProposal`: Stores proposal and responses
- `Dispute`: Tracks dispute status and decisions
- `Escrow`: Manages escrow amounts and status
- `Transfer`: Records Stripe transfers to freelancers
- `Refund`: Records Stripe refunds to clients
- `Payment`: Original payment records

#### Status Tracking:
- `EscrowStatus`: UNFUNDED → FUNDED → DISPUTED → RELEASED/REFUNDED
- `DisputeStatus`: INTERNAL_MEDIATION → RESOLVED_SPLIT
- `TransferStatus`: PENDING → SUCCEEDED/FAILED
- `RefundStatus`: PENDING → SUCCEEDED/FAILED

### 6. API Endpoints

#### Payment Status:
```
GET /mediation-proposal/{proposalId}/payment-status
```

#### Retry Payment:
```
POST /mediation-proposal/{proposalId}/retry-payment
```

### 7. Security Considerations

#### Access Control:
- Only dispute participants can view payment status
- Only admins can retry failed payments
- All payment operations are logged

#### Data Protection:
- Sensitive payment data is encrypted
- PCI compliance for card data
- Audit trails for all transactions

### 8. Monitoring & Notifications

#### Success Notifications:
- Email to both parties when payment completes
- In-app notifications with payment details
- Admin dashboard updates

#### Failure Notifications:
- Immediate alerts for payment failures
- Retry instructions for users
- Admin intervention notifications

## Implementation Status

### ✅ Completed:
- Backend payment service
- Stripe integration for transfers and refunds
- Database schema and models
- API endpoints for payment operations
- Frontend UI updates for payment status

### 🔄 In Progress:
- Error handling and retry mechanisms
- Notification system
- Payment status polling

### 📋 TODO:
- Comprehensive error recovery
- Payment analytics and reporting
- Webhook handling for Stripe events
- Performance optimization for large amounts