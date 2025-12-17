# Modal Background & Assets Display Debug Fix

## Issues Fixed

### 1. Modal Background Issue
**Problem**: Modal có background đen thay vì trong suốt
**Solution**: Thay đổi từ `bg-black` thành `bg-gray-600` để có màu xám trong suốt

```typescript
// Before
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">

// After  
<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
```

### 2. Assets Not Displaying Issue
**Problem**: Server trả dữ liệu nhưng UI hiển thị "Milestone này chưa có assets nào"

**Debug Enhancements Added**:

1. **Enhanced API Logging**:
   ```typescript
   queryFn: async () => {
     console.log('MilestoneAssetSelector - Calling API with:', { contractId, milestoneId })
     const result = await listMilestoneResources(contractId, milestoneId)
     console.log('MilestoneAssetSelector - API result:', result)
     return result
   }
   ```

2. **Detailed Condition Logging**:
   ```typescript
   if (!resources || !Array.isArray(resources) || resources.length === 0) {
     console.log('MilestoneAssetSelector - No resources condition:', {
       hasResources: !!resources,
       isArray: Array.isArray(resources),
       length: resources?.length,
       resourcesValue: resources
     })
     return (
       <div className="text-gray-500 text-sm py-4 text-center">
         Milestone này chưa có assets nào
         <div className="text-xs mt-2 font-mono text-gray-400">
           Debug: {JSON.stringify({ hasResources: !!resources, isArray: Array.isArray(resources), length: resources?.length })}
         </div>
       </div>
     )
   }
   ```

3. **Existing API Logging**: API function đã có sẵn logging:
   ```typescript
   console.log('listMilestoneResources response:', response.data)
   ```

## Debug Information Available

Bây giờ trong console sẽ thấy:
1. **Props values**: contractId, milestoneId, selectedAssetId
2. **Query state**: isLoading, error status
3. **API call details**: Parameters và response
4. **Resources data**: Type, array status, length
5. **Condition check**: Tại sao component hiển thị "chưa có assets"

## Possible Root Causes

1. **API Response Format**: Backend có thể trả về format khác với expected
2. **Query Not Enabled**: contractId hoặc milestoneId có thể undefined/null
3. **Data Processing**: Response có data nhưng không đúng structure
4. **Timing Issue**: Query chạy trước khi props được set

## Next Steps

1. **Check Console Logs**: Xem debug information trong browser console
2. **Verify Props**: Đảm bảo contractId và milestoneId được truyền đúng
3. **Check API Response**: Xem response format từ backend
4. **Test Query**: Verify query được enable và chạy thành công

## Testing

Bây giờ khi test:
1. ✅ Modal background sẽ là xám trong suốt thay vì đen
2. ✅ Console sẽ hiển thị chi tiết debug information
3. ✅ Có thể identify chính xác tại sao assets không hiển thị
4. ✅ Debug info hiển thị trực tiếp trong UI