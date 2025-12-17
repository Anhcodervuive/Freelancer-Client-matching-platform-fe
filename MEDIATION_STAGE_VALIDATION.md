# Mediation Stage Validation - Implementation Summary

## Overview
Implemented validation logic to ensure admin can only create mediation proposals when dispute is in the correct stage (`INTERNAL_MEDIATION`).

## ✅ IMPLEMENTED FEATURES

### Stage Validation Logic
1. **Dispute Status Check**: Only allow proposal creation when `disputeStatus === 'INTERNAL_MEDIATION'`
2. **Combined Validation**: Updated `canCreateProposal` logic to include:
   - `hasJoinedChat` - Admin must join dispute chat
   - `!activeProposal` - No pending proposal exists
   - `!acceptedProposal` - No accepted proposal exists
   - `isInternalMediationStage` - Dispute is in mediation stage

### User Interface Updates
1. **Early Return for Wrong Stage**: Show informative message when dispute is not in mediation stage
2. **Status Display**: Show current dispute status in the message
3. **Conditional Button Display**: Only show "Tạo đề xuất" button when all conditions are met
4. **Status Messages**: Clear feedback about why proposal creation is disabled

### Code Changes Made

#### AdminMediationPanel.tsx
```typescript
// Added stage validation
const isInternalMediationStage = disputeStatus === 'INTERNAL_MEDIATION'
const canCreateProposal = hasJoinedChat && !activeProposal && !acceptedProposal && isInternalMediationStage

// Added early return for wrong stage
if (!isInternalMediationStage) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center gap-3">
        <Scale className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="font-medium text-blue-800">Chưa tới giai đoạn hòa giải</h3>
          <p className="text-sm text-blue-700 mt-1">
            Dispute chưa chuyển sang giai đoạn hòa giải nội bộ. Admin chỉ có thể tạo đề xuất khi dispute ở trạng thái "INTERNAL_MEDIATION".
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Trạng thái hiện tại: {disputeStatus || 'Không xác định'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Updated button display logic
{canCreateProposal ? (
  <button onClick={() => setShowCreateForm(true)}>Tạo đề xuất</button>
) : isInternalMediationStage && hasJoinedChat ? (
  <div className="text-sm text-gray-500">
    {activeProposal ? 'Có đề xuất đang chờ phản hồi' : 
     acceptedProposal ? 'Đã có đề xuất được chấp nhận' : 
     'Không thể tạo đề xuất'}
  </div>
) : null}
```

## 🎯 BEHAVIOR BY DISPUTE STATUS

### Before INTERNAL_MEDIATION Stage
- ❌ "Tạo đề xuất" button is hidden
- ℹ️ Shows informative message: "Chưa tới giai đoạn hòa giải"
- 📊 Displays current dispute status
- 👀 Admin can still view existing proposals (if any)

### During INTERNAL_MEDIATION Stage
- ✅ "Tạo đề xuất" button is visible (if other conditions met)
- 🔄 Normal proposal creation workflow
- 📝 Can create, view, and manage proposals
- 📤 Can export dispute documents

### Additional Conditions (All Stages)
- 💬 Must join dispute chat first
- 🚫 Cannot create if active proposal exists
- ✅ Cannot create if accepted proposal exists

## 🔍 VALIDATION FLOW

1. **Check Chat Participation**: `hasJoinedChat`
   - If false → Show "Cần tham gia chat" message
   
2. **Check Dispute Stage**: `disputeStatus === 'INTERNAL_MEDIATION'`
   - If false → Show "Chưa tới giai đoạn hòa giải" message
   
3. **Check Proposal Status**: `!activeProposal && !acceptedProposal`
   - If false → Show status-specific message
   
4. **All Conditions Met**: Show "Tạo đề xuất" button

## 📁 FILES MODIFIED
- `lvtn_fe/src/components/mediation-evidence/AdminMediationPanel.tsx`
  - Added `isInternalMediationStage` validation
  - Updated `canCreateProposal` logic
  - Added early return for wrong stage
  - Enhanced button display logic
  - Fixed DisputeExportPanel placement

## ✅ TESTING SCENARIOS

### Scenario 1: Dispute in OPEN status
- Expected: Shows "Chưa tới giai đoạn hòa giải" message
- Button: Hidden
- Status: "OPEN" displayed

### Scenario 2: Dispute in NEGOTIATION status  
- Expected: Shows "Chưa tới giai đoạn hòa giải" message
- Button: Hidden
- Status: "NEGOTIATION" displayed

### Scenario 3: Dispute in INTERNAL_MEDIATION status
- Expected: Shows normal mediation panel
- Button: Visible (if other conditions met)
- Functionality: Full proposal management

### Scenario 4: Admin hasn't joined chat
- Expected: Shows "Cần tham gia chat" message
- Button: Hidden
- Action: Must join chat first

## 🎯 CURRENT STATUS
- ✅ Stage validation implemented
- ✅ User-friendly error messages
- ✅ Conditional UI rendering
- ✅ TypeScript errors resolved
- ✅ Proper component structure

The system now properly validates dispute stages and provides clear feedback to admin users about when they can create mediation proposals.