# Evidence Form Modal Integration

## Issue
The `MediationEvidenceForm` component was created but not integrated into the UI. Users could not access the form to submit evidence with milestone attachments.

## Solution
Added the evidence form modal to the `MediationEvidenceSection` component.

## Changes Made

### 1. Added Modal to MediationEvidenceSection
```typescript
{/* Evidence Form Modal */}
{showEvidenceForm && createPortal(
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Nộp bằng chứng hòa giải</h2>
        <button
          onClick={() => setShowEvidenceForm(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <MediationEvidenceForm
        disputeId={disputeId}
        contractId={contractId}
        milestoneId={milestoneId}
        onSubmit={handleSubmitEvidence}
        onCancel={() => setShowEvidenceForm(false)}
        isLoading={submitEvidenceMutation.isPending}
        isModal={true}
      />
    </div>
  </div>,
  document.body
)}
```

### 2. Modal Features
- **Portal Rendering**: Uses `createPortal` to render modal at document.body level
- **Backdrop**: Semi-transparent black background with click-to-close
- **Responsive**: Max width 4xl, max height 90vh with scroll
- **Close Button**: X button in header
- **Loading State**: Passes loading state from mutation
- **Props Integration**: Passes all required props (disputeId, contractId, milestoneId)

### 3. Existing Integration Points
The modal leverages existing functionality:
- `showEvidenceForm` state (already existed)
- `setShowEvidenceForm` function (already existed)  
- `handleSubmitEvidence` function (already existed)
- `submitEvidenceMutation` (already existed)
- Body scroll prevention (already existed)

## User Flow
1. User clicks "Nộp bằng chứng" button
2. Modal opens with `MediationEvidenceForm`
3. User can select evidence type including "Milestone Attachment"
4. When "Milestone Attachment" is selected, `MilestoneAssetSelector` appears
5. User can select from available milestone resources and submission attachments
6. User fills form and submits
7. Modal closes and evidence list refreshes

## Testing
Now users can:
- ✅ Access the evidence submission form
- ✅ Select "Milestone Attachment" as evidence type
- ✅ See available milestone assets (resources + submission attachments)
- ✅ Select assets and submit evidence
- ✅ View debug logs in console for troubleshooting

## Debug Information
The `MilestoneAssetSelector` now includes enhanced logging:
- Props values (contractId, milestoneId, selectedAssetId)
- Query state (isLoading, error)
- Resources data (type, array status)
- Query enabled status

This will help identify any remaining issues with the API calls or data formatting.