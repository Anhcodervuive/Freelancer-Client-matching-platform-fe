# Disable Negotiation Form During Mediation Stage

## Problem Description
When a dispute enters the `INTERNAL_MEDIATION` stage (admin mediation), Client and Freelancer should no longer be able to create new negotiation proposals since only admin can create mediation proposals at this stage. However, the negotiation form was still visible and functional.

## Solution Applied
Updated the negotiation form visibility logic to disable it during the mediation stage.

### Changes Made

#### File: `lvtn_fe/src/pages/Contracts/DisputeRoom/ContractDisputeRoomPage.tsx`

1. **Updated Negotiation Lock Logic**
```typescript
// BEFORE
const isNegotiationLocked = isFinalDispute;

// AFTER  
const isNegotiationLocked = isFinalDispute || isMediationStage;
```

2. **Enhanced Status Message**
```typescript
// BEFORE
{isFinalDispute
  ? "Dispute đã kết thúc. Bạn vẫn có thể xem lại lịch sử thương lượng bên dưới."
  : "Dispute tạm thời bị khóa. Vui lòng liên hệ bộ phận hỗ trợ nếu cần thêm giúp đỡ."}

// AFTER
{isFinalDispute
  ? "Dispute đã kết thúc. Bạn vẫn có thể xem lại lịch sử thương lượng bên dưới."
  : isMediationStage
  ? "Dispute đã chuyển sang giai đoạn hòa giải nội bộ. Admin sẽ xem xét bằng chứng và đưa ra đề xuất hòa giải."
  : "Dispute tạm thời bị khóa. Vui lòng liên hệ bộ phận hỗ trợ nếu cần thêm giúp đỡ."}
```

3. **Updated Visual Styling**
```typescript
// BEFORE
className={`rounded-2xl px-5 py-4 text-sm ${
  isFinalDispute
    ? "border border-success/40 bg-success/10 text-success"
    : "border border-violet-200/70 bg-violet-50/70 text-violet-700"
}`}

// AFTER
className={`rounded-2xl px-5 py-4 text-sm ${
  isFinalDispute
    ? "border border-success/40 bg-success/10 text-success"
    : isMediationStage
    ? "border border-blue-200/70 bg-blue-50/70 text-blue-700"
    : "border border-violet-200/70 bg-violet-50/70 text-violet-700"
}`}
```

## Behavior by Dispute Status

### 1. OPEN / NEGOTIATION Status
- ✅ Negotiation form is visible and functional
- ✅ Client and Freelancer can create proposals
- 📝 Form shows: "Gửi đề xuất thương lượng"

### 2. INTERNAL_MEDIATION Status  
- ❌ Negotiation form is hidden
- ℹ️ Shows informative message with blue styling
- 📢 Message: "Dispute đã chuyển sang giai đoạn hòa giải nội bộ. Admin sẽ xem xét bằng chứng và đưa ra đề xuất hòa giải."
- 👀 Can still view negotiation history
- 🔒 Only admin can create mediation proposals

### 3. Final Status (RESOLVED_*, CANCELED, EXPIRED)
- ❌ Negotiation form is hidden  
- ✅ Shows completion message with green styling
- 📢 Message: "Dispute đã kết thúc. Bạn vẫn có thể xem lại lịch sử thương lượng bên dưới."
- 👀 Can view negotiation history

## User Experience Flow

### Phase 1: Direct Negotiation
1. Client/Freelancer create proposals
2. Counterparty can accept/reject
3. Multiple rounds of negotiation possible

### Phase 2: Admin Mediation (NEW BEHAVIOR)
1. Dispute status changes to `INTERNAL_MEDIATION`
2. 🚫 Client/Freelancer negotiation form disappears
3. ℹ️ Clear message explains the transition
4. 📋 Evidence submission still available
5. 👨‍💼 Only admin can create mediation proposals
6. 👀 Parties can view admin proposals and respond

### Phase 3: Resolution
1. Dispute reaches final status
2. All forms disabled
3. History remains viewable

## Visual Design

### Mediation Stage Styling
- **Border**: Light blue (`border-blue-200/70`)
- **Background**: Light blue (`bg-blue-50/70`)  
- **Text**: Blue (`text-blue-700`)
- **Icon**: Informational tone

### Comparison with Other States
- **Final**: Green success styling
- **Locked**: Purple/violet styling  
- **Mediation**: Blue informational styling

## Benefits
- ✅ Clear separation of negotiation phases
- ✅ Prevents confusion about who can create proposals
- ✅ Maintains access to negotiation history
- ✅ Provides clear status communication
- ✅ Consistent with mediation workflow
- ✅ Better user experience with appropriate messaging

## Files Modified
- `lvtn_fe/src/pages/Contracts/DisputeRoom/ContractDisputeRoomPage.tsx`
  - Updated `isNegotiationLocked` logic
  - Enhanced status messages
  - Improved visual styling for mediation stage

## Testing Scenarios
1. **Create dispute** → Should show negotiation form
2. **Enter mediation stage** → Form should disappear, show blue message
3. **Admin creates mediation proposal** → Parties can respond but not create new proposals
4. **Dispute resolves** → Show final green message
5. **View negotiation history** → Should remain accessible in all stages