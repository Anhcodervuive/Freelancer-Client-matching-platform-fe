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
