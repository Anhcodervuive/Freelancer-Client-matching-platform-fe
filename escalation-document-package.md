# Hệ thống tạo gói tài liệu chuyển cơ quan có thẩm quyền

## 1. Cấu trúc gói tài liệu

```typescript
interface EscalationDocumentPackage {
  // Metadata
  caseId: string
  generatedAt: string
  generatedBy: string
  
  // Thông tin cơ bản
  disputeOverview: {
    disputeId: string
    contractId: string
    milestoneId: string
    openedAt: string
    status: string
    disputedAmount: number
    currency: string
  }
  
  // Thông tin các bên
  parties: {
    client: PartyInfo
    freelancer: PartyInfo
  }
  
  // Chi tiết dự án
  projectDetails: {
    title: string
    description: string
    category: string
    skills: string[]
    timeline: string
    budget: number
  }
  
  // Lịch sử giao dịch
  transactionHistory: TransactionRecord[]
  
  // Lịch sử thương lượng
  negotiationHistory: NegotiationRecord[]
  
  // Đề xuất hòa giải
  mediationProposals: MediationProposalRecord[]
  
  // Bằng chứng
  evidence: EvidenceRecord[]
  
  // Chat logs (nếu được đồng ý)
  chatLogs?: ChatRecord[]
  
  // Tài liệu đính kèm
  attachments: AttachmentRecord[]
}
```

## 2. Service tạo gói tài liệu

```typescript
class EscalationDocumentService {
  async generateEscalationPackage(
    disputeId: string, 
    options: EscalationOptions
  ): Promise<EscalationPackage> {
    
    // 1. Thu thập dữ liệu
    const disputeData = await this.collectDisputeData(disputeId)
    const contractData = await this.collectContractData(disputeData.contractId)
    const transactionData = await this.collectTransactionHistory(disputeData.escrowId)
    const negotiationData = await this.collectNegotiationHistory(disputeId)
    const evidenceData = await this.collectEvidence(disputeId)
    
    // 2. Tạo document package
    const documentPackage: EscalationDocumentPackage = {
      caseId: `DISPUTE_${disputeId}_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      generatedBy: options.adminId,
      
      disputeOverview: this.buildDisputeOverview(disputeData),
      parties: this.buildPartiesInfo(contractData),
      projectDetails: this.buildProjectDetails(contractData),
      transactionHistory: transactionData,
      negotiationHistory: negotiationData,
      mediationProposals: await this.collectMediationProposals(disputeId),
      evidence: evidenceData,
      
      ...(options.includeChatLogs && {
        chatLogs: await this.collectChatLogs(contractData.id)
      }),
      
      attachments: await this.collectAttachments(disputeId)
    }
    
    // 3. Tạo PDF report
    const pdfBuffer = await this.generatePDFReport(documentPackage)
    
    // 4. Upload lên storage
    const packageUrl = await this.uploadPackage(pdfBuffer, documentPackage.caseId)
    
    // 5. Tạo hash để verify tính toàn vẹn
    const documentHash = this.generateDocumentHash(pdfBuffer)
    
    // 6. Lưu vào database
    const escalationPackage = await prismaClient.escalationPackage.create({
      data: {
        disputeId,
        packageUrl,
        documentHash,
        escalatedById: options.adminId,
        authorityName: options.authorityName,
        authorityContact: options.authorityContact,
        notes: options.notes
      }
    })
    
    return escalationPackage
  }
  
  private async generatePDFReport(data: EscalationDocumentPackage): Promise<Buffer> {
    // Sử dụng thư viện như puppeteer hoặc jsPDF
    const html = await this.renderHTMLTemplate(data)
    const pdf = await this.convertHTMLToPDF(html)
    return pdf
  }
  
  private generateDocumentHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }
}
```

## 3. Template HTML cho PDF

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hồ sơ Tranh chấp - {{caseId}}</title>
    <style>
        /* CSS styling cho PDF */
        body { font-family: 'Times New Roman', serif; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border: 1px solid #000; padding: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>HỒ SƠ TRANH CHẤP</h1>
        <h2>Mã số: {{caseId}}</h2>
        <p>Ngày tạo: {{generatedAt}}</p>
    </div>
    
    <div class="section">
        <h3>I. THÔNG TIN TỔNG QUAN</h3>
        <table class="table">
            <tr><td>Mã tranh chấp:</td><td>{{disputeId}}</td></tr>
            <tr><td>Mã hợp đồng:</td><td>{{contractId}}</td></tr>
            <tr><td>Số tiền tranh chấp:</td><td>{{disputedAmount}} {{currency}}</td></tr>
            <tr><td>Ngày mở tranh chấp:</td><td>{{openedAt}}</td></tr>
            <tr><td>Trạng thái hiện tại:</td><td>{{status}}</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>II. THÔNG TIN CÁC BÊN</h3>
        <h4>A. Bên thuê (Client)</h4>
        <table class="table">
            <tr><td>Họ tên:</td><td>{{client.name}}</td></tr>
            <tr><td>Email:</td><td>{{client.email}}</td></tr>
            <tr><td>Số điện thoại:</td><td>{{client.phone}}</td></tr>
            <tr><td>Địa chỉ:</td><td>{{client.address}}</td></tr>
        </table>
        
        <h4>B. Bên nhận việc (Freelancer)</h4>
        <table class="table">
            <tr><td>Họ tên:</td><td>{{freelancer.name}}</td></tr>
            <tr><td>Email:</td><td>{{freelancer.email}}</td></tr>
            <tr><td>Số điện thoại:</td><td>{{freelancer.phone}}</td></tr>
            <tr><td>Địa chỉ:</td><td>{{freelancer.address}}</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>III. CHI TIẾT DỰ ÁN</h3>
        <!-- Project details -->
    </div>
    
    <div class="section">
        <h3>IV. LỊCH SỬ GIAO DỊCH</h3>
        <!-- Transaction history -->
    </div>
    
    <div class="section">
        <h3>V. QUÁ TRÌNH THƯƠNG LƯỢNG</h3>
        <!-- Negotiation history -->
    </div>
    
    <div class="section">
        <h3>VI. ĐỀ XUẤT HÒA GIẢI</h3>
        <!-- Mediation proposals -->
    </div>
    
    <div class="section">
        <h3>VII. BẰNG CHỨNG</h3>
        <!-- Evidence -->
    </div>
    
    <div class="section">
        <h3>VIII. KẾT LUẬN VÀ KIẾN NGHỊ</h3>
        <p>Sau quá trình hòa giải nội bộ, hai bên không đạt được thỏa thuận. 
        Nền tảng kiến nghị cơ quan có thẩm quyền xem xét và giải quyết tranh chấp này.</p>
    </div>
    
    <div class="footer">
        <p>Hồ sơ này được tạo tự động bởi hệ thống và có giá trị pháp lý.</p>
        <p>Mã hash xác thực: {{documentHash}}</p>
    </div>
</body>
</html>
```

## 4. API endpoint tạo gói tài liệu

```typescript
// POST /admin/disputes/:disputeId/escalation-package
export const generateEscalationPackage = async (req: Request, res: Response) => {
  const adminId = ensureAdminUser(req).id
  const { disputeId } = req.params
  const options = EscalationOptionsSchema.parse(req.body)
  
  const escalationService = new EscalationDocumentService()
  const packageData = await escalationService.generateEscalationPackage(
    disputeId, 
    { ...options, adminId }
  )
  
  // Cập nhật trạng thái dispute
  await prismaClient.dispute.update({
    where: { id: disputeId },
    data: { 
      status: DisputeStatus.ESCALATED_TO_AUTHORITY,
      escalationReason: options.reason
    }
  })
  
  // Gửi email thông báo cho các bên
  await sendEscalationNotifications(disputeId, packageData)
  
  return res.json({ 
    success: true, 
    packageUrl: packageData.packageUrl,
    caseId: packageData.caseId 
  })
}
```