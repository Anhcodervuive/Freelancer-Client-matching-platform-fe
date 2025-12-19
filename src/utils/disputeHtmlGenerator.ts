import type { DisputeDocumentPackage } from '~/apis/dispute-document-export.api'

export class DisputeHtmlGenerator {
  private formatDateTime(dateString?: string | null): string {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleString('vi-VN')
    } catch {
      return dateString
    }
  }

  private formatCurrency(amount?: number | null, currency?: string | null): string {
    if (amount == null) return '—'
    try {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(amount)
    } catch {
      return `${amount} ${currency || 'USD'}`
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private generateStyles(): string {
    return `
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          color: #1e40af;
          font-size: 28px;
          margin: 0 0 10px 0;
          font-weight: bold;
        }
        
        .header .dispute-info {
          background: #eff6ff;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }
        
        .section {
          margin-bottom: 40px;
          break-inside: avoid;
        }
        
        .section-title {
          color: #1e40af;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .subsection-title {
          color: #374151;
          font-size: 16px;
          font-weight: bold;
          margin: 20px 0 10px 0;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .info-item {
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid #3b82f6;
        }
        
        .info-label {
          font-weight: bold;
          color: #374151;
          font-size: 14px;
        }
        
        .info-value {
          color: #111827;
          margin-top: 4px;
          word-wrap: break-word;
        }
        
        .description-box {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }
        
        .participants {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .participant-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
        }
        
        .participant-title {
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .milestone-card {
          background: #fefefe;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
          break-inside: avoid;
        }
        
        .milestone-header {
          background: #3b82f6;
          color: white;
          padding: 10px 15px;
          margin: -20px -20px 15px -20px;
          border-radius: 8px 8px 0 0;
          font-weight: bold;
        }
        
        .submission-item {
          background: #f1f5f9;
          border-left: 4px solid #10b981;
          padding: 12px;
          margin: 10px 0;
          border-radius: 0 6px 6px 0;
        }
        
        .negotiation-item {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
        }
        
        .evidence-item {
          background: #ecfdf5;
          border: 1px solid #10b981;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
        }
        
        .chat-message {
          background: #f3f4f6;
          border-radius: 8px;
          padding: 10px;
          margin: 8px 0;
          border-left: 3px solid #6b7280;
        }
        
        .chat-header {
          font-weight: bold;
          color: #374151;
          font-size: 12px;
          margin-bottom: 5px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-active { background: #dcfce7; color: #166534; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-completed { background: #dbeafe; color: #1e40af; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        
        .amount-highlight {
          font-weight: bold;
          color: #059669;
          font-size: 16px;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          z-index: 1000;
        }
        
        .print-button:hover {
          background: #2563eb;
        }
        
        @media print {
          .print-button { display: none; }
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        
        th, td {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
        }
        
        th {
          background: #f3f4f6;
          font-weight: bold;
        }
      </style>
    `
  }

  public generateDisputeDocument(data: DisputeDocumentPackage): string {
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tài liệu tranh chấp #${data.dispute.id}</title>
        ${this.generateStyles()}
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ In tài liệu</button>
        
        <div class="header">
          <h1>TÀI LIỆU TRANH CHẤP</h1>
          <div class="dispute-info">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              <div><strong>Mã tranh chấp:</strong> ${this.escapeHtml(data.dispute.id)}</div>
              <div><strong>Trạng thái:</strong> <span class="status-badge status-${data.dispute.status.toLowerCase()}">${this.escapeHtml(data.dispute.status)}</span></div>
              <div><strong>Ngày tạo:</strong> ${this.formatDateTime(data.dispute.createdAt)}</div>
              <div><strong>Ngày tạo tài liệu:</strong> ${this.formatDateTime(new Date().toISOString())}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">1. THÔNG TIN TRANH CHẤP</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Mã tranh chấp</div>
              <div class="info-value">${this.escapeHtml(data.dispute.id)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Trạng thái</div>
              <div class="info-value">${this.escapeHtml(data.dispute.status)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Ngày tạo</div>
              <div class="info-value">${this.formatDateTime(data.dispute.createdAt)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Ngày quyết định</div>
              <div class="info-value">${this.formatDateTime(data.dispute.decidedAt)}</div>
            </div>
          </div>
          
          <div class="info-item" style="grid-column: 1 / -1;">
            <div class="info-label">Lý do tranh chấp</div>
            <div class="info-value">${this.escapeHtml(data.dispute.reason)}</div>
          </div>
          
          ${data.dispute.description ? `
            <div class="description-box">
              <strong>Mô tả chi tiết:</strong><br>
              ${this.escapeHtml(data.dispute.description)}
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2 class="section-title">2. THÔNG TIN HỢP ĐỒNG</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Mã hợp đồng</div>
              <div class="info-value">${this.escapeHtml(data.contract.id)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Tổng giá trị</div>
              <div class="info-value amount-highlight">${this.formatCurrency(data.contract.totalAmount)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Ngày bắt đầu</div>
              <div class="info-value">${this.formatDateTime(data.contract.startedAt)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Ngày kết thúc</div>
              <div class="info-value">${this.formatDateTime(data.contract.endedAt)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Trạng thái hợp đồng</div>
              <div class="info-value">${this.escapeHtml(data.contract.status)}</div>
            </div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Tiêu đề hợp đồng</div>
            <div class="info-value">${this.escapeHtml(data.contract.title)}</div>
          </div>
          
          ${data.contract.description ? `
            <div class="description-box">
              <strong>Mô tả hợp đồng:</strong><br>
              ${this.escapeHtml(data.contract.description)}
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2 class="section-title">3. THÔNG TIN CÔNG VIỆC</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Mã công việc</div>
              <div class="info-value">${this.escapeHtml(data.jobPost.id)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Loại ngân sách</div>
              <div class="info-value">${this.escapeHtml(data.jobPost.budgetType)}</div>
            </div>
            ${data.jobPost.budgetAmount ? `
              <div class="info-item">
                <div class="info-label">Số tiền ngân sách</div>
                <div class="info-value amount-highlight">${this.formatCurrency(data.jobPost.budgetAmount)}</div>
              </div>
            ` : ''}
            <div class="info-item">
              <div class="info-label">Ngày tạo</div>
              <div class="info-value">${this.formatDateTime(data.jobPost.createdAt)}</div>
            </div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Tiêu đề công việc</div>
            <div class="info-value">${this.escapeHtml(data.jobPost.title)}</div>
          </div>
          
          ${data.jobPost.description ? `
            <div class="description-box">
              <strong>Mô tả công việc:</strong><br>
              ${this.escapeHtml(data.jobPost.description)}
            </div>
          ` : ''}
          
          ${data.jobPost.requirements ? `
            <div class="description-box">
              <strong>Yêu cầu:</strong><br>
              ${this.escapeHtml(data.jobPost.requirements)}
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2 class="section-title">4. CÁC BÊN THAM GIA</h2>
          <div class="participants">
            <div class="participant-card">
              <div class="participant-title">👤 Khách hàng</div>
              <div><strong>ID:</strong> ${this.escapeHtml(data.participants.client.id)}</div>
              <div><strong>Tên:</strong> ${this.escapeHtml(data.participants.client.name)}</div>
              <div><strong>Email:</strong> ${this.escapeHtml(data.participants.client.email)}</div>
            </div>
            
            <div class="participant-card">
              <div class="participant-title">💼 Freelancer</div>
              <div><strong>ID:</strong> ${this.escapeHtml(data.participants.freelancer.id)}</div>
              <div><strong>Tên:</strong> ${this.escapeHtml(data.participants.freelancer.name)}</div>
              <div><strong>Email:</strong> ${this.escapeHtml(data.participants.freelancer.email)}</div>
            </div>
            
            ${data.participants.admin ? `
              <div class="participant-card">
                <div class="participant-title">⚖️ Admin phụ trách</div>
                <div><strong>ID:</strong> ${this.escapeHtml(data.participants.admin.id)}</div>
                <div><strong>Tên:</strong> ${this.escapeHtml(data.participants.admin.name)}</div>
                <div><strong>Email:</strong> ${this.escapeHtml(data.participants.admin.email)}</div>
              </div>
            ` : ''}
          </div>
        </div>

        ${data.milestones.length > 0 ? `
          <div class="section page-break">
            <h2 class="section-title">5. THÔNG TIN MILESTONES</h2>
            ${data.milestones.map((milestone, index) => `
              <div class="milestone-card">
                <div class="milestone-header">
                  🎯 Milestone ${index + 1}: ${this.escapeHtml(milestone.title)}
                </div>
                
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">ID</div>
                    <div class="info-value">${this.escapeHtml(milestone.id)}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Số tiền</div>
                    <div class="info-value amount-highlight">${this.formatCurrency(milestone.amount)}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Ngày bắt đầu</div>
                    <div class="info-value">${this.formatDateTime(milestone.startAt)}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Ngày kết thúc</div>
                    <div class="info-value">${this.formatDateTime(milestone.endAt)}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Trạng thái</div>
                    <div class="info-value">${this.escapeHtml(milestone.status)}</div>
                  </div>
                </div>
                
                ${milestone.description ? `
                  <div class="description-box">
                    <strong>Mô tả:</strong><br>
                    ${this.escapeHtml(milestone.description)}
                  </div>
                ` : ''}

                ${milestone.submissions.length > 0 ? `
                  <h4 style="margin-top: 20px; color: #374151;">📋 Bài nộp (${milestone.submissions.length})</h4>
                  ${milestone.submissions.map((submission, subIndex) => `
                    <div class="submission-item">
                      <div><strong>Bài nộp ${subIndex + 1}</strong></div>
                      <div><strong>Ngày nộp:</strong> ${this.formatDateTime(submission.submittedAt)}</div>
                      ${submission.description ? `<div><strong>Mô tả:</strong> ${this.escapeHtml(submission.description)}</div>` : ''}
                      ${submission.feedback ? `
                        <div style="margin-top: 10px; padding: 8px; background: #f0f9ff; border-radius: 4px;">
                          <div><strong>Đánh giá:</strong> ${submission.feedback.rating || 0}/5 ⭐</div>
                          ${submission.feedback.comment ? `<div><strong>Nhận xét:</strong> ${this.escapeHtml(submission.feedback.comment)}</div>` : ''}
                          <div><strong>Ngày đánh giá:</strong> ${this.formatDateTime(submission.feedback.createdAt)}</div>
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${(data.negotiations.directNegotiation.length > 0 || data.negotiations.mediationProposals.length > 0) ? `
          <div class="section page-break">
            <h2 class="section-title">6. LỊCH SỬ THƯƠNG LƯỢNG</h2>
            
            ${data.negotiations.directNegotiation.length > 0 ? `
              <h3 class="subsection-title">🤝 Thương lượng trực tiếp (${data.negotiations.directNegotiation.length})</h3>
              ${data.negotiations.directNegotiation.map((negotiation, index) => `
                <div class="negotiation-item">
                  <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                    <strong>${index + 1}. ${this.escapeHtml(negotiation.type)} - ${this.escapeHtml(negotiation.status)}</strong>
                  </div>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Người đề xuất</div>
                      <div class="info-value">${this.escapeHtml(negotiation.proposerName)} (${this.escapeHtml(negotiation.proposerRole)})</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Ngày tạo</div>
                      <div class="info-value">${this.formatDateTime(negotiation.createdAt)}</div>
                    </div>
                    ${negotiation.amount ? `
                      <div class="info-item">
                        <div class="info-label">Số tiền</div>
                        <div class="info-value amount-highlight">${this.formatCurrency(negotiation.amount)}</div>
                      </div>
                    ` : ''}
                    ${negotiation.respondedAt ? `
                      <div class="info-item">
                        <div class="info-label">Ngày phản hồi</div>
                        <div class="info-value">${this.formatDateTime(negotiation.respondedAt)}</div>
                      </div>
                    ` : ''}
                  </div>
                  ${negotiation.description ? `
                    <div class="description-box">
                      <strong>Mô tả:</strong><br>
                      ${this.escapeHtml(negotiation.description)}
                    </div>
                  ` : ''}
                  ${negotiation.responseReason ? `
                    <div class="description-box">
                      <strong>Lý do phản hồi:</strong><br>
                      ${this.escapeHtml(negotiation.responseReason)}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            ` : ''}

            ${data.negotiations.mediationProposals.length > 0 ? `
              <h3 class="subsection-title">⚖️ Đề xuất hòa giải (${data.negotiations.mediationProposals.length})</h3>
              ${data.negotiations.mediationProposals.map((proposal, index) => `
                <div class="negotiation-item">
                  <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                    <strong>${index + 1}. Đề xuất từ ${this.escapeHtml(proposal.adminName)} - ${this.escapeHtml(proposal.status)}</strong>
                  </div>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Ngày tạo</div>
                      <div class="info-value">${this.formatDateTime(proposal.createdAt)}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Loại</div>
                      <div class="info-value">${this.escapeHtml(proposal.type)}</div>
                    </div>
                    ${proposal.clientAmount ? `
                      <div class="info-item">
                        <div class="info-label">Số tiền cho khách hàng</div>
                        <div class="info-value amount-highlight">${this.formatCurrency(proposal.clientAmount)}</div>
                      </div>
                    ` : ''}
                    ${proposal.freelancerAmount ? `
                      <div class="info-item">
                        <div class="info-label">Số tiền cho freelancer</div>
                        <div class="info-value amount-highlight">${this.formatCurrency(proposal.freelancerAmount)}</div>
                      </div>
                    ` : ''}
                  </div>
                  
                  <div class="description-box">
                    <strong>Lý do:</strong><br>
                    ${this.escapeHtml(proposal.reasoning)}
                  </div>

                  ${proposal.clientResponse ? `
                    <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin: 10px 0;">
                      <strong>👤 Phản hồi khách hàng:</strong> ${this.escapeHtml(proposal.clientResponse.status)}
                      ${proposal.clientResponse.respondedAt ? `<br><strong>Ngày:</strong> ${this.formatDateTime(proposal.clientResponse.respondedAt)}` : ''}
                      ${proposal.clientResponse.reason ? `<br><strong>Lý do:</strong> ${this.escapeHtml(proposal.clientResponse.reason)}` : ''}
                    </div>
                  ` : ''}

                  ${proposal.freelancerResponse ? `
                    <div style="background: #dbeafe; padding: 10px; border-radius: 6px; margin: 10px 0;">
                      <strong>💼 Phản hồi freelancer:</strong> ${this.escapeHtml(proposal.freelancerResponse.status)}
                      ${proposal.freelancerResponse.respondedAt ? `<br><strong>Ngày:</strong> ${this.formatDateTime(proposal.freelancerResponse.respondedAt)}` : ''}
                      ${proposal.freelancerResponse.reason ? `<br><strong>Lý do:</strong> ${this.escapeHtml(proposal.freelancerResponse.reason)}` : ''}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            ` : ''}
          </div>
        ` : ''}

        ${data.evidenceSubmissions.length > 0 ? `
          <div class="section page-break">
            <h2 class="section-title">7. BẰNG CHỨNG ĐÃ NỘP</h2>
            ${data.evidenceSubmissions.map((evidence, index) => `
              <div class="evidence-item">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                  <strong>📋 Bằng chứng ${index + 1}: ${this.escapeHtml(evidence.title)}</strong>
                </div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Người nộp</div>
                    <div class="info-value">${this.escapeHtml(evidence.submitterName)} (${this.escapeHtml(evidence.submitterRole)})</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Ngày nộp</div>
                    <div class="info-value">${this.formatDateTime(evidence.submittedAt)}</div>
                  </div>
                </div>
                
                ${evidence.description ? `
                  <div class="description-box">
                    <strong>Mô tả:</strong><br>
                    ${this.escapeHtml(evidence.description)}
                  </div>
                ` : ''}

                ${evidence.items.length > 0 ? `
                  <div style="margin-top: 15px;">
                    <strong>📎 Tài liệu đính kèm (${evidence.items.length}):</strong>
                    <div style="margin-top: 10px;">
                      ${evidence.items.map((item, itemIndex) => `
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin: 8px 0;">
                          <div><strong>${this.escapeHtml(item.title || `Tài liệu ${itemIndex + 1}`)}</strong></div>
                          <div><strong>Loại:</strong> ${this.escapeHtml(item.type)}</div>
                          ${item.description ? `<div><strong>Mô tả:</strong> ${this.escapeHtml(item.description)}</div>` : ''}
                          ${item.fileUrl ? `<div><strong>URL:</strong> <a href="${this.escapeHtml(item.fileUrl)}" target="_blank">${this.escapeHtml(item.fileUrl)}</a></div>` : ''}
                          ${item.linkUrl ? `<div><strong>Liên kết:</strong> <a href="${this.escapeHtml(item.linkUrl)}" target="_blank">${this.escapeHtml(item.linkUrl)}</a></div>` : ''}
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${data.chatHistory.length > 0 ? `
          <div class="section page-break">
            <h2 class="section-title">8. LỊCH SỬ CHAT (TÓM TẮT)</h2>
            <div class="info-item">
              <div class="info-label">Tổng số tin nhắn</div>
              <div class="info-value">${data.chatHistory.length}</div>
            </div>
            
            <h3 class="subsection-title">💬 10 tin nhắn gần nhất:</h3>
            ${data.chatHistory.slice(-10).map((message, index) => `
              <div class="chat-message">
                <div class="chat-header">
                  ${index + 1}. [${this.formatDateTime(message.createdAt)}] ${this.escapeHtml(message.senderName)} (${this.escapeHtml(message.senderRole)})
                </div>
                <div>${this.escapeHtml(message.content)}</div>
                ${message.attachments.length > 0 ? `
                  <div style="margin-top: 5px; font-size: 11px; color: #6b7280;">
                    📎 Đính kèm: ${message.attachments.length} tệp
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="footer">
          <div style="border-top: 1px solid #d1d5db; padding-top: 20px;">
            <p><strong>Tài liệu được tạo tự động vào:</strong> ${this.formatDateTime(new Date().toISOString())}</p>
            <p>Đây là bản sao đầy đủ của hồ sơ tranh chấp để phục vụ mục đích giải quyết bên ngoài.</p>
            <p style="margin-top: 15px; font-style: italic;">
              Để lưu thành PDF: Nhấn Ctrl+P (Windows) hoặc Cmd+P (Mac), chọn "Save as PDF" trong phần Destination.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return html
  }
}

export const generateDisputeHtml = (data: DisputeDocumentPackage): string => {
  const generator = new DisputeHtmlGenerator()
  return generator.generateDisputeDocument(data)
}