import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  FileText, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { toast } from 'react-toastify'

import disputeDocumentExportApi from '~/apis/dispute-document-export.api'

interface DisputeExportPanelProps {
  disputeId: string
  disputeStatus: string
}

export default function DisputeExportPanel({ disputeId, disputeStatus }: DisputeExportPanelProps) {
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const queryClient = useQueryClient()

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

  // Close mediation mutation
  const closeMediationMutation = useMutation({
    mutationFn: (reason: string) => 
      disputeDocumentExportApi.closeMediationForExternalResolution(disputeId, { reason }),
    onSuccess: () => {
      toast.success('Đã đóng hồ sơ hòa giải và chuyển sang giải quyết bên ngoài')
      setShowCloseModal(false)
      setCloseReason('')
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] })
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đóng hồ sơ')
    }
  })

  const handleCloseMediation = () => {
    if (closeReason.trim().length < 10) {
      toast.error('Lý do phải có ít nhất 10 ký tự')
      return
    }
    closeMediationMutation.mutate(closeReason.trim())
  }

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
    
    toast.success('Đã tải xuống gói tài liệu tranh chấp')
  }

  // Don't show panel if dispute is not in mediation
  if (disputeStatus !== 'INTERNAL_MEDIATION') {
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Xuất tài liệu tranh chấp</h3>
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
            <span className="text-sm font-medium">{eligibility.message}</span>
          </div>

          {/* Export Actions */}
          {eligibility.isEligible && (
            <div className="space-y-3">
              {/* Download Package */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Gói tài liệu tranh chấp</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Bao gồm hợp đồng, chat, milestone, thương lượng và bằng chứng
                  </p>
                </div>
                <button
                  onClick={handleDownloadPackage}
                  disabled={loadingPackage}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingPackage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Tải xuống
                </button>
              </div>

              {/* Close Mediation */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h4 className="font-medium text-red-900">Đóng hồ sơ hòa giải</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Chuyển tranh chấp sang giải quyết bên ngoài (tòa án, trọng tài)
                  </p>
                </div>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Đóng hồ sơ
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Close Mediation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Đóng hồ sơ hòa giải</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Hành động này sẽ đóng hồ sơ hòa giải và chuyển tranh chấp sang giải quyết bên ngoài. 
              Vui lòng nhập lý do:
            </p>
            
            <textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Nhập lý do đóng hồ sơ (ít nhất 10 ký tự)..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 mb-4"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCloseMediation}
                disabled={closeMediationMutation.isPending || closeReason.trim().length < 10}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {closeMediationMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}