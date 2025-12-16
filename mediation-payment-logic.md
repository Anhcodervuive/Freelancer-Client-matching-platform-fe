# Logic chuyển tiền khi hòa giải thành công

## 1. Khi cả 2 bên đồng ý đề xuất hòa giải

```typescript
const processMediationSuccess = async (proposalId: string) => {
  const proposal = await prismaClient.mediationProposal.findUnique({
    where: { id: proposalId },
    include: { 
      dispute: { 
        include: { 
          escrow: true,
          milestone: { include: { contract: true } }
        } 
      } 
    }
  })

  if (!proposal) throw new Error('Proposal not found')
  
  // Kiểm tra cả 2 bên đã đồng ý
  if (proposal.clientResponse !== 'ACCEPTED' || 
      proposal.freelancerResponse !== 'ACCEPTED') {
    throw new Error('Both parties must accept the proposal')
  }

  await prismaClient.$transaction(async (tx) => {
    // 1. Cập nhật trạng thái dispute
    await tx.dispute.update({
      where: { id: proposal.disputeId },
      data: { 
        status: DisputeStatus.MEDIATION_SUCCESS,
        decidedRelease: proposal.releaseAmount,
        decidedRefund: proposal.refundAmount,
        decidedAt: new Date(),
        decidedById: proposal.proposedById
      }
    })

    // 2. Cập nhật escrow
    await tx.escrow.update({
      where: { id: proposal.dispute.escrowId },
      data: { 
        status: EscrowStatus.DISPUTE_RESOLVED,
        resolvedAt: new Date()
      }
    })

    // 3. Tạo payment release cho freelancer (nếu có)
    if (proposal.releaseAmount.gt(0)) {
      await createPaymentRelease({
        escrowId: proposal.dispute.escrowId,
        amount: proposal.releaseAmount,
        reason: 'MEDIATION_AGREEMENT',
        processedById: proposal.proposedById
      })
    }

    // 4. Tạo refund cho client (nếu có)  
    if (proposal.refundAmount.gt(0)) {
      await createPaymentRefund({
        escrowId: proposal.dispute.escrowId,
        amount: proposal.refundAmount,
        reason: 'MEDIATION_AGREEMENT',
        processedById: proposal.proposedById
      })
    }

    // 5. Cập nhật milestone status
    await tx.milestone.update({
      where: { id: proposal.dispute.milestone.id },
      data: { 
        status: MilestoneStatus.DISPUTE_RESOLVED,
        resolvedAt: new Date()
      }
    })

    // 6. Log activity
    await tx.jobActivityLog.create({
      data: {
        jobId: proposal.dispute.milestone.contract.jobId,
        actorId: proposal.proposedById,
        actorRole: Role.ADMIN,
        action: 'MEDIATION_SUCCESS',
        metadata: {
          disputeId: proposal.disputeId,
          proposalId: proposal.id,
          releaseAmount: proposal.releaseAmount.toNumber(),
          refundAmount: proposal.refundAmount.toNumber()
        }
      }
    })
  })

  // 7. Gửi email thông báo
  await sendMediationSuccessEmails(proposal)
  
  // 8. Gửi notification
  await sendMediationSuccessNotifications(proposal)
}
```

## 2. Điều khoản bổ sung cho Terms of Service

### Điều khoản về Hòa giải Tranh chấp

**Điều X: Quy trình Hòa giải**

1. **Hòa giải nội bộ**: Khi phát sinh tranh chấp, Nền tảng sẽ hỗ trợ hòa giải thông qua đội ngũ quản trị viên có kinh nghiệm.

2. **Đề xuất hòa giải**: Admin có quyền đề xuất phương án giải quyết dựa trên:
   - Bằng chứng do các bên cung cấp
   - Lịch sử giao dịch và tương tác
   - Các quy định của Nền tảng
   - Pháp luật hiện hành

3. **Thời hạn phản hồi**: Các bên có 7 ngày làm việc để phản hồi đề xuất hòa giải.

4. **Hiệu lực quyết định**: Khi cả hai bên đồng ý, đề xuất hòa giải có hiệu lực ngay lập tức và không thể thay đổi.

5. **Chuyển cơ quan có thẩm quyền**: Nếu hòa giải không thành công, Nền tảng sẽ:
   - Cung cấp đầy đủ tài liệu liên quan
   - Hỗ trợ liên hệ với cơ quan có thẩm quyền
   - Tạm giữ số tiền tranh chấp cho đến khi có quyết định cuối cùng

**Điều Y: Phí và Chi phí**

1. **Miễn phí hòa giải**: Nền tảng không thu phí cho dịch vụ hòa giải nội bộ.

2. **Chi phí pháp lý**: Các chi phí phát sinh khi chuyển lên cơ quan có thẩm quyền do các bên tự chịu.

**Điều Z: Cam kết và Trách nhiệm**

1. **Tính trung lập**: Nền tảng cam kết giữ thái độ trung lập, khách quan trong quá trình hòa giải.

2. **Bảo mật thông tin**: Mọi thông tin trong quá trình hòa giải được bảo mật tuyệt đối.

3. **Giới hạn trách nhiệm**: Nền tảng chỉ đóng vai trò hỗ trợ hòa giải, không chịu trách nhiệm về kết quả cuối cùng của tranh chấp.