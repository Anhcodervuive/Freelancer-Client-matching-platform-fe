# Đề xuất cải tiến hệ thống hòa giải

## 1. Thêm enum trạng thái mới

```prisma
enum DisputeStatus {
  OPEN
  NEGOTIATION  
  INTERNAL_MEDIATION
  MEDIATION_SUCCESS        // Hòa giải thành công
  ESCALATED_TO_AUTHORITY   // Chuyển cơ quan có thẩm quyền
  RESOLVED_RELEASE_ALL
  RESOLVED_REFUND_ALL
  RESOLVED_SPLIT
  CANCELED
  EXPIRED
}

enum MediationProposalStatus {
  PENDING          // Chờ phản hồi
  ACCEPTED_BY_ALL  // Cả 2 bên đồng ý
  REJECTED         // Bị từ chối
  EXPIRED          // Hết hạn
}
```

## 2. Thêm bảng MediationProposal

```prisma
model MediationProposal {
  id                String                   @id @default(cuid())
  disputeId         String                   @map("dispute_id")
  proposedById      String                   @map("proposed_by_id") // Admin ID
  status            MediationProposalStatus  @default(PENDING)
  
  // Đề xuất giải pháp
  releaseAmount     Decimal                  @map("release_amount") @db.Decimal(15, 2)
  refundAmount      Decimal                  @map("refund_amount") @db.Decimal(15, 2)
  reasoning         String?                  @db.Text
  
  // Deadline phản hồi
  responseDeadline  DateTime                 @map("response_deadline")
  
  // Phản hồi từ các bên
  clientResponse    MediationResponse?       @default(PENDING)
  freelancerResponse MediationResponse?      @default(PENDING)
  clientRespondedAt DateTime?               @map("client_responded_at")
  freelancerRespondedAt DateTime?           @map("freelancer_responded_at")
  
  createdAt         DateTime                 @default(now()) @map("created_at")
  updatedAt         DateTime                 @updatedAt @map("updated_at")
  
  dispute           Dispute                  @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  proposedBy        User                     @relation(fields: [proposedById], references: [id])
  
  @@map("mediation_proposals")
}

enum MediationResponse {
  PENDING
  ACCEPTED
  REJECTED
}
```

## 3. Thêm bảng EscalationPackage

```prisma
model EscalationPackage {
  id                String    @id @default(cuid())
  disputeId         String    @unique @map("dispute_id")
  
  // Thông tin cơ quan tiếp nhận
  authorityName     String?   @map("authority_name") @db.VarChar(255)
  authorityContact  String?   @map("authority_contact") @db.VarChar(255)
  caseNumber        String?   @map("case_number") @db.VarChar(100)
  
  // Tài liệu đã chuẩn bị
  packageUrl        String?   @map("package_url") @db.VarChar(2048)
  documentHash      String?   @map("document_hash") @db.VarChar(64)
  
  // Metadata
  escalatedAt       DateTime  @default(now()) @map("escalated_at")
  escalatedById     String    @map("escalated_by_id")
  notes             String?   @db.Text
  
  dispute           Dispute   @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  escalatedBy       User      @relation(fields: [escalatedById], references: [id])
  
  @@map("escalation_packages")
}
```

## 4. Cập nhật bảng Dispute

```prisma
model Dispute {
  // ... existing fields
  
  // Thêm các trường mới
  mediationProposals    MediationProposal[]
  escalationPackage     EscalationPackage?
  mediationDeadline     DateTime?           @map("mediation_deadline")
  escalationReason      String?             @map("escalation_reason") @db.Text
  
  // ... rest of model
}
```