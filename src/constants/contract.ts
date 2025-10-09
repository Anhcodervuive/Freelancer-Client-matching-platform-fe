export type ContractStatusKey =
        | 'DRAFT'
        | 'PENDING'
        | 'ACTIVE'
        | 'IN_PROGRESS'
        | 'PAUSED'
        | 'ON_HOLD'
        | 'COMPLETED'
        | 'ENDED'
        | 'CANCELLED'
        | 'CLOSED'
        | 'SUSPENDED'
        | 'WITHDRAWN'
        | 'EXPIRED'
        | 'ARCHIVED'

export const CONTRACT_STATUS_META: Record<ContractStatusKey, { label: string; badge: string; text: string }> = {
        DRAFT: { label: 'Nháp', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
        PENDING: { label: 'Đang chờ', badge: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
        ACTIVE: { label: 'Đang hoạt động', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
        IN_PROGRESS: { label: 'Đang thực hiện', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
        PAUSED: { label: 'Tạm dừng', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
        ON_HOLD: { label: 'Tạm hoãn', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
        COMPLETED: { label: 'Hoàn thành', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
        ENDED: { label: 'Đã kết thúc', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
        CANCELLED: { label: 'Đã hủy', badge: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
        CLOSED: { label: 'Đóng', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
        SUSPENDED: { label: 'Bị tạm khóa', badge: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
        WITHDRAWN: { label: 'Đã rút', badge: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
        EXPIRED: { label: 'Hết hạn', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
        ARCHIVED: { label: 'Đã lưu trữ', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' }
}

export const CONTRACT_STATUS_DESCRIPTIONS: Record<ContractStatusKey, string> = {
        DRAFT: 'Hợp đồng đang được soạn thảo và chưa bắt đầu triển khai.',
        PENDING: 'Hợp đồng đang chờ các bên xác nhận trước khi bắt đầu.',
        ACTIVE: 'Hai bên đang cộng tác theo các điều khoản đã thống nhất.',
        IN_PROGRESS: 'Công việc và milestones đang được thực hiện.',
        PAUSED: 'Hợp đồng tạm thời dừng lại cho đến khi được mở lại.',
        ON_HOLD: 'Hợp đồng đang tạm hoãn bởi một trong hai bên.',
        COMPLETED: 'Hợp đồng đã hoàn tất và chờ các bước kết thúc cuối cùng.',
        ENDED: 'Hợp đồng đã kết thúc theo kế hoạch.',
        CANCELLED: 'Hợp đồng đã bị hủy và sẽ không tiếp tục.',
        CLOSED: 'Hợp đồng đã đóng và không còn hoạt động.',
        SUSPENDED: 'Hợp đồng bị tạm khóa do vấn đề hoặc tranh chấp.',
        WITHDRAWN: 'Một bên đã rút khỏi hợp đồng này.',
        EXPIRED: 'Hợp đồng đã hết hạn hiệu lực.',
        ARCHIVED: 'Hợp đồng đã được lưu trữ để tham khảo.'
}

export const getContractStatusMeta = (status?: string | null) => {
        if (!status) {
                return {
                        label: 'Không xác định',
                        badge: 'bg-slate-100 border-slate-200',
                        text: 'text-slate-600'
                }
        }

        const normalized = status.toUpperCase() as ContractStatusKey
        const meta = CONTRACT_STATUS_META[normalized]
        if (meta) return meta

        return {
                label: status
                        .toLowerCase()
                        .split(/[_\s]+/)
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(' '),
                badge: 'bg-slate-100 border-slate-200',
                text: 'text-slate-600'
        }
}

export const getContractStatusDescription = (status?: string | null) => {
        if (!status) {
                return 'Trạng thái hợp đồng chưa được cập nhật.'
        }

        const normalized = status.toUpperCase() as ContractStatusKey
        return CONTRACT_STATUS_DESCRIPTIONS[normalized] ?? 'Trạng thái hợp đồng đã được cập nhật.'
}
