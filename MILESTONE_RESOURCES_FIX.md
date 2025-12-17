# Milestone Asset Selector Fix

## Issue
The milestone asset selector was failing with TypeScript compilation errors in the backend service and runtime errors in the frontend due to:

1. **Backend Issues:**
   - Missing `serializeMilestoneResource` function
   - Incorrect property names (`fileName` vs `name`, `fileSize` vs `size`)
   - Missing type annotations for `allResources` array
   - Inconsistent property access between `MilestoneResource` and `MilestoneSubmissionAttachment`

2. **Frontend Issues:**
   - Runtime error: `resources.map is not a function`
   - Property name mismatches between backend response and frontend expectations

## Solution

### Backend Fixes (`lvtn_be/src/services/contract.service.ts`)

1. **Added `serializeMilestoneResource` function:**
   ```typescript
   const serializeMilestoneResource = (resource: MilestoneResourcePayload) => {
     return {
       id: resource.id,
       milestoneId: resource.milestoneId,
       assetId: resource.assetId,
       fileName: resource.name ?? null, // MilestoneResource uses 'name' not 'fileName'
       fileSize: resource.size ?? null, // MilestoneResource uses 'size' not 'fileSize'
       mimeType: resource.mimeType ?? null,
       createdAt: resource.createdAt,
       updatedAt: resource.updatedAt,
       asset: resource.asset
     }
   }
   ```

2. **Added proper type definition:**
   ```typescript
   type CombinedMilestoneResource = {
     id: string
     milestoneId: string
     assetId: string | null
     fileName: string | null
     fileSize: number | null
     mimeType: string | null
     createdAt: Date
     updatedAt: Date
     asset: {
       id: string
       kind: string | null
       url: string | null
       mimeType: string | null
       bytes: number | null
       status: string | null
     } | null
   }
   ```

3. **Fixed property mapping for submission attachments:**
   - Used `attachment.name` instead of `attachment.fileName`
   - Used `attachment.size` instead of `attachment.fileSize`
   - Used `attachment.createdAt` for `updatedAt` since `MilestoneSubmissionAttachment` doesn't have `updatedAt`

### Frontend Fixes

1. **Updated type definition (`lvtn_fe/src/types/contract.ts`):**
   ```typescript
   export type ContractMilestoneResource = {
     // ... existing properties
     fileName?: string | null // Added for compatibility with backend response
     fileSize?: number | null // Added for compatibility with backend response
     // ... rest of properties
   }
   ```

2. **Fixed component to handle both property names:**
   ```typescript
   // Display name
   {resource.fileName || resource.name || `Asset ${resource.id}`}
   
   // File size
   {(resource.fileSize || resource.size) && (
     <p className="text-xs text-gray-500">
       {((resource.fileSize || resource.size || 0) / 1024).toFixed(1)} KB
     </p>
   )}
   
   // onSelect callback
   onSelect(resource.asset.id, {
     fileName: resource.fileName || resource.name || undefined,
     fileSize: resource.fileSize || resource.size || undefined,
     mimeType: resource.mimeType || undefined
   })
   ```

3. **Added proper error handling:**
   - Array validation in `MilestoneAssetSelector`
   - Fallback to empty array if API response is not an array
   - Better error logging and user feedback

## Result

- ✅ Backend TypeScript compilation errors fixed
- ✅ Frontend runtime errors resolved
- ✅ Milestone asset selector now properly displays available assets
- ✅ Users can select milestone attachments for evidence submission
- ✅ Both `MilestoneResource` and `MilestoneSubmissionAttachment` data is combined and displayed
- ✅ Proper error handling and loading states

## Testing

The milestone asset selector now:
1. Loads milestone resources and submission attachments
2. Displays them in a selectable list with file names and sizes
3. Allows users to select assets for evidence submission
4. Handles both property naming conventions (`name`/`fileName`, `size`/`fileSize`)
5. Shows appropriate loading and error states