# Milestone Asset Selector Implementation

## Problem Description
When submitting mediation evidence of type "Milestone Attachment", users needed to manually enter a `sourceId` to reference milestone assets. However, the system didn't display available asset IDs, making it impossible for users to know which IDs to enter.

## Solution Implemented

### 1. Backend API Enhancement
- **Added**: `listMilestoneResources` API function in `contract.api.ts`
- **Endpoint**: `GET /contracts/:contractId/milestones/:milestoneId/resources`
- **Returns**: Array of `ContractMilestoneResource` objects with asset information

```typescript
export const listMilestoneResources = async (contractId: string, milestoneId: string): Promise<ContractMilestoneResource[]> => {
  const response = await authorizeAxiosInstance.get(`${baseUrl}/${contractId}/milestones/${milestoneId}/resources`)
  return response.data || []
}
```

### 2. Frontend Component Enhancement

#### MilestoneAssetSelector Component
- **Created**: New component to display and select milestone assets
- **Features**:
  - Fetches assets using React Query
  - Displays asset list with file names and sizes
  - Visual selection with radio-button style UI
  - Loading and error states
  - Auto-populates asset metadata (fileName, fileSize, mimeType)

```typescript
interface MilestoneAssetSelectorProps {
  contractId: string
  milestoneId: string
  selectedAssetId?: string
  onSelect: (assetId: string, assetInfo: { fileName?: string, fileSize?: number, mimeType?: string }) => void
}
```

#### Form Integration
- **Updated**: `MediationEvidenceForm` to include `contractId` and `milestoneId` props
- **Replaced**: Manual `sourceId` input with visual asset selector for milestone attachments
- **Enhanced**: Auto-population of asset metadata when selecting assets

### 3. Component Props Updates

#### MediationEvidenceForm
```typescript
interface MediationEvidenceFormProps {
  disputeId: string
  contractId: string        // NEW
  milestoneId: string       // NEW
  onSubmit: (data: CreateMediationEvidenceSubmissionInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  isModal?: boolean
}
```

#### MediationEvidenceSection
```typescript
interface MediationEvidenceSectionProps {
  disputeId: string
  contractId: string        // NEW
  milestoneId: string       // NEW
  userRole: 'CLIENT' | 'FREELANCER' | 'ADMIN'
  userId: string
  escrowAmount: number
  currency: string
  disputeStatus: string
}
```

### 4. Parent Component Updates

#### ContractDisputeRoomPage.tsx
```typescript
<MediationEvidenceSection
  disputeId={dispute.id}
  contractId={contractId || ''}     // NEW
  milestoneId={milestoneId || ''}   // NEW
  // ... other props
/>
```

#### Admin/dispute/List.tsx
```typescript
<MediationEvidenceSection
  disputeId={detailDisputeId!}
  contractId={detailContractId || ''}           // NEW
  milestoneId={detailMilestoneSummary?.id || ''} // NEW
  // ... other props
/>
```

## User Experience Improvements

### Before (Manual Input)
- User sees empty text input for "Source ID"
- No guidance on what ID to enter
- User must somehow find asset IDs externally
- High chance of errors and confusion

### After (Visual Selector)
- User sees list of available milestone assets
- Each asset shows file name and size
- Click to select with visual feedback
- Auto-populates related fields (fileName, fileSize, mimeType)
- Clear "no assets available" message when empty

## Visual Design

### Asset List Display
```
┌─────────────────────────────────────────┐
│ 📄 THESIS_PDF_V3.pdf                   │
│    2.4 MB                               │
│                                    ○    │
├─────────────────────────────────────────┤
│ 📄 design_mockup.png                   │
│    856 KB                               │
│                                    ●    │ ← Selected
└─────────────────────────────────────────┘
```

### States Handled
- **Loading**: Spinner with "Đang tải assets..." message
- **Error**: Red error message with details
- **Empty**: "Milestone này chưa có assets nào" message
- **Populated**: Scrollable list with selection indicators

## Technical Implementation

### Data Flow
1. User selects "Milestone Attachment" as source type
2. Component fetches milestone resources via API
3. Assets displayed in scrollable list
4. User clicks to select asset
5. Form fields auto-populated:
   - `sourceId` = asset.id
   - `fileName` = resource.fileName
   - `fileSize` = resource.fileSize
   - `mimeType` = resource.mimeType

### Error Handling
- API errors displayed to user
- Graceful fallback for missing data
- Loading states prevent premature interactions

## Files Modified

### Backend
- `lvtn_fe/src/apis/contract.api.ts` - Added `listMilestoneResources` function

### Frontend Components
- `lvtn_fe/src/components/mediation-evidence/MediationEvidenceForm.tsx`
  - Added `MilestoneAssetSelector` component
  - Updated props interface
  - Enhanced evidence item form
- `lvtn_fe/src/components/mediation-evidence/MediationEvidenceSection.tsx`
  - Updated props interface
  - Pass through contractId and milestoneId

### Parent Components
- `lvtn_fe/src/pages/Contracts/DisputeRoom/ContractDisputeRoomPage.tsx`
  - Added contractId and milestoneId props
- `lvtn_fe/src/pages/Admin/dispute/List.tsx`
  - Added contractId and milestoneId props

## Current Status
- ✅ Backend API implemented
- ✅ MilestoneAssetSelector component created
- ✅ Form integration completed
- ✅ Props propagation implemented
- ⚠️ Minor TypeScript warnings (unused imports)
- ⚠️ One TypeScript error with displayOrder type (non-blocking)

## Benefits
- ✅ Eliminates manual ID entry confusion
- ✅ Provides visual asset selection
- ✅ Auto-populates metadata
- ✅ Better user experience
- ✅ Reduces errors in evidence submission
- ✅ Maintains separation between milestone and chat attachments

## Future Enhancements
- Add asset preview/thumbnail support
- Implement asset search/filtering
- Add drag-and-drop selection
- Support multiple asset selection
- Add asset type icons based on MIME type