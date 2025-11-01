import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminUserDetail } from '~/apis/admin/user.api'
import type { AdminUser } from '~/types/admin-user'
import { Role } from '~/types/user'
import { ROLE_LABELS } from '~/constants/roles'
import {
        BadgeCheck,
        Ban,
        CalendarClock,
        Mail,
        MapPin,
        Phone,
        RefreshCcw,
        Shield,
        UserRound,
        Users
} from 'lucide-react'

type AdminUserDetailModalProps = {
        open: boolean
        userId: string | null
        onClose: () => void
        onUpdateRole: (role: Role) => Promise<void>
        onToggleStatus: (isActive: boolean) => Promise<void>
        updatingRole: boolean
        updatingStatus: boolean
        currentUserId?: string | null
}

const roleOptions = Object.values(Role)

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
        updatingRole,
        updatingStatus,
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

        useEffect(() => {
                if (data?.role) {
                        setRoleValue(data.role)
                } else {
                        setRoleValue(null)
                }
        }, [data?.role, open])

        const isCurrentUser = useMemo(() => {
                if (!data?.id || !currentUserId) return false
                return data.id === currentUserId
        }, [currentUserId, data?.id])

        const canSubmitRole = roleValue !== null && roleValue !== data?.role

        const handleSubmitRole = async (event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                if (!canSubmitRole || roleValue === null) return
                await onUpdateRole(roleValue)
        }

        const handleToggleStatus = async () => {
                if (!data) return
                await onToggleStatus(!data.isActive)
        }

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box max-w-3xl space-y-6'>
                                <div className='flex items-start justify-between gap-4 border-b border-base-300 pb-4'>
                                        <div className='flex items-start gap-4'>
                                                <div className='avatar placeholder'>
                                                        <div className='bg-primary/10 text-primary rounded-full size-14 grid place-items-center text-lg font-semibold uppercase'>
                                                                {getInitials(data)}
                                                        </div>
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

                                                <form onSubmit={handleSubmitRole} className='rounded-2xl border border-base-300 bg-base-100 p-4 space-y-4'>
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
                                                <div className='rounded-2xl border border-base-300 bg-base-100 p-4 space-y-3'>
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

                                                <div className='rounded-2xl border border-base-300 bg-base-100 p-4 space-y-3'>
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
