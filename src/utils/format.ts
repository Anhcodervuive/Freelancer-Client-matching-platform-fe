/**
 * Format currency with locale support
 */
export const formatCurrency = (amount?: number | string | null, currency: string = 'USD'): string => {
  // Handle null, undefined, or invalid values
  if (amount == null || amount === '' || (typeof amount === 'string' && amount.trim() === '')) {
    return ''
  }
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Check if the parsed number is valid
  if (isNaN(numericAmount) || !isFinite(numericAmount)) {
    return ''
  }
  
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numericAmount)
  } catch (error) {
    // Fallback if currency is invalid
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numericAmount)
  }
}

/**
 * Format date and time
 */
export const formatDateTime = (dateString?: string | null, options?: Intl.DateTimeFormatOptions): string => {
  // Handle null, undefined, or empty values
  if (!dateString || dateString.trim() === '') {
    return ''
  }
  
  const date = new Date(dateString)
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return ''
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  try {
    return date.toLocaleString('vi-VN', { ...defaultOptions, ...options })
  } catch (error) {
    // Fallback to ISO string if locale formatting fails
    return date.toISOString()
  }
}

/**
 * Format date only
 */
export const formatDate = (dateString?: string | null): string => {
  // Handle null, undefined, or empty values
  if (!dateString || dateString.trim() === '') {
    return ''
  }
  
  const date = new Date(dateString)
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return ''
  }
  
  try {
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    // Fallback to ISO date string if locale formatting fails
    return date.toISOString().split('T')[0]
  }
}

/**
 * Format number with thousand separators
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(num)
}

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format file size
 */
export const formatFileSize = (bytes?: number | string | null): string => {
  // Handle null, undefined, or invalid values
  if (bytes == null || bytes === '' || (typeof bytes === 'string' && bytes.trim() === '')) {
    return ''
  }
  
  const numericBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes
  
  // Check if the parsed number is valid
  if (isNaN(numericBytes) || !isFinite(numericBytes) || numericBytes < 0) {
    return ''
  }
  
  if (numericBytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(numericBytes) / Math.log(k))
  
  return parseFloat((numericBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format duration in days to human readable
 */
export const formatDuration = (days: number): string => {
  if (days < 1) return 'Dưới 1 ngày'
  if (days < 7) return `${Math.round(days)} ngày`
  if (days < 30) return `${Math.round(days / 7)} tuần`
  if (days < 365) return `${Math.round(days / 30)} tháng`
  return `${Math.round(days / 365)} năm`
}

/**
 * Extract file extension from filename
 */
export const extractFileExtension = (filename: string): string => {
  if (!filename) return ''
  
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === 0) return ''
  
  return filename.substring(lastDotIndex + 1).toLowerCase()
}

/**
 * Format file type based on mime type and extension
 */
export const formatFileType = (file: { mimeType?: string; extension?: string }): string => {
  const { mimeType, extension } = file
  
  // If we have a mime type, use it to determine the file type
  if (mimeType) {
    const [type, subtype] = mimeType.split('/')
    
    switch (type) {
      case 'image':
        return `Hình ảnh (${extension?.toUpperCase() || subtype.toUpperCase()})`
      case 'video':
        return `Video (${extension?.toUpperCase() || subtype.toUpperCase()})`
      case 'audio':
        return `Âm thanh (${extension?.toUpperCase() || subtype.toUpperCase()})`
      case 'application':
        if (subtype === 'pdf') return 'PDF'
        if (subtype.includes('word')) return 'Word Document'
        if (subtype.includes('excel') || subtype.includes('spreadsheet')) return 'Excel'
        if (subtype.includes('powerpoint') || subtype.includes('presentation')) return 'PowerPoint'
        if (subtype === 'zip' || subtype.includes('compressed')) return 'Tệp nén'
        return `Ứng dụng (${extension?.toUpperCase() || subtype.toUpperCase()})`
      case 'text':
        if (subtype === 'plain') return 'Text'
        if (subtype === 'html') return 'HTML'
        if (subtype === 'css') return 'CSS'
        return `Text (${extension?.toUpperCase() || subtype.toUpperCase()})`
      default:
        return extension?.toUpperCase() || mimeType
    }
  }
  
  // Fallback to extension if no mime type
  if (extension) {
    const ext = extension.toLowerCase()
    
    // Common image formats
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return `Hình ảnh (${ext.toUpperCase()})`
    }
    
    // Common video formats
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
      return `Video (${ext.toUpperCase()})`
    }
    
    // Common audio formats
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
      return `Âm thanh (${ext.toUpperCase()})`
    }
    
    // Common document formats
    if (['pdf'].includes(ext)) return 'PDF'
    if (['doc', 'docx'].includes(ext)) return 'Word Document'
    if (['xls', 'xlsx'].includes(ext)) return 'Excel'
    if (['ppt', 'pptx'].includes(ext)) return 'PowerPoint'
    if (['txt'].includes(ext)) return 'Text'
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Tệp nén'
    
    return ext.toUpperCase()
  }
  
  return 'Không xác định'
}