import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminUserDetail } from '~/apis/admin/user.api'
import type { AdminUser } from '~/types/admin-user'
import { Role } from '~/types/user'
import { ROLE_LABELS } from '~/constants/roles'
import {
        BadgeCheck,
        Ban,
        AlertTriangle,
        CalendarClock,
        Lock,
        Mail,
        MapPin,
        Phone,
        RefreshCcw,
        Shield,
        UserRound,
        Users,
        StickyNote,
        Timer,
        Unlock
} from 'lucide-react'
import { z } from 'zod'
import type { BanAdminUserPayload, UnbanAdminUserPayload } from '~/apis/admin/user.api'

type AdminUserDetailModalProps = {
        open: boolean
        userId: string | null
        onClose: () => void
        onUpdateRole: (_role: Role) => Promise<void>
        onToggleStatus: (_isActive: boolean) => Promise<void>
        onBanUser: (_payload: BanAdminUserPayload) => Promise<void>
        onUnbanUser: (_payload: UnbanAdminUserPayload) => Promise<void>
        updatingRole: boolean
        updatingStatus: boolean
        banningUser: boolean
        unbanningUser: boolean
        currentUserId?: string | null
}

const roleOptions = Object.values(Role)

const BAN_REASON_OPTIONS: Array<{
        value: string
        label: string
        template: string
}> = [
        {
                value: 'fraud',
                label: 'Gian lận hoặc lừa đảo',
                template:
                        'Tài khoản bị phát hiện có dấu hiệu gian lận hoặc hành vi lừa đảo gây ảnh hưởng đến người dùng khác.'
        },
        {
                value: 'abuse',
                label: 'Ngôn từ/Ứng xử không phù hợp',
                template:
                        'Tài khoản sử dụng ngôn từ hoặc hành vi xúc phạm, quấy rối hoặc đe dọa các thành viên khác trong hệ thống.'
        },
        {
                value: 'spam',
                label: 'Spam hoặc quảng cáo trái phép',
                template:
                        'Tài khoản gửi hàng loạt nội dung spam hoặc quảng cáo trái phép gây ảnh hưởng tiêu cực tới trải nghiệm người dùng.'
        },
        {
                value: 'policy',
                label: 'Vi phạm chính sách nền tảng',
                template:
                        'Tài khoản vi phạm nghiêm trọng chính sách sử dụng nền tảng sau khi đã được cảnh báo.'
        },
        {
                value: 'custom',
                label: 'Khác (ghi rõ)',
                template: ''
        }
]

const banFormSchema = z
        .object({
                reason: z
                        .string()
                        .trim()
                        .min(10, 'Lý do phải có ít nhất 10 ký tự')
                        .max(255, 'Lý do không được vượt quá 255 ký tự'),
                note: z
                        .string()
                        .trim()
                        .min(1, 'Ghi chú không được để trống')
                        .max(500, 'Ghi chú không được vượt quá 500 ký tự')
                        .optional(),
                expiresAt: z.string().optional()
        })
        .superRefine((value, ctx) => {
                if (value.expiresAt) {
                        const date = new Date(value.expiresAt)
                        if (Number.isNaN(date.getTime())) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Thời gian hết hạn không hợp lệ',
                                        path: ['expiresAt']
                                })
                                return
                        }
                        if (date <= new Date()) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Thời gian hết hạn phải ở tương lai',
                                        path: ['expiresAt']
                                })
                        }
                }
        })

const formatDateTime = (value: string | undefined) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '—'
        return date.toLocaleString('vi-VN', {
                hour12: false
        })
}

const getDisplayName = (user?: AdminUser | null) => {
        if (!user) return '—'
        const first = user.profile?.firstName?.trim() ?? ''
        const last = user.profile?.lastName?.trim() ?? ''
        const fullname = [first, last].filter(Boolean).join(' ')
        return fullname || 'Chưa cập nhật tên'
}

const getInitials = (user?: AdminUser | null) => {
        if (!user) return '??'
        const first = user.profile?.firstName?.trim().charAt(0)
        const last = user.profile?.lastName?.trim().charAt(0)
        const emailFallback = user.email.charAt(0)
        return [first, last].filter(Boolean).join('').toUpperCase() || emailFallback.toUpperCase()
}

export default function AdminUserDetailModal({
        open,
        userId,
        onClose,
        onUpdateRole,
        onToggleStatus,
        onBanUser,
        onUnbanUser,
        updatingRole,
        updatingStatus,
        banningUser,
        unbanningUser,
        currentUserId
}: AdminUserDetailModalProps) {
        const { data, isLoading, isError, refetch, isFetching } = useQuery({
                queryKey: ['admin-user', userId],
                queryFn: async () => {
                        if (!userId) throw new Error('Missing user id')
                        return getAdminUserDetail(userId)
                },
                enabled: open && Boolean(userId),
                staleTime: 1000 * 30
        })

        const [roleValue, setRoleValue] = useState<Role | null>(null)
        const [banReasonOption, setBanReasonOption] = useState<string>(BAN_REASON_OPTIONS[0].value)
        const [banReasonCustom, setBanReasonCustom] = useState('')
        const [banNote, setBanNote] = useState('')
        const [banExpiresAt, setBanExpiresAt] = useState('')
        const [activeTab, setActiveTab] = useState<'overview' | 'moderation'>('overview')
        const [banErrors, setBanErrors] = useState<{
                reason?: string
                note?: string
                expiresAt?: string
        }>({})
        const [unbanReactivate, setUnbanReactivate] = useState(true)

        useEffect(() => {
                if (data?.role) {
                        setRoleValue(data.role)
                } else {
                        setRoleValue(null)
                }
        }, [data?.role, open])

        useEffect(() => {
                setBanReasonOption(BAN_REASON_OPTIONS[0].value)
                setBanReasonCustom('')
                setBanNote('')
                setBanExpiresAt('')
                setBanErrors({})
                setUnbanReactivate(true)
                setActiveTab('overview')
        }, [userId, open])

        useEffect(() => {
                setBanErrors(current => {
                        if (!current.reason) return current
                        return { ...current, reason: undefined }
                })
        }, [banReasonOption, banReasonCustom])

        const selectedBanReasonOption = useMemo(
                () => BAN_REASON_OPTIONS.find(option => option.value === banReasonOption) ?? BAN_REASON_OPTIONS[0],
                [banReasonOption]
        )

        const isCustomReason = selectedBanReasonOption.value === 'custom'

        const banReasonText = useMemo(() => {
                if (isCustomReason) {
                        return banReasonCustom
                }
                return selectedBanReasonOption.template
        }, [banReasonCustom, isCustomReason, selectedBanReasonOption])

        const isCurrentUser = useMemo(() => {
                if (!data?.id || !currentUserId) return false
                return data.id === currentUserId
        }, [currentUserId, data?.id])

        const canSubmitRole = roleValue !== null && roleValue !== data?.role

        const banRecord = useMemo(() => {
                if (!data) return null
                if (data.ban) return data.ban
                if (data.banInfo) return data.banInfo
                if (data.latestBan) return data.latestBan
                if (data.banRecord) return data.banRecord
                if (data.banHistory && data.banHistory.length > 0) {
                        return data.banHistory[0]
                }
                return null
        }, [data])

        const hasActiveBan = useMemo(() => {
                if (!banRecord) return false
                if (banRecord.unbannedAt) return false
                if (banRecord.expiresAt) {
                        const expires = new Date(banRecord.expiresAt)
                        if (!Number.isNaN(expires.getTime()) && expires <= new Date()) {
                                return false
                        }
                }
                return true
        }, [banRecord])

        const showUnbanForm = useMemo(() => {
                if (!data) return false
                if (hasActiveBan) return true
                if (data.isActive === false) return true
                return false
        }, [data, hasActiveBan])

        const showBanForm = useMemo(() => {
                if (!data) return false
                if (data.isActive === false) return false
                return !hasActiveBan
        }, [data, hasActiveBan])

        const handleSubmitRole = async (event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                if (!canSubmitRole || roleValue === null) return
                await onUpdateRole(roleValue)
        }

        const handleToggleStatus = async () => {
                if (!data) return
                await onToggleStatus(!data.isActive)
        }

        const handleSubmitBan = async (event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                if (!data || isCurrentUser) return
                const sanitizedNote = banNote.trim()
                const finalReason = banReasonText.trim()
                const parsed = banFormSchema.safeParse({
                        reason: finalReason,
                        note: sanitizedNote ? sanitizedNote : undefined,
                        expiresAt: banExpiresAt ? banExpiresAt : undefined
                })

                if (!parsed.success) {
                        const nextErrors: {
                                reason?: string
                                note?: string
                                expiresAt?: string
                        } = {}
                        for (const issue of parsed.error.issues) {
                                const key = issue.path[0]
                                if (typeof key === 'string') {
                                        nextErrors[key as 'reason' | 'note' | 'expiresAt'] = issue.message
                                }
                        }
                        setBanErrors(nextErrors)
                        return
                }

                setBanErrors({})
                await onBanUser(parsed.data)
                if (selectedBanReasonOption.value === 'custom') {
                        setBanReasonCustom('')
                } else {
                        setBanReasonOption(BAN_REASON_OPTIONS[0].value)
                }
                setBanNote('')
                setBanExpiresAt('')
        }

        const handleSubmitUnban = async (event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                await onUnbanUser({ reactivate: unbanReactivate })
        }

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box w-full max-w-4xl space-y-6'>
                                <div className='flex items-start justify-between gap-4 border-b border-base-300 pb-4'>
                                        <div className='flex items-start gap-4'>
                                                <div className='avatar'>
                                                        {data?.avatar ? (
                                                                <div className='size-16 rounded-full border border-base-200 bg-base-200/60 ring ring-primary/10 ring-offset-2 ring-offset-base-100 overflow-hidden'>
                                                                        <img
                                                                                src={data.avatar}
                                                                                alt={getDisplayName(data)}
                                                                                className='size-full object-cover'
                                                                        />
                                                                </div>
                                                        ) : (
                                                                <div className='bg-primary/10 text-primary size-16 rounded-full grid place-items-center text-xl font-semibold uppercase'>
                                                                        {getInitials(data)}
                                                                </div>
                                                        )}
                                                </div>
                                                <div>
                                                        <h3 className='text-xl font-semibold leading-tight'>{getDisplayName(data)}</h3>
                                                        <div className='mt-1 flex flex-wrap items-center gap-2 text-sm text-base-content/70'>
                                                                <span className='inline-flex items-center gap-1'>
                                                                        <Mail className='size-4 opacity-70' />
                                                                        {data?.email ?? '—'}
                                                                </span>
                                                                {data?.role ? (
                                                                        <span className='badge border border-primary/30 bg-primary/10 text-primary gap-1'>
                                                                                <Shield className='size-3.5' />
                                                                                {ROLE_LABELS[data.role]}
                                                                        </span>
                                                                ) : (
                                                                        <span className='badge badge-ghost gap-1'>
                                                                                <Shield className='size-3.5' />
                                                                                Không có vai trò
                                                                        </span>
                                                                )}
                                                                <span
                                                                        className={`badge gap-1 ${
                                                                                data?.isActive
                                                                                        ? 'border border-success/40 bg-success/10 text-success'
                                                                                        : 'border border-error/30 bg-error/10 text-error'
                                                                        }`}>
                                                                        {data?.isActive ? (
                                                                                <BadgeCheck className='size-3.5' />
                                                                        ) : (
                                                                                <Ban className='size-3.5' />
                                                                        )}
                                                                        {data?.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                                                                </span>
                                                        </div>
                                                </div>
                                        </div>
                                        <div className='flex flex-col items-end gap-2'>
                                                <button type='button' className='btn btn-sm' onClick={() => refetch()} disabled={isFetching}>
                                                        <RefreshCcw className='size-4' />
                                                        Làm mới
                                                </button>
                                                <button type='button' className='btn btn-sm btn-ghost' onClick={onClose}>
                                                        Đóng
                                                </button>
                                        </div>
                                </div>

                                <div className='flex justify-start'>
                                        <div
                                                role='tablist'
                                                className='tabs tabs-boxed rounded-2xl bg-base-200/60 p-1 text-sm font-medium text-base-content/80'
                                        >
                                                <button
                                                        type='button'
                                                        role='tab'
                                                        className={`tab gap-2 rounded-xl ${activeTab === 'overview' ? 'tab-active bg-base-100 text-base-content shadow-sm' : ''}`}
                                                        aria-selected={activeTab === 'overview'}
                                                        onClick={() => setActiveTab('overview')}
                                                >
                                                        <Users className='size-4' />
                                                        Tổng quan
                                                </button>
                                                <button
                                                        type='button'
                                                        role='tab'
                                                        className={`tab gap-2 rounded-xl ${activeTab === 'moderation' ? 'tab-active bg-base-100 text-base-content shadow-sm' : ''}`}
                                                        aria-selected={activeTab === 'moderation'}
                                                        onClick={() => setActiveTab('moderation')}
                                                >
                                                        <Lock className='size-4' />
                                                        Khóa tài khoản
                                                </button>
                                        </div>
                                </div>

                                {activeTab === 'overview' ? (
                                        <div className='grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
                                                <div className='space-y-4'>
                                                        <div className='rounded-2xl border border-base-300 bg-base-200/60 p-4'>
                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                        <Users className='size-4' /> Thông tin tài khoản
                                                                </div>
                                                                <dl className='mt-4 grid gap-3 sm:grid-cols-2'>
                                                                        <div>
                                                                                <dt className='text-xs text-base-content/60 uppercase tracking-wide'>Tạo lúc</dt>
                                                                                <dd className='text-sm font-medium text-base-content'>{formatDateTime(data?.createdAt)}</dd>
                                                                        </div>
                                                                        <div>
                                                                                <dt className='text-xs text-base-content/60 uppercase tracking-wide'>Cập nhật</dt>
                                                                                <dd className='text-sm font-medium text-base-content'>{formatDateTime(data?.updatedAt)}</dd>
                                                                        </div>
                                                                        <div>
                                                                                <dt className='text-xs text-base-content/60 uppercase tracking-wide'>Vai trò hiện tại</dt>
                                                                                <dd className='text-sm font-medium text-base-content'>
                                                                                        {data?.role ? ROLE_LABELS[data.role] : 'Không thiết lập'}
                                                                                </dd>
                                                                        </div>
                                                                        <div>
                                                                                <dt className='text-xs text-base-content/60 uppercase tracking-wide'>Trạng thái</dt>
                                                                                <dd className='text-sm font-medium text-base-content'>
                                                                                        {data?.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                                                                                </dd>
                                                                        </div>
                                                                </dl>
                                                        </div>

                                                        <form onSubmit={handleSubmitRole} className='space-y-4 rounded-2xl border border-base-300 bg-base-100 p-4'>
                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                        <UserRound className='size-4' /> Phân quyền
                                                                </div>
                                                                <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
                                                                        <div className='sm:flex-1'>
                                                                                <label className='text-xs font-semibold text-base-content/60 uppercase tracking-wide'>Chọn vai trò</label>
                                                                                <select
                                                                                        className='select select-bordered mt-2 w-full'
                                                                                        value={roleValue ?? ''}
                                                                                        onChange={event => {
                                                                                                const value = event.target.value as Role | ''
                                                                                                setRoleValue(value === '' ? null : (value as Role))
                                                                                        }}
                                                                                >
                                                                                        <option value='' disabled>
                                                                                                Chọn vai trò
                                                                                        </option>
                                                                                        {roleOptions.map(role => (
                                                                                                <option key={role} value={role}>
                                                                                                        {ROLE_LABELS[role]}
                                                                                                </option>
                                                                                        ))}
                                                                                </select>
                                                                        </div>
                                                                        <button
                                                                                type='submit'
                                                                                className='btn btn-primary sm:w-auto'
                                                                                disabled={!canSubmitRole || updatingRole}
                                                                        >
                                                                                {updatingRole && <span className='loading loading-spinner loading-sm' />}
                                                                                Cập nhật vai trò
                                                                        </button>
                                                                </div>
                                                                <p className='text-xs text-base-content/60'>Thay đổi vai trò sẽ áp dụng ngay lập tức và được ghi nhận trong nhật ký hệ thống.</p>
                                                        </form>
                                                </div>

                                                <div className='space-y-4'>
                                                        <div className='space-y-3 rounded-2xl border border-base-300 bg-base-100 p-4'>
                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                        <Shield className='size-4' /> Trạng thái tài khoản
                                                                </div>
                                                                <div className='flex items-center justify-between rounded-xl border border-base-200 bg-base-200/50 p-3'>
                                                                        <div>
                                                                                <p className='text-sm font-medium text-base-content'>
                                                                                        {data?.isActive ? 'Tài khoản đang hoạt động' : 'Tài khoản đã khóa'}
                                                                                </p>
                                                                                <p className='text-xs text-base-content/60'>
                                                                                        {isCurrentUser
                                                                                                ? 'Bạn không thể tự vô hiệu hóa tài khoản của mình.'
                                                                                                : 'Sử dụng công tắc để thay đổi trạng thái truy cập.'}
                                                                                </p>
                                                                        </div>
                                                                        <label className='flex flex-col items-center gap-1'>
                                                                                <input
                                                                                        type='checkbox'
                                                                                        className='toggle toggle-primary'
                                                                                        checked={data?.isActive ?? false}
                                                                                        onChange={handleToggleStatus}
                                                                                        disabled={updatingStatus || (isCurrentUser && data?.isActive)}
                                                                                        aria-label='Kích hoạt tài khoản'
                                                                                />
                                                                                <span className='text-xs text-base-content/60'>
                                                                                        {updatingStatus ? 'Đang cập nhật…' : data?.isActive ? 'Đã bật' : 'Đã tắt'}
                                                                                </span>
                                                                        </label>
                                                                </div>
                                                        </div>

                                                        <div className='space-y-3 rounded-2xl border border-base-300 bg-base-100 p-4'>
                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                        <CalendarClock className='size-4' /> Thông tin hồ sơ
                                                                </div>
                                                                {isLoading ? (
                                                                        <div className='space-y-2'>
                                                                                <div className='skeleton h-4 w-full' />
                                                                                <div className='skeleton h-4 w-4/5' />
                                                                                <div className='skeleton h-4 w-3/4' />
                                                                        </div>
                                                                ) : data?.profile ? (
                                                                        <ul className='space-y-2 text-sm text-base-content/80'>
                                                                                {data.profile.phoneNumber && (
                                                                                        <li className='flex items-center gap-2'>
                                                                                                <Phone className='size-4 opacity-70' />
                                                                                                {data.profile.phoneNumber}
                                                                                        </li>
                                                                                )}
                                                                                {data.profile.address && (
                                                                                        <li className='flex items-start gap-2'>
                                                                                                <MapPin className='size-4 opacity-70' />
                                                                                                <span className='leading-tight'>{data.profile.address}</span>
                                                                                        </li>
                                                                                )}
                                                                                {(data.profile.city || data.profile.district || data.profile.country) && (
                                                                                        <li className='flex items-start gap-2'>
                                                                                                <MapPin className='size-4 opacity-70' />
                                                                                                <span className='leading-tight'>
                                                                                                        {[data.profile.city, data.profile.district, data.profile.country]
                                                                                                                .filter(Boolean)
                                                                                                                .join(', ')}
                                                                                                </span>
                                                                                        </li>
                                                                                )}
                                                                                <li className='flex items-center gap-2'>
                                                                                        <BadgeCheck className='size-4 opacity-70' />
                                                                                        Hồ sơ khách hàng: {data.hasClientProfile ? 'Có' : 'Không'}
                                                                                </li>
                                                                                <li className='flex items-center gap-2'>
                                                                                        <BadgeCheck className='size-4 opacity-70' />
                                                                                        Hồ sơ freelancer: {data.hasFreelancerProfile ? 'Có' : 'Không'}
                                                                                </li>
                                                                        </ul>
                                                                ) : (
                                                                        <p className='text-sm text-base-content/60'>Người dùng chưa cập nhật hồ sơ chi tiết.</p>
                                                                )}
                                                        </div>
                                                </div>
                                        </div>
                                ) : (
                                        <div className='w-full space-y-5'>
                                                <div className='w-full space-y-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm'>
                                                        <div className='flex flex-wrap items-center justify-between gap-2'>
                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                        <Ban className='size-4' /> Quản lý khóa tài khoản
                                                                </div>
                                                                {banRecord && (
                                                                        <span
                                                                                className={`badge gap-2 border ${
                                                                                        hasActiveBan
                                                                                                ? 'border-error/40 bg-error/10 text-error'
                                                                                                : 'border-success/40 bg-success/10 text-success'
                                                                                }`}
                                                                        >
                                                                                {hasActiveBan ? (
                                                                                        <>
                                                                                                <Lock className='size-3.5' />
                                                                                                <span>Đang khóa</span>
                                                                                        </>
                                                                                ) : (
                                                                                        <>
                                                                                                <Unlock className='size-3.5' />
                                                                                                <span>Đã mở khóa</span>
                                                                                        </>
                                                                                )}
                                                                        </span>
                                                                )}
                                                        </div>
                                                        {banRecord ? (
                                                                <div
                                                                        className={`space-y-4 rounded-2xl border p-4 text-sm transition-colors ${
                                                                                hasActiveBan
                                                                                        ? 'border-error/40 bg-error/5 text-base-content/80'
                                                                                        : 'border-base-200 bg-base-200/40 text-base-content/70'
                                                                        }`}
                                                                >
                                                                        <div
                                                                                className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${
                                                                                        hasActiveBan ? 'text-error' : 'text-base-content/70'
                                                                                }`}
                                                                        >
                                                                                {hasActiveBan ? <AlertTriangle className='size-4' /> : <CalendarClock className='size-4' />}
                                                                                {hasActiveBan ? 'Lệnh khóa đang hiệu lực' : 'Lịch sử khóa gần nhất'}
                                                                        </div>
                                                                        <dl className='grid gap-4 sm:grid-cols-2'>
                                                                                {banRecord.reason && (
                                                                                        <div className='sm:col-span-2 space-y-1'>
                                                                                                <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Lý do</dt>
                                                                                                <dd className='text-sm font-medium text-base-content'>{banRecord.reason}</dd>
                                                                                        </div>
                                                                                )}
                                                                                {banRecord.note && (
                                                                                        <div className='sm:col-span-2 space-y-1'>
                                                                                                <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Ghi chú</dt>
                                                                                                <dd className='flex items-start gap-2 text-sm text-base-content'>
                                                                                                        <StickyNote className='mt-0.5 size-4 text-base-content/60' />
                                                                                                        <span className='leading-tight'>{banRecord.note}</span>
                                                                                                </dd>
                                                                                        </div>
                                                                                )}
                                                                                <div className='space-y-1'>
                                                                                        <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Khóa lúc</dt>
                                                                                        <dd className='flex items-center gap-2 text-sm text-base-content'>
                                                                                                <CalendarClock className='size-4 opacity-70' />
                                                                                                {formatDateTime(banRecord.bannedAt ?? banRecord.createdAt ?? undefined)}
                                                                                        </dd>
                                                                                </div>
                                                                                <div className='space-y-1'>
                                                                                        <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Hết hạn</dt>
                                                                                        <dd className='flex items-center gap-2 text-sm text-base-content'>
                                                                                                <Timer className='size-4 opacity-70' />
                                                                                                {banRecord.expiresAt ? formatDateTime(banRecord.expiresAt) : 'Không thời hạn'}
                                                                                        </dd>
                                                                                </div>
                                                                                {banRecord.bannedBy && (
                                                                                        <div className='space-y-1'>
                                                                                                <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Thực hiện bởi</dt>
                                                                                                <dd className='text-sm text-base-content'>
                                                                                                        {banRecord.bannedBy.name ?? banRecord.bannedBy.email ?? banRecord.bannedBy.id}
                                                                                                </dd>
                                                                                        </div>
                                                                                )}
                                                                                {banRecord.unbannedAt && (
                                                                                        <div className='space-y-1'>
                                                                                                <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Gỡ khóa lúc</dt>
                                                                                                <dd className='flex items-center gap-2 text-sm text-base-content'>
                                                                                                        <RefreshCcw className='size-4 opacity-70' />
                                                                                                        {formatDateTime(banRecord.unbannedAt)}
                                                                                                </dd>
                                                                                        </div>
                                                                                )}
                                                                        </dl>
                                                                        {!hasActiveBan && (
                                                                                <div className='rounded-lg border border-success/40 bg-success/5 p-2 text-xs text-success'>
                                                                                        Lệnh khóa đã hết hiệu lực.
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        ) : (
                                                                <div className='rounded-xl border border-dashed border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70'>
                                                                        Người dùng chưa từng bị khóa tài khoản.
                                                                </div>
                                                        )}
                                                        <div className='space-y-5'>
                                                                {showBanForm && (
                                                                        <form
                                                                                onSubmit={handleSubmitBan}
                                                                                className='w-full space-y-5 rounded-xl border border-error/30 bg-error/5 p-5'
                                                                        >
                                                                                <div className='space-y-2'>
                                                                                        <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                Chọn lý do khóa *
                                                                                        </label>
                                                                                <select
                                                                                        className='select select-bordered w-full'
                                                                                        value={banReasonOption}
                                                                                        onChange={event => setBanReasonOption(event.target.value)}
                                                                                        disabled={banningUser || isCurrentUser}
                                                                                >
                                                                                        {BAN_REASON_OPTIONS.map(option => (
                                                                                                <option key={option.value} value={option.value}>
                                                                                                        {option.label}
                                                                                                </option>
                                                                                        ))}
                                                                                </select>
                                                                        </div>
                                                                                <div className='grid gap-4 md:grid-cols-2'>
                                                                                        <div className='md:col-span-2 space-y-2'>
                                                                                                <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                        Chi tiết lý do {isCustomReason ? '*' : ''}
                                                                                                </label>
                                                                                                {isCustomReason ? (
                                                                                                        <>
                                                                                                                <textarea
                                                                                                                        className='textarea textarea-bordered min-h-[110px]'
                                                                                                                        placeholder='Mô tả lý do khóa tài khoản'
                                                                                                                        value={banReasonText}
                                                                                                                        onChange={event => {
                                                                                                                                if (isCustomReason) {
                                                                                                                                        setBanReasonCustom(event.target.value)
                                                                                                                                }
                                                                                                                        }}
                                                                                                                        disabled={banningUser || isCurrentUser}
                                                                                                                />
                                                                                                                <p className='text-xs text-base-content/60'>Nhập tối thiểu 10 ký tự để mô tả rõ lý do khóa.</p>
                                                                                                        </>
                                                                                                ) : (
                                                                                                        <div className='rounded-lg border border-base-200 bg-base-200/60 p-3 text-sm text-base-content/80'>
                                                                                                                {banReasonText}
                                                                                                                <p className='mt-2 text-xs text-base-content/60'>Bạn có thể chọn &quot;Khác (ghi rõ)&quot; nếu muốn nhập lý do riêng.</p>
                                                                                                        </div>
                                                                                                )}
                                                                                                {banErrors.reason && <p className='text-xs text-error'>{banErrors.reason}</p>}
                                                                                        </div>
                                                                                        <div className='space-y-2'>
                                                                                                <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                        Ghi chú nội bộ
                                                                                                </label>
                                                                                                <textarea
                                                                                                        className='textarea textarea-bordered min-h-[90px]'
                                                                                                        placeholder='Thông tin bổ sung cho đội ngũ quản trị (tùy chọn)'
                                                                                                        value={banNote}
                                                                                                        onChange={event => setBanNote(event.target.value)}
                                                                                                        disabled={banningUser || isCurrentUser}
                                                                                                />
                                                                                                {banErrors.note && <p className='text-xs text-error'>{banErrors.note}</p>}
                                                                                        </div>
                                                                                        <div className='space-y-2'>
                                                                                                <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                        Hết hạn (tùy chọn)
                                                                                                </label>
                                                                                                <input
                                                                                                        type='datetime-local'
                                                                                                        className='input input-bordered w-full'
                                                                                                        value={banExpiresAt}
                                                                                                        onChange={event => setBanExpiresAt(event.target.value)}
                                                                                                        disabled={banningUser || isCurrentUser}
                                                                                                />
                                                                                                <p className='text-xs text-base-content/60'>
                                                                                                        Để trống nếu bạn muốn khóa vô thời hạn. Giờ được tính theo múi giờ trình duyệt.
                                                                                                </p>
                                                                                                {banErrors.expiresAt && <p className='text-xs text-error'>{banErrors.expiresAt}</p>}
                                                                                        </div>
                                                                                </div>
                                                                                <button
                                                                                        type='submit'
                                                                                        className='btn btn-error w-full gap-2 md:w-auto'
                                                                                        disabled={banningUser || isCurrentUser}
                                                                                >
                                                                                        {banningUser && <span className='loading loading-spinner loading-sm' />}
                                                                                        <Lock className='size-4' />
                                                                                        <span>Khóa tài khoản</span>
                                                                                </button>
                                                                        {isCurrentUser && (
                                                                                <p className='text-xs text-error'>Bạn không thể tự khóa tài khoản của mình.</p>
                                                                        )}
                                                                </form>
                                                                )}
                                                                {showUnbanForm && (
                                                                        <form
                                                                                onSubmit={handleSubmitUnban}
                                                                                className='flex w-full flex-col justify-between gap-4 rounded-xl border border-success/30 bg-success/5 p-5'
                                                                        >
                                                                                <div className='space-y-3 text-sm text-base-content/80'>
                                                                                        <p>Người dùng đang bị khóa. Bạn có thể gỡ khóa và kích hoạt lại quyền truy cập.</p>
                                                                                        <label className='flex items-center gap-2 rounded-xl border border-success/40 bg-base-100/60 p-3 text-sm'>
                                                                                                <input
                                                                                                        type='checkbox'
                                                                                                        className='checkbox checkbox-sm'
                                                                                                        checked={unbanReactivate}
                                                                                                        onChange={event => setUnbanReactivate(event.target.checked)}
                                                                                                        disabled={unbanningUser}
                                                                                                />
                                                                                                Kích hoạt lại tài khoản sau khi gỡ khóa
                                                                                        </label>
                                                                                </div>
                                                                                <button type='submit' className='btn btn-success w-full gap-2' disabled={unbanningUser}>
                                                                                        {unbanningUser && <span className='loading loading-spinner loading-sm' />}
                                                                                        <Unlock className='size-4' />
                                                                                        <span>Gỡ khóa tài khoản</span>
                                                                               </button>
                                                                        </form>
                                                                )}
                                                        </div>
                                                </div>
                                        </div>
                                )}

                                {isError && (
                                        <div className='alert alert-error'>
                                                <Ban className='size-4' />
                                                <span>Không thể tải thông tin người dùng. Vui lòng thử lại.</span>
                                        </div>
                                )}
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={onClose}>close</button>
                        </form>
                </dialog>
        )
}
