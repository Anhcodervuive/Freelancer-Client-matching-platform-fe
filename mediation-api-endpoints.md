# API Endpoints cho hệ thống hòa giải

## Admin Mediation APIs

### 1. Tạo đề xuất hòa giải
```typescript
POST /admin/disputes/:disputeId/mediation-proposal
{
  "releaseAmount": 5000000,
  "refundAmount": 3000000,
  "reasoning": "Dựa trên bằng chứng...",
  "responseDeadlineDays": 7
}
```

### 2. Xem danh sách đề xuất hòa giải
```typescript
GET /admin/disputes/:disputeId/mediation-proposals
```

### 3. Chuyển lên cơ quan có thẩm quyền
```typescript
POST /admin/disputes/:disputeId/escalate
{
  "reason": "Hai bên không đồng ý với đề xuất hòa giải",
  "authorityName": "Trung tâm Trọng tài Quốc tế Việt Nam",
  "authorityContact": "contact@viac.vn",
  "notes": "Ghi chú bổ sung..."
}
```

### 4. Tạo gói tài liệu chuyển giao
```typescript
POST /admin/disputes/:disputeId/escalation-package
{
  "includeChat": true,
  "includeMilestoneDetails": true,
  "includePaymentHistory": true,
  "includeNegotiationHistory": true,
  "additionalNotes": "Thông tin bổ sung..."
}
```

## Client/Freelancer APIs

### 1. Phản hồi đề xuất hòa giải
```typescript
POST /contracts/:contractId/milestones/:milestoneId/disputes/:disputeId/mediation-response
{
  "proposalId": "proposal_123",
  "response": "ACCEPTED" | "REJECTED",
  "message": "Lý do phản hồi..."
}
```

### 2. Xem đề xuất hòa giải hiện tại
```typescript
GET /contracts/:contractId/milestones/:milestoneId/disputes/:disputeId/mediation-proposal
```

## Notification APIs

### 1. Thông báo đề xuất hòa giải mới
### 2. Thông báo phản hồi từ đối phương  
### 3. Thông báo hòa giải thành công
### 4. Thông báo chuyển cơ quan có thẩm quyền