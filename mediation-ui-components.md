# UI Components cho hệ thống hòa giải

## 1. Admin Mediation Panel

```typescript
// AdminMediationPanel.tsx
interface AdminMediationPanelProps {
  dispute: AdminDisputeDetail
  onProposalSubmit: (proposal: MediationProposalInput) => void
  onEscalate: (reason: string) => void
}

const AdminMediationPanel: React.FC<AdminMediationPanelProps> = ({
  dispute,
  onProposalSubmit,
  onEscalate
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'proposal' | 'escalate'>('overview')
  
  return (
    <div className="mediation-panel">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Tổng quan tranh chấp
        </button>
        <button 
          className={`tab ${activeTab === 'proposal' ? 'active' : ''}`}
          onClick={() => setActiveTab('proposal')}
        >
          Đề xuất hòa giải
        </button>
        <button 
          className={`tab ${activeTab === 'escalate' ? 'active' : ''}`}
          onClick={() => setActiveTab('escalate')}
        >
          Chuyển cơ quan
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'overview' && (
          <DisputeOverviewTab dispute={dispute} />
        )}
        {activeTab === 'proposal' && (
          <MediationProposalForm 
            dispute={dispute}
            onSubmit={onProposalSubmit}
          />
        )}
        {activeTab === 'escalate' && (
          <EscalationForm 
            dispute={dispute}
            onEscalate={onEscalate}
          />
        )}
      </div>
    </div>
  )
}
```

## 2. Mediation Proposal Form

```typescript
// MediationProposalForm.tsx
interface MediationProposalFormProps {
  dispute: AdminDisputeDetail
  onSubmit: (proposal: MediationProposalInput) => void
}

const MediationProposalForm: React.FC<MediationProposalFormProps> = ({
  dispute,
  onSubmit
}) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<MediationProposalInput>()
  
  const releaseAmount = watch('releaseAmount', 0)
  const refundAmount = watch('refundAmount', 0)
  const totalAmount = dispute.escrowAmount || 0
  
  const isValidSplit = (releaseAmount + refundAmount) <= totalAmount
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mediation-form">
      <div className="form-section">
        <h3>Thông tin tranh chấp</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Số tiền escrow:</label>
            <span>{formatCurrency(totalAmount, dispute.currency)}</span>
          </div>
          <div className="info-item">
            <label>Milestone:</label>
            <span>{dispute.milestone?.title}</span>
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Đề xuất phân chia</h3>
        
        <div className="amount-inputs">
          <div className="input-group">
            <label>Số tiền trả cho Freelancer:</label>
            <input
              type="number"
              {...register('releaseAmount', { 
                required: 'Vui lòng nhập số tiền',
                min: { value: 0, message: 'Số tiền phải >= 0' },
                max: { value: totalAmount, message: 'Vượt quá số tiền escrow' }
              })}
              className="form-input"
            />
            {errors.releaseAmount && (
              <span className="error">{errors.releaseAmount.message}</span>
            )}
          </div>
          
          <div className="input-group">
            <label>Số tiền hoàn cho Client:</label>
            <input
              type="number"
              {...register('refundAmount', {
                required: 'Vui lòng nhập số tiền',
                min: { value: 0, message: 'Số tiền phải >= 0' },
                max: { value: totalAmount, message: 'Vượt quá số tiền escrow' }
              })}
              className="form-input"
            />
            {errors.refundAmount && (
              <span className="error">{errors.refundAmount.message}</span>
            )}
          </div>
        </div>
        
        {!isValidSplit && (
          <div className="alert alert-error">
            Tổng số tiền phân chia ({formatCurrency(releaseAmount + refundAmount, dispute.currency)}) 
            vượt quá số tiền escrow ({formatCurrency(totalAmount, dispute.currency)})
          </div>
        )}
        
        <div className="split-summary">
          <h4>Tóm tắt phân chia:</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Freelancer nhận:</span>
              <strong>{formatCurrency(releaseAmount, dispute.currency)}</strong>
            </div>
            <div className="summary-item">
              <span>Client được hoàn:</span>
              <strong>{formatCurrency(refundAmount, dispute.currency)}</strong>
            </div>
            <div className="summary-item">
              <span>Phí nền tảng:</span>
              <strong>{formatCurrency(totalAmount - releaseAmount - refundAmount, dispute.currency)}</strong>
            </div>
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Lý do và giải thích</h3>
        <textarea
          {...register('reasoning', { 
            required: 'Vui lòng nhập lý do đề xuất',
            minLength: { value: 50, message: 'Lý do phải có ít nhất 50 ký tự' }
          })}
          className="form-textarea"
          placeholder="Giải thích chi tiết lý do đề xuất phân chia này..."
          rows={5}
        />
        {errors.reasoning && (
          <span className="error">{errors.reasoning.message}</span>
        )}
      </div>
      
      <div className="form-section">
        <h3>Thời hạn phản hồi</h3>
        <select
          {...register('responseDeadlineDays', { required: true })}
          className="form-select"
        >
          <option value={3}>3 ngày</option>
          <option value={7}>7 ngày</option>
          <option value={14}>14 ngày</option>
        </select>
      </div>
      
      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={!isValidSplit}
        >
          Gửi đề xuất hòa giải
        </button>
      </div>
    </form>
  )
}
```

## 3. Client/Freelancer Response Component

```typescript
// MediationResponseCard.tsx
interface MediationResponseCardProps {
  proposal: MediationProposal
  userRole: 'CLIENT' | 'FREELANCER'
  onRespond: (response: MediationResponseInput) => void
}

const MediationResponseCard: React.FC<MediationResponseCardProps> = ({
  proposal,
  userRole,
  onRespond
}) => {
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [response, setResponse] = useState<'ACCEPTED' | 'REJECTED' | null>(null)
  const [message, setMessage] = useState('')
  
  const userResponse = userRole === 'CLIENT' ? proposal.clientResponse : proposal.freelancerResponse
  const otherResponse = userRole === 'CLIENT' ? proposal.freelancerResponse : proposal.clientResponse
  const otherRole = userRole === 'CLIENT' ? 'Freelancer' : 'Client'
  
  const handleSubmitResponse = () => {
    if (!response) return
    
    onRespond({
      proposalId: proposal.id,
      response,
      message: message.trim() || undefined
    })
    
    setShowResponseForm(false)
  }
  
  return (
    <div className="mediation-response-card">
      <div className="card-header">
        <h3>Đề xuất hòa giải từ Admin</h3>
        <span className="proposal-date">
          {formatDateTime(proposal.createdAt)}
        </span>
      </div>
      
      <div className="proposal-content">
        <div className="amount-breakdown">
          <div className="amount-item">
            <label>Freelancer nhận:</label>
            <span className="amount">
              {formatCurrency(proposal.releaseAmount, proposal.currency)}
            </span>
          </div>
          <div className="amount-item">
            <label>Client được hoàn:</label>
            <span className="amount">
              {formatCurrency(proposal.refundAmount, proposal.currency)}
            </span>
          </div>
        </div>
        
        <div className="reasoning">
          <h4>Lý do đề xuất:</h4>
          <p>{proposal.reasoning}</p>
        </div>
        
        <div className="deadline">
          <strong>Hạn phản hồi: {formatDateTime(proposal.responseDeadline)}</strong>
        </div>
      </div>
      
      <div className="response-status">
        <div className="status-grid">
          <div className="status-item">
            <label>Phản hồi của bạn:</label>
            <span className={`status ${userResponse?.toLowerCase()}`}>
              {userResponse === 'PENDING' ? 'Chờ phản hồi' : 
               userResponse === 'ACCEPTED' ? 'Đã đồng ý' : 
               userResponse === 'REJECTED' ? 'Đã từ chối' : 'Chưa phản hồi'}
            </span>
          </div>
          <div className="status-item">
            <label>Phản hồi của {otherRole}:</label>
            <span className={`status ${otherResponse?.toLowerCase()}`}>
              {otherResponse === 'PENDING' ? 'Chờ phản hồi' : 
               otherResponse === 'ACCEPTED' ? 'Đã đồng ý' : 
               otherResponse === 'REJECTED' ? 'Đã từ chối' : 'Chưa phản hồi'}
            </span>
          </div>
        </div>
      </div>
      
      {userResponse === 'PENDING' && !showResponseForm && (
        <div className="response-actions">
          <button 
            className="btn btn-success"
            onClick={() => {
              setResponse('ACCEPTED')
              setShowResponseForm(true)
            }}
          >
            Đồng ý
          </button>
          <button 
            className="btn btn-error"
            onClick={() => {
              setResponse('REJECTED')
              setShowResponseForm(true)
            }}
          >
            Từ chối
          </button>
        </div>
      )}
      
      {showResponseForm && (
        <div className="response-form">
          <h4>
            {response === 'ACCEPTED' ? 'Xác nhận đồng ý' : 'Lý do từ chối'}
          </h4>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              response === 'ACCEPTED' 
                ? 'Tin nhắn xác nhận (tùy chọn)...'
                : 'Vui lòng cho biết lý do từ chối...'
            }
            className="form-textarea"
            rows={3}
          />
          <div className="form-actions">
            <button 
              className="btn btn-primary"
              onClick={handleSubmitResponse}
            >
              Xác nhận
            </button>
            <button 
              className="btn btn-ghost"
              onClick={() => setShowResponseForm(false)}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
      
      {userResponse === 'ACCEPTED' && otherResponse === 'ACCEPTED' && (
        <div className="success-message">
          <div className="alert alert-success">
            <CheckCircle className="icon" />
            <div>
              <h4>Hòa giải thành công!</h4>
              <p>Cả hai bên đã đồng ý với đề xuất. Tiền sẽ được chuyển theo thỏa thuận.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

## 4. Escalation Form

```typescript
// EscalationForm.tsx
interface EscalationFormProps {
  dispute: AdminDisputeDetail
  onEscalate: (data: EscalationInput) => void
}

const EscalationForm: React.FC<EscalationFormProps> = ({
  dispute,
  onEscalate
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<EscalationInput>()
  
  const authorityOptions = [
    { value: 'VIAC', label: 'Trung tâm Trọng tài Quốc tế Việt Nam (VIAC)' },
    { value: 'COURT', label: 'Tòa án nhân dân' },
    { value: 'CONSUMER_PROTECTION', label: 'Cục Bảo vệ Người tiêu dùng' },
    { value: 'OTHER', label: 'Cơ quan khác' }
  ]
  
  return (
    <form onSubmit={handleSubmit(onEscalate)} className="escalation-form">
      <div className="warning-section">
        <div className="alert alert-warning">
          <AlertTriangle className="icon" />
          <div>
            <h4>Chuyển lên cơ quan có thẩm quyền</h4>
            <p>Hành động này sẽ kết thúc quá trình hòa giải nội bộ và chuyển vụ việc lên cơ quan có thẩm quyền xử lý.</p>
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Lý do chuyển</h3>
        <textarea
          {...register('reason', { 
            required: 'Vui lòng nhập lý do chuyển',
            minLength: { value: 100, message: 'Lý do phải có ít nhất 100 ký tự' }
          })}
          className="form-textarea"
          placeholder="Mô tả chi tiết lý do tại sao cần chuyển lên cơ quan có thẩm quyền..."
          rows={5}
        />
        {errors.reason && (
          <span className="error">{errors.reason.message}</span>
        )}
      </div>
      
      <div className="form-section">
        <h3>Cơ quan tiếp nhận</h3>
        <select
          {...register('authorityType', { required: 'Vui lòng chọn cơ quan' })}
          className="form-select"
        >
          <option value="">Chọn cơ quan...</option>
          {authorityOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.authorityType && (
          <span className="error">{errors.authorityType.message}</span>
        )}
      </div>
      
      <div className="form-section">
        <h3>Thông tin liên hệ cơ quan</h3>
        <div className="input-grid">
          <div className="input-group">
            <label>Tên cơ quan:</label>
            <input
              type="text"
              {...register('authorityName')}
              className="form-input"
              placeholder="Tên đầy đủ của cơ quan..."
            />
          </div>
          <div className="input-group">
            <label>Thông tin liên hệ:</label>
            <input
              type="text"
              {...register('authorityContact')}
              className="form-input"
              placeholder="Email hoặc số điện thoại..."
            />
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Tùy chọn gói tài liệu</h3>
        <div className="checkbox-group">
          <label className="checkbox-item">
            <input type="checkbox" {...register('includeChatLogs')} />
            <span>Bao gồm lịch sử chat</span>
          </label>
          <label className="checkbox-item">
            <input type="checkbox" {...register('includePaymentHistory')} />
            <span>Bao gồm lịch sử thanh toán</span>
          </label>
          <label className="checkbox-item">
            <input type="checkbox" {...register('includeNegotiationHistory')} />
            <span>Bao gồm lịch sử thương lượng</span>
          </label>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Ghi chú bổ sung</h3>
        <textarea
          {...register('notes')}
          className="form-textarea"
          placeholder="Thông tin bổ sung cho cơ quan tiếp nhận..."
          rows={3}
        />
      </div>
      
      <div className="form-actions">
        <button type="submit" className="btn btn-error">
          Xác nhận chuyển cơ quan
        </button>
      </div>
    </form>
  )
}
```