# Evidence Submission Debug Guide

## Issues Fixed

### 1. Backend Schema & Service Issues
- ✅ Fixed enum imports in `mediation-evidence.service.ts` to use Prisma generated types
- ✅ Fixed enum validation in `mediation-evidence.schema.ts` to use z.enum instead of z.nativeEnum
- ✅ Added error logging in service for better debugging
- ✅ Fixed displayOrder handling in create function

### 2. Frontend Form Issues  
- ✅ Fixed form validation to properly handle different source types
- ✅ Changed default source type to EXTERNAL_URL (easier to test)
- ✅ Improved file upload mock to generate proper assetId
- ✅ Added logging for debugging API calls

### 3. Database Migration
- ✅ Confirmed migration has been run (tables exist in database)
- ✅ Verified schema matches migration structure

## How to Test

### 1. Start Backend & Frontend
```bash
# Backend
cd lvtn_be
npm run dev

# Frontend  
cd lvtn_fe
npm run dev
```

### 2. Test Evidence Submission
1. Go to a dispute in ADMIN_MEDIATION status
2. Click "Nộp bằng chứng" button
3. Fill in the form:
   - Title: "Test Evidence"
   - Description: "Test description"
   - Evidence Type: "External Link" 
   - Label: "Test Document"
   - URL: "https://example.com/test.pdf"
4. Click "Submit Evidence"

### 3. Check Console Logs
- Frontend console should show API call data
- Backend console should show service execution logs
- Look for any error messages

## Expected Behavior
- Form should submit successfully
- Evidence should appear in the evidence list
- No 500 errors should occur

## If Still Getting Errors
1. Check backend console for detailed error messages
2. Verify user has proper permissions for the dispute
3. Ensure dispute is in correct status (ADMIN_MEDIATION)
4. Check if Prisma client is properly generated: `npx prisma generate`

## Next Steps After Fix
1. Remove debug logging from production code
2. Implement proper file upload functionality
3. Add proper error handling for edge cases
4. Test with different evidence types