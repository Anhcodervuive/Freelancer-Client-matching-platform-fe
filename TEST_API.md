# Test API Mediation

## Kiểm tra API có hoạt động không

### 1. Kiểm tra backend đã restart chưa
Backend cần được restart sau khi thêm routes mới:
```bash
cd lvtn_be
npm run dev
```

### 2. Test API endpoints

#### Test mediation-evidence API:
```bash
# GET evidence list
curl -X GET "http://localhost:5173/mediation-evidence/disputes/DISPUTE_ID/evidence" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test mediation-proposal API:
```bash  
# GET proposals list
curl -X GET "http://localhost:5173/mediation-proposal/dispute/DISPUTE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Kiểm tra trong browser console

Mở Developer Tools và xem:
1. Network tab để xem request nào bị 404
2. Console tab để xem error messages

### 4. URLs hiện tại trong frontend:

**Mediation Evidence:**
- Base URL: `/mediation-evidence`
- List evidence: `/mediation-evidence/disputes/{disputeId}/evidence`

**Mediation Proposal:**  
- Base URL: `/mediation-proposal`
- List proposals: `/mediation-proposal/dispute/{disputeId}`
- Get proposal: `/mediation-proposal/{proposalId}`
- Respond: `/mediation-proposal/{proposalId}/respond`

### 5. Backend routes đã đăng ký:
- `/mediation-evidence/*` → mediationEvidenceRoute
- `/mediation-proposal/*` → mediationProposalRoute

## Nếu vẫn lỗi 404:

1. **Kiểm tra backend có chạy không**
2. **Restart backend** sau khi thêm routes mới
3. **Kiểm tra database migration** đã chạy chưa
4. **Xem backend logs** để debug

## Cách debug:

1. Mở browser DevTools
2. Vào Network tab  
3. Refresh trang dispute
4. Click tab "Hồ sơ & chứng cứ"
5. Xem request nào bị 404
6. Copy URL và kiểm tra với backend routes