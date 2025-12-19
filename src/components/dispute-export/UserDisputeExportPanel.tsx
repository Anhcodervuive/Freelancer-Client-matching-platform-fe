import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  FileText, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  FileDown,
  ExternalLink
} from 'lucide-react'
import { toast } from 'react-toastify'

import disputeDocumentExportApi from '~/apis/dispute-document-export.api'
import { generateDisputeHtml } from '~/utils/disputeHtmlGenerator'

interface UserDisputeExportPanelProps {
  disputeId: string
  disputeStatus: string
  userRole: 'CLIENT' | 'FREELANCER'
}

export default function UserDisputeExportPanel({ 
  disputeId, 
  disputeStatus, 
  userRole 
}: UserDisputeExportPanelProps) {
  // Check export eligibility
  const { data: eligibility, isLoading: checkingEligibility } = useQuery({
    queryKey: ['dispute-export-eligibility', disputeId],
    queryFn: () => disputeDocumentExportApi.checkExportEligibility(disputeId),
    enabled: disputeStatus === 'INTERNAL_MEDIATION'
  })

  // Get document package
  const { data: documentPackage, isLoading: loadingPackage } = useQuery({
    queryKey: ['dispute-document-package', disputeId],
    queryFn: () => disputeDocumentExportApi.getDisputeDocumentPackage(disputeId),
    enabled: eligibility?.isEligible === true
  })

  const handleDownloadPackage = () => {
    if (!documentPackage) return
    
    // Create downloadable JSON file
    const dataStr = JSON.stringify(documentPackage, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `dispute-${disputeId}-documents.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Đã tải xuống gói tài liệu tranh chấp (JSON)')
  }

  const handleDownloadPdf = async () => {
    if (!documentPackage) return
    
    try {
      // Generate HTML document
      const htmlContent = generateDisputeHtml(documentPackage)
      
      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        
        // Auto-trigger print dialog after content loads
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
          }, 500)
        }
        
        toast.success('Đã mở tài liệu tranh chấp. Sử dụng Ctrl+P để in hoặc lưu thành PDF.')
      } else {
        // Fallback: download as HTML file
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(htmlBlob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `dispute-${disputeId}-document.html`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast.success('Đã tải xuống tài liệu tranh chấp HTML. Mở file và sử dụng Ctrl+P để in thành PDF.')
      }
    } catch (error) {
      console.error('Error generating document:', error)
      toast.error('Có lỗi xảy ra khi tạo tài liệu. Vui lòng thử lại.')
    }
  }

  // Don't show panel if dispute is not in mediation
  if (disputeStatus !== 'INTERNAL_MEDIATION') {
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Xuất tài liệu tranh chấp</h3>
          <p className="text-sm text-gray-600">
            Tải xuống hồ sơ tranh chấp để sử dụng cho các thủ tục pháp lý bên ngoài
          </p>
        </div>
      </div>

      {checkingEligibility ? (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang kiểm tra điều kiện xuất tài liệu...</span>
        </div>
      ) : eligibility ? (
        <div className="space-y-4">
          {/* Eligibility Status */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            eligibility.isEligible 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}>
            {eligibility.isEligible ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <div className="flex-1">
              <span className="text-sm font-medium">{eligibility.message}</span>
              {!eligibility.isEligible && (
                <p className="text-xs mt-1 opacity-80">
                  Bạn có thể xuất tài liệu sau khi admin đã đề xuất hòa giải ít nhất 2 lần mà không được chấp nhận.
                </p>
              )}
            </div>
          </div>

          {/* Export Actions */}
          {eligibility.isEligible && (
            <div className="space-y-3">
              {/* Download PDF Document */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <h4 className="font-medium text-blue-900">📄 Tài liệu tranh chấp đầy đủ</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Tài liệu có thể đọc được bao gồm thông tin hợp đồng, milestone, lịch sử thương lượng và bằng chứng
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Sẽ mở cửa sổ mới để in hoặc lưu thành PDF
                  </p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  disabled={loadingPackage}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingPackage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  Tạo tài liệu
                </button>
              </div>

              {/* Download Raw JSON Package */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Dữ liệu thô (JSON)</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Dữ liệu JSON cho mục đích kỹ thuật và phân tích
                  </p>
                </div>
                <button
                  onClick={handleDownloadPackage}
                  disabled={loadingPackage}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {loadingPackage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Tải xuống JSON
                </button>
              </div>

              {/* Information about external resolution */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Thông tin quan trọng</h4>
                    <p className="text-sm text-amber-800 mt-1">
                      Tài liệu này có thể được sử dụng để giải quyết tranh chấp thông qua các cơ quan có thẩm quyền 
                      như tòa án hoặc trung tâm trọng tài khi hòa giải nội bộ không thành công.
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      Vui lòng tham khảo ý kiến luật sư trước khi tiến hành các thủ tục pháp lý.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}