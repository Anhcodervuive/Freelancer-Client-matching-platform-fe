# Mediation Proposal Enum Fix

## Problem Description
When accessing the admin dispute evidence tab, a Prisma validation error occurred:

```
Invalid value for argument `in`. Expected MediationProposalStatus.
Invalid `prismaClient.mediationProposal.count()` invocation
status: {
  in: ["REJECTED_BY_CLIENT","REJECTED_BY_FREELANCER","REJECTED_BY_BOTH"]
}
```

The error happened in `dispute-document-export.service.ts` when checking export eligibility, specifically when counting failed mediation proposals.

## Root Cause
The code was using incorrect enum values for `MediationProposalStatus`. The service was trying to use:
- `REJECTED_BY_CLIENT`
- `REJECTED_BY_FREELANCER` 
- `REJECTED_BY_BOTH`

But the actual `MediationProposalStatus` enum only has these values:
- `PENDING`
- `ACCEPTED_BY_ALL`
- `REJECTED`
- `EXPIRED`

## Solution Applied

### 1. Fixed Enum Values
Updated the query to use the correct enum value:

```typescript
// BEFORE (incorrect)
const failedProposals = await prismaClient.mediationProposal.count({
  where: {
    disputeId: dispute.id,
    status: {
      in: ['REJECTED_BY_CLIENT', 'REJECTED_BY_FREELANCER', 'REJECTED_BY_BOTH'] as any
    }
  }
})

// AFTER (correct)
const failedProposals = await prismaClient.mediationProposal.count({
  where: {
    disputeId: dispute.id,
    status: MediationProposalStatus.REJECTED
  }
})
```

### 2. Added Proper Import
Added the enum import for type safety:

```typescript
import { DisputeStatus, MediationProposalStatus } from '~/generated/prisma'
```

## Logic Explanation

### Mediation Proposal Status Flow
1. **PENDING**: Admin creates proposal, waiting for client/freelancer responses
2. **ACCEPTED_BY_ALL**: Both parties accept the proposal → Payment processing
3. **REJECTED**: Either party rejects the proposal → Failed attempt
4. **EXPIRED**: Proposal deadline passed without response → Failed attempt

### Export Eligibility Logic
- Dispute must be in `INTERNAL_MEDIATION` status
- Must have at least 2 failed mediation attempts (status = `REJECTED`)
- This indicates multiple unsuccessful mediation attempts before escalation

## Files Modified
- `lvtn_be/src/services/dispute-document-export.service.ts`
  - Fixed enum values in `isEligibleForDocumentExport` function
  - Added proper enum import
  - Simplified query logic

## Expected Behavior After Fix

### Scenario 1: No mediation proposals yet
- Export eligibility check: ✅ No error
- Result: Not eligible (0 failed proposals < 2)

### Scenario 2: 1 rejected proposal
- Export eligibility check: ✅ No error  
- Result: Not eligible (1 failed proposal < 2)

### Scenario 3: 2+ rejected proposals
- Export eligibility check: ✅ No error
- Result: Eligible for document export

### Scenario 4: Mixed proposal statuses
- Export eligibility check: ✅ No error
- Result: Only counts `REJECTED` status proposals

## Testing
1. Access admin dispute evidence tab with no proposals → Should work without error
2. Create and reject mediation proposals → Should count correctly
3. Check export eligibility with various proposal combinations

## Impact
- ✅ Fixed Prisma validation error
- ✅ Proper enum usage with type safety
- ✅ Correct failed proposal counting logic
- ✅ Admin can access dispute evidence tab without errors
- ✅ Export eligibility works as intended