import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useDebounce } from '~/hooks/comons/useDebounce'
import {
        banAdminUser,
        listAdminUsers,
        type BanAdminUserPayload,
        type UnbanAdminUserPayload,
        unbanAdminUser,
        updateAdminUserRole,
        updateAdminUserStatus
} from '~/apis/admin/user.api'
import type { AdminUser, AdminUserListResponse } from '~/types/admin-user'
import { Role } from '~/types/user'
import { ROLE_LABELS } from '~/constants/roles'
import {
        Ban,
        ChevronLeft,
        ChevronRight,
        Eye,
        Filter,
        RefreshCcw,
        Search,
        Shield,
        ShieldAlert,
        ShieldCheck,
        Users
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import AdminUserDetailModal from './AdminUserDetailModal'

type RoleFilterValue = 'ALL' | Role
type StatusFilterValue = 'all' | 'active' | 'inactive'

const roleFilterOptions: { label: string; value: RoleFilterValue }[] = [
        { label: 'Tất cả vai trò', value: 'ALL' },
        { label: ROLE_LABELS[Role.ADMIN], value: Role.ADMIN },
        { label: ROLE_LABELS[Role.ARBITRATOR], value: Role.ARBITRATOR },
        { label: ROLE_LABELS[Role.CLIENT], value: Role.CLIENT },
        { label: ROLE_LABELS[Role.FREELANCER], value: Role.FREELANCER }
]

const statusFilterOptions: { label: string; value: StatusFilterValue }[] = [
        { label: 'Tất cả trạng thái', value: 'all' },
        { label: 'Đang hoạt động', value: 'active' },
        { label: 'Đã khóa', value: 'inactive' }
]

const limitOptions = [10, 20, 50]

const queryKeyBase = 'admin-users'

const toDisplayName = (user: AdminUser) => {
        const first = user.profile?.firstName?.trim() ?? ''
        const last = user.profile?.lastName?.trim() ?? ''
        const fullname = [first, last].filter(Boolean).join(' ')
        return fullname || 'Chưa cập nhật tên'
}

const toInitials = (user: AdminUser) => {
        const first = user.profile?.firstName?.trim().charAt(0)
        const last = user.profile?.lastName?.trim().charAt(0)
        const emailFallback = user.email.charAt(0)
        return [first, last].filter(Boolean).join('').toUpperCase() || emailFallback.toUpperCase()
}

const roleBadgeClass = (role: Role | null | undefined) => {
        if (!role) return 'badge badge-ghost'
        switch (role) {
                case Role.ADMIN:
                        return 'badge border border-primary/30 bg-primary/10 text-primary'
                case Role.ARBITRATOR:
                        return 'badge border border-warning/40 bg-warning/10 text-warning'
                case Role.CLIENT:
                        return 'badge border border-info/30 bg-info/10 text-info'
                case Role.FREELANCER:
                        return 'badge border border-success/30 bg-success/10 text-success'
                default:
                        return 'badge badge-outline'
        }
}

const formatDateTime = (value: string) => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '—'
        return date.toLocaleString('vi-VN', { hour12: false })
}

export default function AdminUserListPage() {
        const [page, setPage] = useState(1)
        const [limit, setLimit] = useState<number>(10)
        const [roleFilter, setRoleFilter] = useState<RoleFilterValue>('ALL')
        const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all')
        const [search, setSearch] = useState('')
        const searchDebounced = useDebounce(search, 600)

        const currentUser = useSelector(selectCurrentUser)

        const queryKey = useMemo(
                () => [queryKeyBase, { page, limit, roleFilter, statusFilter, search: searchDebounced }],
                [page, limit, roleFilter, statusFilter, searchDebounced]
        )

        const { data, isLoading, isError, isFetching, refetch } = useQuery({
                queryKey,
                queryFn: async () => {
                        const roleParam = roleFilter === 'ALL' ? undefined : roleFilter
                        const statusParam = statusFilter === 'all' ? undefined : statusFilter === 'active'
                        const searchParam = searchDebounced.trim() || undefined
                        return listAdminUsers({
                                page,
                                limit,
                                role: roleParam,
                                isActive: statusParam,
                                search: searchParam
                        })
                },
                placeholderData: keepPreviousData
        })

        const qc = useQueryClient()
        const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
        const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null)
        const [banningUserId, setBanningUserId] = useState<string | null>(null)
        const [unbanningUserId, setUnbanningUserId] = useState<string | null>(null)

        const updateStatusMutation = useMutation<
                AdminUser,
                unknown,
                { userId: string; isActive: boolean },
                { previous?: AdminUserListResponse }
        >({
                mutationFn: ({ userId, isActive }) => updateAdminUserStatus(userId, { isActive }),
                onMutate: async variables => {
                        setStatusUpdatingId(variables.userId)
                        await qc.cancelQueries({ queryKey: [queryKeyBase] })
                        const previous = qc.getQueryData<AdminUserListResponse>(queryKey)
                        if (previous) {
                                qc.setQueryData<AdminUserListResponse>(queryKey, {
                                        ...previous,
                                        data: previous.data.map(item =>
                                                item.id === variables.userId
                                                        ? { ...item, isActive: variables.isActive }
                                                        : item
                                        )
                                })
                        }
                        return { previous }
                },
                onError: (_error, _variables, context) => {
                        if (context?.previous) {
                                qc.setQueryData(queryKey, context.previous)
                        }
                        toast.error('Cập nhật trạng thái thất bại')
                },
                onSuccess: updated => {
                        toast.success(updated.isActive ? 'Đã kích hoạt tài khoản' : 'Đã khóa tài khoản')
                        qc.setQueryData(['admin-user', updated.id], updated)
                },
                onSettled: (_data, _error, variables) => {
                        setStatusUpdatingId(null)
                        qc.invalidateQueries({ queryKey: [queryKeyBase] })
                        if (variables?.userId) {
                                qc.invalidateQueries({ queryKey: ['admin-user', variables.userId] })
                        }
                }
        })

        const updateRoleMutation = useMutation<
                AdminUser,
                unknown,
                { userId: string; role: Role },
                { previous?: AdminUserListResponse }
        >({
                mutationFn: ({ userId, role }) => updateAdminUserRole(userId, { role }),
                onMutate: async variables => {
                        setRoleUpdatingId(variables.userId)
                        await qc.cancelQueries({ queryKey: [queryKeyBase] })
                        const previous = qc.getQueryData<AdminUserListResponse>(queryKey)
                        if (previous) {
                                qc.setQueryData<AdminUserListResponse>(queryKey, {
                                        ...previous,
                                        data: previous.data.map(item =>
                                                item.id === variables.userId ? { ...item, role: variables.role } : item
                                        )
                                })
                        }
                        return { previous }
                },
                onError: (_error, _variables, context) => {
                        if (context?.previous) {
                                qc.setQueryData(queryKey, context.previous)
                        }
                        toast.error('Cập nhật vai trò thất bại')
                },
                onSuccess: updated => {
                        toast.success('Đã cập nhật vai trò người dùng')
                        qc.setQueryData(['admin-user', updated.id], updated)
                },
                onSettled: (_data, _error, variables) => {
                        setRoleUpdatingId(null)
                        qc.invalidateQueries({ queryKey: [queryKeyBase] })
                        if (variables?.userId) {
                                qc.invalidateQueries({ queryKey: ['admin-user', variables.userId] })
                        }
                }
        })

        const banUserMutation = useMutation<
                AdminUser,
                unknown,
                { userId: string; payload: BanAdminUserPayload },
                { previous?: AdminUserListResponse }
        >({
                mutationFn: ({ userId, payload }) => banAdminUser(userId, payload),
                onMutate: async variables => {
                        setBanningUserId(variables.userId)
                        await qc.cancelQueries({ queryKey: [queryKeyBase] })
                        const previous = qc.getQueryData<AdminUserListResponse>(queryKey)
                        if (previous) {
                                qc.setQueryData<AdminUserListResponse>(queryKey, {
                                        ...previous,
                                        data: previous.data.map(item =>
                                                item.id === variables.userId
                                                        ? { ...item, isActive: false }
                                                        : item
                                        )
                                })
                        }
                        return { previous }
                },
                onError: (_error, _variables, context) => {
                        if (context?.previous) {
                                qc.setQueryData(queryKey, context.previous)
                        }
                        toast.error('Khóa tài khoản thất bại')
                },
                onSuccess: updated => {
                        toast.success('Đã khóa tài khoản người dùng')
                        qc.setQueryData(['admin-user', updated.id], updated)
                },
                onSettled: (_data, _error, variables) => {
                        setBanningUserId(null)
                        qc.invalidateQueries({ queryKey: [queryKeyBase] })
                        if (variables?.userId) {
                                qc.invalidateQueries({ queryKey: ['admin-user', variables.userId] })
                        }
                }
        })

        const unbanUserMutation = useMutation<
                AdminUser,
                unknown,
                { userId: string; payload: UnbanAdminUserPayload },
                { previous?: AdminUserListResponse }
        >({
                mutationFn: ({ userId, payload }) => unbanAdminUser(userId, payload),
                onMutate: async variables => {
                        setUnbanningUserId(variables.userId)
                        await qc.cancelQueries({ queryKey: [queryKeyBase] })
                        const previous = qc.getQueryData<AdminUserListResponse>(queryKey)
                        if (previous) {
                                qc.setQueryData<AdminUserListResponse>(queryKey, {
                                        ...previous,
                                        data: previous.data.map(item =>
                                                item.id === variables.userId
                                                        ? { ...item, isActive: true }
                                                        : item
                                        )
                                })
                        }
                        return { previous }
                },
                onError: (_error, _variables, context) => {
                        if (context?.previous) {
                                qc.setQueryData(queryKey, context.previous)
                        }
                        toast.error('Gỡ khóa tài khoản thất bại')
                },
                onSuccess: updated => {
                        toast.success('Đã gỡ khóa tài khoản người dùng')
                        qc.setQueryData(['admin-user', updated.id], updated)
                },
                onSettled: (_data, _error, variables) => {
                        setUnbanningUserId(null)
                        qc.invalidateQueries({ queryKey: [queryKeyBase] })
                        if (variables?.userId) {
                                qc.invalidateQueries({ queryKey: ['admin-user', variables.userId] })
                        }
                }
        })

        const users = data?.data ?? []
        const total = data?.meta?.total ?? 0
        const pages = Math.max(1, Math.ceil(total / limit))

        const activeOnPage = users.filter(user => user.isActive).length
        const elevatedOnPage = users.filter(user => user.role === Role.ADMIN || user.role === Role.ARBITRATOR).length
        const profileCompleted = users.filter(user => user.hasClientProfile || user.hasFreelancerProfile).length

        const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

        const handleToggleStatus = (user: AdminUser) => {
                if (currentUser?.id === user.id && user.isActive) {
                        toast.warning('Bạn không thể tự vô hiệu hóa tài khoản của mình.')
                        return
                }
                updateStatusMutation.mutate({ userId: user.id, isActive: !user.isActive })
        }

        const handleResetFilters = () => {
                setRoleFilter('ALL')
                setStatusFilter('all')
                setSearch('')
                setPage(1)
        }

        const handleUpdateRoleFromModal = async (role: Role) => {
                if (!selectedUserId) return
                await updateRoleMutation.mutateAsync({ userId: selectedUserId, role })
        }

        const handleUpdateStatusFromModal = async (isActive: boolean) => {
                if (!selectedUserId) return
                const isSelf = currentUser?.id === selectedUserId
                if (isSelf && !isActive) {
                        toast.warning('Bạn không thể tự vô hiệu hóa tài khoản của mình.')
                        return
                }
                await updateStatusMutation.mutateAsync({ userId: selectedUserId, isActive })
        }

        const handleBanUserFromModal = async (payload: BanAdminUserPayload) => {
                if (!selectedUserId) return
                const isSelf = currentUser?.id === selectedUserId
                if (isSelf) {
                        toast.warning('Bạn không thể tự khóa tài khoản của mình.')
                        return
                }
                await banUserMutation.mutateAsync({ userId: selectedUserId, payload })
        }

        const handleUnbanUserFromModal = async (payload: UnbanAdminUserPayload) => {
                if (!selectedUserId) return
                await unbanUserMutation.mutateAsync({ userId: selectedUserId, payload })
        }

        return (
                <div className='space-y-6'>
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                <div>
                                        <h1 className='flex items-center gap-2 text-2xl font-semibold'>
                                                <Users className='size-6 text-primary' />
                                                Quản lý người dùng
                                        </h1>
                                        <p className='text-sm text-base-content/70'>Theo dõi, phân quyền và kiểm soát trạng thái truy cập của toàn bộ tài khoản.</p>
                                </div>
                                <div className='flex gap-2'>
                                        <button type='button' className='btn btn-ghost' onClick={handleResetFilters} disabled={isFetching}>
                                                Đặt lại bộ lọc
                                        </button>
                                        <button type='button' className='btn' onClick={() => refetch()} disabled={isFetching}>
                                                <RefreshCcw className='size-4' /> Tải lại
                                        </button>
                                </div>
                        </div>

                        <div className='grid gap-4 md:grid-cols-3'>
                                <div className='card border border-base-200 bg-base-100 shadow-sm'>
                                        <div className='card-body p-5'>
                                                <div className='flex items-center justify-between'>
                                                        <div>
                                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Tổng tài khoản</p>
                                                                <p className='mt-2 text-3xl font-bold'>{total}</p>
                                                        </div>
                                                        <div className='size-12 rounded-full bg-primary/10 text-primary grid place-items-center'>
                                                                <Users className='size-6' />
                                                        </div>
                                                </div>
                                                <p className='mt-2 text-xs text-base-content/60'>Số liệu tổng hợp dựa trên điều kiện lọc hiện tại.</p>
                                        </div>
                                </div>
                                <div className='card border border-base-200 bg-base-100 shadow-sm'>
                                        <div className='card-body p-5'>
                                                <div className='flex items-center justify-between'>
                                                        <div>
                                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Đang hoạt động (trang hiện tại)</p>
                                                                <p className='mt-2 text-3xl font-bold'>{activeOnPage}</p>
                                                        </div>
                                                        <div className='size-12 rounded-full bg-success/10 text-success grid place-items-center'>
                                                                <ShieldCheck className='size-6' />
                                                        </div>
                                                </div>
                                                <p className='mt-2 text-xs text-base-content/60'>Tài khoản đang mở quyền truy cập trong trang này.</p>
                                        </div>
                                </div>
                                <div className='card border border-base-200 bg-base-100 shadow-sm'>
                                        <div className='card-body p-5'>
                                                <div className='flex items-center justify-between'>
                                                        <div>
                                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Quản trị & trọng tài</p>
                                                                <p className='mt-2 text-3xl font-bold'>{elevatedOnPage}</p>
                                                        </div>
                                                        <div className='size-12 rounded-full bg-warning/10 text-warning grid place-items-center'>
                                                                <ShieldAlert className='size-6' />
                                                        </div>
                                                </div>
                                                <p className='mt-2 text-xs text-base-content/60'>Số lượng người dùng có quyền cao trên trang hiện tại.</p>
                                                <p className='text-xs text-base-content/50'>Hồ sơ đã hoàn thiện: {profileCompleted}</p>
                                        </div>
                                </div>
                        </div>

                        <div className='card border border-base-200 bg-base-100 shadow-sm'>
                                <div className='card-body space-y-4 p-5'>
                                        <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                <Filter className='size-4' /> Bộ lọc
                                        </div>
                                        <div className='grid gap-3 md:grid-cols-4'>
                                                <div className='md:col-span-2'>
                                                        <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Tìm kiếm</label>
                                                        <label className='input input-bordered mt-2 flex items-center gap-2'>
                                                                <Search className='size-4 opacity-70' />
                                                                <input
                                                                        type='text'
                                                                        className='grow'
                                                                        placeholder='Tìm theo tên, email hoặc số điện thoại'
                                                                        value={search}
                                                                        onChange={event => {
                                                                                setSearch(event.target.value)
                                                                                setPage(1)
                                                                        }}
                                                                />
                                                        </label>
                                                </div>
                                                <div>
                                                        <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Vai trò</label>
                                                        <select
                                                                className='select select-bordered mt-2 w-full'
                                                                value={roleFilter}
                                                                onChange={event => {
                                                                        setRoleFilter(event.target.value as RoleFilterValue)
                                                                        setPage(1)
                                                                }}
                                                        >
                                                                {roleFilterOptions.map(option => (
                                                                        <option key={option.value} value={option.value}>
                                                                                {option.label}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>
                                                <div>
                                                        <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Trạng thái</label>
                                                        <select
                                                                className='select select-bordered mt-2 w-full'
                                                                value={statusFilter}
                                                                onChange={event => {
                                                                        setStatusFilter(event.target.value as StatusFilterValue)
                                                                        setPage(1)
                                                                }}
                                                        >
                                                                {statusFilterOptions.map(option => (
                                                                        <option key={option.value} value={option.value}>
                                                                                {option.label}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>
                                                <div>
                                                        <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Số dòng / trang</label>
                                                        <select
                                                                className='select select-bordered mt-2 w-full'
                                                                value={limit}
                                                                onChange={event => {
                                                                        setLimit(Number(event.target.value))
                                                                        setPage(1)
                                                                }}
                                                        >
                                                                {limitOptions.map(option => (
                                                                        <option key={option} value={option}>
                                                                                {option}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>
                                        </div>
                                </div>
                        </div>

                        <div className='card border border-base-200 bg-base-100 shadow-sm'>
                                <div className='overflow-x-auto'>
                                        <table className='table'>
                                                <thead>
                                                        <tr>
                                                                <th className='w-[28%]'>Người dùng</th>
                                                                <th className='w-[22%]'>Vai trò & hồ sơ</th>
                                                                <th className='w-[16%]'>Trạng thái</th>
                                                                <th className='w-[18%]'>Cập nhật</th>
                                                                <th className='w-[16%] text-right'>Thao tác</th>
                                                        </tr>
                                                </thead>
                                                <tbody>
                                                        {isLoading && (
                                                                <tr>
                                                                        <td colSpan={5}>
                                                                                <div className='space-y-3 p-6'>
                                                                                        <div className='skeleton h-12 w-full' />
                                                                                        <div className='skeleton h-12 w-full' />
                                                                                        <div className='skeleton h-12 w-full' />
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        )}
                                                        {!isLoading && isError && (
                                                                <tr>
                                                                        <td colSpan={5}>
                                                                                <div className='alert alert-error m-4'>
                                                                                        <Ban className='size-4' />
                                                                                        <span>Không thể tải danh sách người dùng. Vui lòng thử lại.</span>
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        )}
                                                        {!isLoading && !isError && users.length === 0 && (
                                                                <tr>
                                                                        <td colSpan={5}>
                                                                                <div className='p-10 text-center text-base-content/60'>Không có người dùng phù hợp.</div>
                                                                        </td>
                                                                </tr>
                                                        )}
                                                        {users.map(user => {
                                                                const isSelf = currentUser?.id === user.id
                                                                return (
                                                                        <tr key={user.id} className='hover'>
                                                                                <td>
                                                                                        <div className='flex items-center gap-3'>
                                                                                                <div className='avatar'>
                                                                                                        {user.avatar ? (
                                                                                                                <div className='size-12 rounded-full border border-base-200 bg-base-200/60 ring ring-primary/10 ring-offset-2 ring-offset-base-100 overflow-hidden'>
                                                                                                                        <img
                                                                                                                                src={user.avatar}
                                                                                                                                alt={toDisplayName(user)}
                                                                                                                                className='size-full object-cover'
                                                                                                                        />
                                                                                                                </div>
                                                                                                        ) : (
                                                                                                                <div className='bg-primary/10 text-primary size-12 rounded-full grid place-items-center text-base font-semibold uppercase'>
                                                                                                                        {toInitials(user)}
                                                                                                                </div>
                                                                                                        )}
                                                                                                </div>
                                                                                                <div>
                                                                                                        <div className='flex items-center gap-2 font-medium text-base-content'>
                                                                                                                {toDisplayName(user)}
                                                                                                                {isSelf && <span className='badge badge-info badge-sm'>Bạn</span>}
                                                                                                        </div>
                                                                                                        <div className='text-sm text-base-content/70'>{user.email}</div>
                                                                                                </div>
                                                                                        </div>
                                                                                </td>
                                                                                <td>
                                                                                        <div className='flex flex-col gap-2'>
                                                                                                <span className={`${roleBadgeClass(user.role)} gap-1`}> 
                                                                                                        <Shield className='size-3.5' />
                                                                                                        {user.role ? ROLE_LABELS[user.role] : 'Chưa gán'}
                                                                                                </span>
                                                                                                <div className='flex flex-wrap gap-2 text-xs'>
                                                                                                        {user.hasClientProfile && <span className='badge badge-outline badge-sm border-info/40 text-info'>Hồ sơ khách hàng</span>}
                                                                                                        {user.hasFreelancerProfile && <span className='badge badge-outline badge-sm border-success/40 text-success'>Hồ sơ freelancer</span>}
                                                                                                        {!user.hasClientProfile && !user.hasFreelancerProfile && (
                                                                                                                <span className='text-base-content/60'>Chưa tạo hồ sơ</span>
                                                                                                        )}
                                                                                                </div>
                                                                                        </div>
                                                                                </td>
                                                                                <td>
                                                                                        <div className='flex items-center gap-3'>
                                                                                                <label className='flex items-center gap-2'>
                                                                                                        <input
                                                                                                                type='checkbox'
                                                                                                                className='toggle toggle-primary toggle-sm'
                                                                                                                checked={user.isActive}
                                                                                                                onChange={() => handleToggleStatus(user)}
                                                                                                                disabled={statusUpdatingId === user.id || (isSelf && user.isActive)}
                                                                                                                aria-label='Đổi trạng thái người dùng'
                                                                                                        />
                                                                                                        <span className='text-sm font-medium text-base-content'>
                                                                                                                {statusUpdatingId === user.id
                                                                                                                        ? 'Đang cập nhật…'
                                                                                                                        : user.isActive
                                                                                                                        ? 'Đang hoạt động'
                                                                                                                        : 'Đã khóa'}
                                                                                                        </span>
                                                                                                </label>
                                                                                        </div>
                                                                                </td>
                                                                                <td>
                                                                                        <div className='text-sm text-base-content/70'>
                                                                                                <div>Cập nhật: {formatDateTime(user.updatedAt)}</div>
                                                                                                <div className='text-xs text-base-content/50'>Tạo: {formatDateTime(user.createdAt)}</div>
                                                                                        </div>
                                                                                </td>
                                                                                <td>
                                                                                        <div className='flex justify-end gap-2'>
                                                                                                <button type='button' className='btn btn-sm btn-ghost' onClick={() => setSelectedUserId(user.id)}>
                                                                                                        <Eye className='size-4' /> Chi tiết
                                                                                                </button>
                                                                                        </div>
                                                                                </td>
                                                                        </tr>
                                                                )
                                                        })}
                                                </tbody>
                                        </table>
                                </div>
                                <div className='flex items-center justify-between border-t border-base-200 p-4 text-sm text-base-content/70'>
                                        <div>Tổng cộng: {total} người dùng</div>
                                        <div className='flex items-center gap-2'>
                                                <button className='btn btn-sm' onClick={() => setPage(page => Math.max(1, page - 1))} disabled={page <= 1}>
                                                        <ChevronLeft className='size-4' />
                                                </button>
                                                <span className='px-3 text-sm'>Trang {page} / {pages}</span>
                                                <button className='btn btn-sm' onClick={() => setPage(page => Math.min(pages, page + 1))} disabled={page >= pages}>
                                                        <ChevronRight className='size-4' />
                                                </button>
                                        </div>
                                </div>
                        </div>

                        <AdminUserDetailModal
                                open={Boolean(selectedUserId)}
                                userId={selectedUserId}
                                onClose={() => setSelectedUserId(null)}
                                onUpdateRole={handleUpdateRoleFromModal}
                                onToggleStatus={handleUpdateStatusFromModal}
                                onBanUser={handleBanUserFromModal}
                                onUnbanUser={handleUnbanUserFromModal}
                                updatingRole={roleUpdatingId === selectedUserId}
                                updatingStatus={statusUpdatingId === selectedUserId}
                                banningUser={banningUserId === selectedUserId}
                                unbanningUser={unbanningUserId === selectedUserId}
                                currentUserId={currentUser?.id}
                        />
                </div>
        )
}
