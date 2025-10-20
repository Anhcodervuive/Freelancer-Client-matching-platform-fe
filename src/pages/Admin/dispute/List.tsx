import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BadgeDollarSign, CalendarClock, Filter, RefreshCcw, Search, ShieldCheck, User2 } from 'lucide-react'
import { toast } from 'react-toastify'

import { getAdminDisputes, joinDisputeAsAdmin } from '~/apis/admin/dispute.api'
import { routes } from '~/config/routes'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { AdminDisputeListItem, AdminJoinDisputeInput, DisputeUserSummary } from '~/types/dispute'
import { DisputeStatus } from '~/types/dispute'

const STATUS_OPTIONS = Object.values(DisputeStatus)

const statusClassMap: Partial<Record<DisputeStatus, string>> = {
        [DisputeStatus.OPEN]: 'badge-warning',
        [DisputeStatus.NEGOTIATION]: 'badge-info',
        [DisputeStatus.AWAITING_ARBITRATION_FEES]: 'badge-warning',
        [DisputeStatus.ARBITRATION]: 'badge-secondary',
        [DisputeStatus.RESOLVED_RELEASE_ALL]: 'badge-success',
        [DisputeStatus.RESOLVED_REFUND_ALL]: 'badge-success',
        [DisputeStatus.RESOLVED_SPLIT]: 'badge-success',
        [DisputeStatus.CANCELED]: 'badge-neutral',
        [DisputeStatus.EXPIRED]: 'badge-neutral'
}

const formatDateTime = (value?: string | null) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return value
        return date.toLocaleString()
}

const humanizeStatus = (status?: DisputeStatus | null) =>
        status ? status.split('_').map(part => part.charAt(0) + part.slice(1).toLowerCase()).join(' ') : 'Unknown'

const formatUserName = (user?: DisputeUserSummary | null, fallback?: string | null) => {
        if (!user) {
                return fallback ?? '—'
        }
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
        if (fullName.length) return fullName
        if (user.profile && typeof user.profile === 'object') {
                const profileName = [
                        (user.profile as Record<string, unknown>).firstName,
                        (user.profile as Record<string, unknown>).lastName
                ]
                        .filter(value => typeof value === 'string')
                        .join(' ')
                        .trim()
                if (profileName.length) {
                        return profileName
                }
        }
        return user.id || fallback || '—'
}

const pickBooleanFlag = (record: AdminDisputeListItem, keys: string[]) => {
        for (const key of keys) {
                const value = record[key]
                if (typeof value === 'boolean') {
                        return value
                }
        }
        return undefined
}

type NeedsAdminOption = 'all' | 'true' | 'false'

export default function AdminDisputeListPage() {
        const [page, setPage] = useState(1)
        const [limit, setLimit] = useState(10)
        const [search, setSearch] = useState('')
        const debouncedSearch = useDebounce(search, 500)

        const [selectedStatuses, setSelectedStatuses] = useState<DisputeStatus[]>([])
        const [needsAdminFilter, setNeedsAdminFilter] = useState<NeedsAdminOption>('all')
        const [contractId, setContractId] = useState('')
        const [clientId, setClientId] = useState('')
        const [freelancerId, setFreelancerId] = useState('')
        const [createdFrom, setCreatedFrom] = useState('')
        const [createdTo, setCreatedTo] = useState('')

        const [joinTarget, setJoinTarget] = useState<AdminDisputeListItem | null>(null)
        const [joinReason, setJoinReason] = useState('')

        const queryClient = useQueryClient()

        const dateRangeError = useMemo(() => {
                if (!createdFrom || !createdTo) return false
                return new Date(createdFrom) > new Date(createdTo)
        }, [createdFrom, createdTo])

        const queryKey = useMemo(
                () => [
                        'admin-disputes',
                        {
                                page,
                                limit,
                                statuses: selectedStatuses.join(','),
                                needsAdminFilter,
                                search: debouncedSearch,
                                contractId,
                                clientId,
                                freelancerId,
                                createdFrom,
                                createdTo
                        }
                ],
                [
                        page,
                        limit,
                        selectedStatuses,
                        needsAdminFilter,
                        debouncedSearch,
                        contractId,
                        clientId,
                        freelancerId,
                        createdFrom,
                        createdTo
                ]
        )

        const filters = useMemo(
                () => ({
                        page,
                        limit,
                        status: selectedStatuses.length ? selectedStatuses : undefined,
                        needsAdmin: needsAdminFilter === 'all' ? undefined : needsAdminFilter === 'true',
                        search: debouncedSearch || undefined,
                        contractId: contractId.trim() || undefined,
                        clientId: clientId.trim() || undefined,
                        freelancerId: freelancerId.trim() || undefined,
                        createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
                        createdTo: createdTo ? new Date(createdTo).toISOString() : undefined
                }),
                [
                        page,
                        limit,
                        selectedStatuses,
                        needsAdminFilter,
                        debouncedSearch,
                        contractId,
                        clientId,
                        freelancerId,
                        createdFrom,
                        createdTo
                ]
        )

        const { data, isLoading, isFetching, isError, refetch } = useQuery({
                queryKey,
                queryFn: () => getAdminDisputes(filters),
                enabled: !dateRangeError
        })

        const disputes = data?.data ?? []
        const total = data?.total ?? 0
        const pages = Math.max(1, Math.ceil(total / limit))

        const joinMutation = useMutation({
                mutationFn: ({ disputeId, payload }: { disputeId: string; payload: AdminJoinDisputeInput }) =>
                        joinDisputeAsAdmin(disputeId, payload),
                onSuccess: async () => {
                        toast.success('Đã tham gia tranh chấp với tư cách admin')
                        setJoinTarget(null)
                        setJoinReason('')
                        await queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
                },
                onError: () => {
                        toast.error('Không thể tham gia tranh chấp, vui lòng thử lại sau')
                }
        })

        const toggleStatus = (status: DisputeStatus) => {
                setSelectedStatuses(prev => {
                        if (prev.includes(status)) {
                                return prev.filter(item => item !== status)
                        }
                        return [...prev, status]
                })
                setPage(1)
        }

        const resetFilters = () => {
                setSelectedStatuses([])
                setNeedsAdminFilter('all')
                setContractId('')
                setClientId('')
                setFreelancerId('')
                setCreatedFrom('')
                setCreatedTo('')
                setSearch('')
                setPage(1)
        }

        const handleJoin = () => {
                if (!joinTarget) return
                joinMutation.mutate({
                        disputeId: joinTarget.id,
                        payload: joinReason.trim() ? { reason: joinReason.trim() } : {}
                })
        }

        const limitOptions = [10, 20, 50]

        return (
                <div className='space-y-6'>
                        <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                                <div className='space-y-1'>
                                        <h1 className='text-2xl font-semibold flex items-center gap-2'>
                                                <BadgeDollarSign className='size-6 text-primary' /> Tranh chấp
                                        </h1>
                                        <p className='text-sm text-base-content/70'>Theo dõi và xử lý các tranh chấp giữa khách hàng và freelancer.</p>
                                </div>
                                <div className='flex flex-wrap gap-2'>
                                        <button className='btn btn-ghost' onClick={resetFilters} disabled={isFetching}>
                                                <Filter className='size-4' /> Đặt lại
                                        </button>
                                        <button className='btn' onClick={() => refetch()} disabled={isFetching}>
                                                <RefreshCcw className='size-4' /> Làm mới
                                        </button>
                                </div>
                        </header>

                        <section className='card border border-base-200 bg-base-100 shadow-sm'>
                                <div className='card-body space-y-4'>
                                        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                                                <label className='form-control'>
                                                        <span className='label-text text-sm font-medium'>Tìm kiếm</span>
                                                        <div className='input input-bordered flex items-center gap-2'>
                                                                <Search className='size-4 opacity-70' />
                                                                <input
                                                                        type='text'
                                                                        className='grow bg-transparent outline-none'
                                                                        placeholder='Từ khóa, ghi chú, số hợp đồng...'
                                                                        value={search}
                                                                        onChange={event => {
                                                                                setSearch(event.target.value)
                                                                                setPage(1)
                                                                        }}
                                                                />
                                                        </div>
                                                </label>

                                                <label className='form-control'>
                                                        <span className='label-text text-sm font-medium'>Lọc theo hợp đồng</span>
                                                        <input
                                                                className='input input-bordered'
                                                                placeholder='ID hợp đồng'
                                                                value={contractId}
                                                                onChange={event => {
                                                                        setContractId(event.target.value)
                                                                        setPage(1)
                                                                }}
                                                        />
                                                </label>

                                                <label className='form-control'>
                                                        <span className='label-text text-sm font-medium'>Lọc theo khách hàng</span>
                                                        <input
                                                                className='input input-bordered'
                                                                placeholder='ID khách hàng'
                                                                value={clientId}
                                                                onChange={event => {
                                                                        setClientId(event.target.value)
                                                                        setPage(1)
                                                                }}
                                                        />
                                                </label>

                                                <label className='form-control'>
                                                        <span className='label-text text-sm font-medium'>Lọc theo freelancer</span>
                                                        <input
                                                                className='input input-bordered'
                                                                placeholder='ID freelancer'
                                                                value={freelancerId}
                                                                onChange={event => {
                                                                        setFreelancerId(event.target.value)
                                                                        setPage(1)
                                                                }}
                                                        />
                                                </label>

                                                <label className='form-control'>
                                                        <span className='label-text text-sm font-medium'>Ngày tạo từ</span>
                                                        <input
                                                                type='date'
                                                                className='input input-bordered'
                                                                value={createdFrom}
                                                                onChange={event => {
                                                                        setCreatedFrom(event.target.value)
                                                                        setPage(1)
                                                                }}
                                                        />
                                                </label>

                                                <label className='form-control'>
                                                        <span className='label-text text-sm font-medium'>Đến ngày</span>
                                                        <input
                                                                type='date'
                                                                className='input input-bordered'
                                                                value={createdTo}
                                                                onChange={event => {
                                                                        setCreatedTo(event.target.value)
                                                                        setPage(1)
                                                                }}
                                                        />
                                                </label>

                                                <label className='form-control'>
                                                        <span className='label-text text-sm font-medium'>Cần admin can thiệp</span>
                                                        <select
                                                                className='select select-bordered'
                                                                value={needsAdminFilter}
                                                                onChange={event => {
                                                                        setNeedsAdminFilter(event.target.value as NeedsAdminOption)
                                                                        setPage(1)
                                                                }}>
                                                                <option value='all'>Tất cả</option>
                                                                <option value='true'>Chỉ hiển thị</option>
                                                                <option value='false'>Đã xử lý</option>
                                                        </select>
                                                </label>
                                        </div>

                                        <div>
                                                <span className='label-text text-sm font-medium'>Trạng thái tranh chấp</span>
                                                <div className='mt-2 rounded-lg border border-dashed border-base-300 bg-base-200/40 p-3 max-h-48 overflow-y-auto'>
                                                        {STATUS_OPTIONS.map(status => {
                                                                const checked = selectedStatuses.includes(status)
                                                                return (
                                                                        <label
                                                                                key={status}
                                                                                className='flex items-center gap-3 rounded-md px-2 py-1 hover:bg-base-100'>
                                                                                <input
                                                                                        type='checkbox'
                                                                                        className='checkbox checkbox-sm'
                                                                                        checked={checked}
                                                                                        onChange={() => toggleStatus(status)}
                                                                                />
                                                                                <span className='text-sm'>{humanizeStatus(status)}</span>
                                                                        </label>
                                                                )
                                                        })}
                                                </div>
                                        </div>

                                        {dateRangeError ? (
                                                <div className='alert alert-warning shadow-sm'>
                                                        <CalendarClock className='size-5' />
                                                        <span>Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</span>
                                                </div>
                                        ) : null}
                                </div>
                        </section>

                        <section className='card bg-base-100 shadow-sm'>
                                <div className='overflow-x-auto'>
                                        <table className='table'>
                                                <thead>
                                                        <tr>
                                                                <th className='min-w-[180px]'>Tranh chấp</th>
                                                                <th className='min-w-[220px]'>Hợp đồng &amp; mốc</th>
                                                                <th className='min-w-[180px]'>Khách hàng</th>
                                                                <th className='min-w-[180px]'>Freelancer</th>
                                                                <th className='min-w-[140px]'>Trạng thái</th>
                                                                <th className='min-w-[120px] text-right'>Hành động</th>
                                                        </tr>
                                                </thead>
                                                <tbody>
                                                        {isLoading ? (
                                                                <tr>
                                                                        <td colSpan={6}>
                                                                                <div className='p-6 space-y-3'>
                                                                                        <div className='skeleton h-10 w-full' />
                                                                                        <div className='skeleton h-10 w-full' />
                                                                                        <div className='skeleton h-10 w-2/3' />
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        ) : null}

                                                        {!isLoading && isError ? (
                                                                <tr>
                                                                        <td colSpan={6}>
                                                                                <div className='alert alert-error m-4'>
                                                                                        <ShieldCheck className='size-5' />
                                                                                        <span>Không thể tải dữ liệu tranh chấp. Vui lòng thử lại.</span>
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        ) : null}

                                                        {!isLoading && !isError && disputes.length === 0 ? (
                                                                <tr>
                                                                        <td colSpan={6}>
                                                                                <div className='p-8 text-center text-base-content/70'>Không tìm thấy tranh chấp phù hợp.</div>
                                                                        </td>
                                                                </tr>
                                                        ) : null}

                                                        {!isLoading && !isError
                                                                ? disputes.map(dispute => {
                                                                        const contractTitle =
                                                                                dispute.contract?.title ||
                                                                                dispute.contract?.name ||
                                                                                dispute.contract?.label ||
                                                                                dispute.contract?.slug ||
                                                                                dispute.contract?.description ||
                                                                                ''
                                                                        const milestoneTitle =
                                                                                dispute.milestone?.title ||
                                                                                dispute.milestone?.name ||
                                                                                dispute.milestone?.description ||
                                                                                ''
                                                                        const needsAdminFlag =
                                                                                typeof dispute.needsAdmin === 'boolean'
                                                                                        ? dispute.needsAdmin
                                                                                        : pickBooleanFlag(dispute, [
                                                                                                  'needs_admin',
                                                                                                  'requiresAdmin',
                                                                                                  'awaitingAdmin'
                                                                                          ]) ?? false
                                                                        const alreadyJoined =
                                                                                typeof dispute.joined === 'boolean'
                                                                                        ? dispute.joined
                                                                                        : pickBooleanFlag(dispute, [
                                                                                                  'isAdminParticipant',
                                                                                                  'adminJoined',
                                                                                                  'hasJoined'
                                                                                          ]) ?? false
                                                                        const status = dispute.status ?? dispute.dispute?.status
                                                                        return (
                                                                                <tr key={dispute.id} className='align-top'>
                                                                                        <td>
                                                                                                <div className='font-semibold text-base-content'>#{dispute.id}</div>
                                                                                                <div className='text-sm text-base-content/70'>
                                                                                                        Tạo lúc {formatDateTime(dispute.createdAt ?? dispute.dispute?.createdAt)}
                                                                                                </div>
                                                                                                {needsAdminFlag ? (
                                                                                                        <div className='mt-2 flex items-center gap-2 text-warning text-xs'>
                                                                                                                <Filter className='size-3.5' /> Cần admin tham gia
                                                                                                        </div>
                                                                                                ) : null}
                                                                                        </td>
                                                                                        <td>
                                                                                                <div className='space-y-1'>
                                                                                                        <div className='text-sm font-medium'>
                                                                                                                {contractTitle || 'Hợp đồng #' + (dispute.contract?.id ?? '—')}
                                                                                                        </div>
                                                                                                        <div className='text-xs text-base-content/70'>
                                                                                                                Mốc: {milestoneTitle || (dispute.milestone?.id ? `#${dispute.milestone.id}` : '—')}
                                                                                                        </div>
                                                                                                        {dispute.contract?.id ? (
                                                                                                                <Link
                                                                                                                        to={routes.contracts.detail(dispute.contract.id)}
                                                                                                                        className='link link-primary text-xs'>
                                                                                                                        Xem hợp đồng
                                                                                                                </Link>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        </td>
                                                                                        <td>
                                                                                                <div className='flex items-start gap-2'>
                                                                                                        <User2 className='size-4 text-base-content/60 mt-1' />
                                                                                                        <div>
                                                                                                                <div className='text-sm font-medium'>
                                                                                                                        {formatUserName(dispute.client, dispute.contract?.clientId ?? null)}
                                                                                                                </div>
                                                                                                                <div className='text-xs text-base-content/60'>
                                                                                                                        ID: {dispute.client?.id || dispute.contract?.clientId || '—'}
                                                                                                                </div>
                                                                                                        </div>
                                                                                                </div>
                                                                                        </td>
                                                                                        <td>
                                                                                                <div className='flex items-start gap-2'>
                                                                                                        <User2 className='size-4 text-base-content/60 mt-1' />
                                                                                                        <div>
                                                                                                                <div className='text-sm font-medium'>
                                                                                                                        {formatUserName(dispute.freelancer, dispute.contract?.freelancerId ?? null)}
                                                                                                                </div>
                                                                                                                <div className='text-xs text-base-content/60'>
                                                                                                                        ID: {dispute.freelancer?.id || dispute.contract?.freelancerId || '—'}
                                                                                                                </div>
                                                                                                        </div>
                                                                                                </div>
                                                                                        </td>
                                                                                        <td>
                                                                                                <div className='flex flex-col gap-2'>
                                                                                                        <span
                                                                                                                className={['badge', status ? statusClassMap[status] ?? 'badge-outline' : 'badge-outline'].join(' ')}>
                                                                                                                {humanizeStatus(status)}
                                                                                                        </span>
                                                                                                        <span className='text-xs text-base-content/60'>
                                                                                                                Cập nhật {formatDateTime(dispute.updatedAt ?? dispute.dispute?.updatedAt)}
                                                                                                        </span>
                                                                                                </div>
                                                                                        </td>
                                                                                        <td className='text-right'>
                                                                                                <div className='flex justify-end'>
                                                                                                        <button
                                                                                                                className='btn btn-sm btn-primary'
                                                                                                                disabled={alreadyJoined || joinMutation.isPending}
                                                                                                                onClick={() => {
                                                                                                                        setJoinTarget(dispute)
                                                                                                                        setJoinReason('')
                                                                                                                }}
                                                                                                        >
                                                                                                                Tham gia
                                                                                                        </button>
                                                                                                </div>
                                                                                        </td>
                                                                                </tr>
                                                                        )
                                                                })
                                                                : null}
                                                </tbody>
                                        </table>
                                </div>

                                <div className='card-body border-t border-base-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                        <div className='text-sm text-base-content/70'>
                                                Hiển thị {disputes.length ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, total)} trong tổng số {total} tranh chấp
                                        </div>
                                        <div className='flex flex-wrap items-center gap-3'>
                                                <label className='flex items-center gap-2 text-sm'>
                                                        <span>Hiển thị</span>
                                                        <select
                                                                className='select select-bordered select-sm'
                                                                value={limit}
                                                                onChange={event => {
                                                                        setLimit(Number(event.target.value))
                                                                        setPage(1)
                                                                }}>
                                                                {limitOptions.map(option => (
                                                                        <option key={option} value={option}>
                                                                                {option}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                        <span>dòng</span>
                                                </label>
                                                <div className='join'>
                                                        <button
                                                                className='btn btn-sm join-item'
                                                                onClick={() => setPage(page - 1)}
                                                                disabled={page <= 1}>
                                                                «
                                                        </button>
                                                        <button className='btn btn-sm join-item btn-ghost'>
                                                                Trang {page}/{pages}
                                                        </button>
                                                        <button
                                                                className='btn btn-sm join-item'
                                                                onClick={() => setPage(page + 1)}
                                                                disabled={page >= pages}>
                                                                »
                                                        </button>
                                                </div>
                                        </div>
                                </div>
                        </section>

                        {joinTarget ? (
                                <div className='modal modal-open'>
                                        <div className='modal-box space-y-4'>
                                                <h3 className='text-lg font-semibold flex items-center gap-2'>
                                                        <ShieldCheck className='size-5 text-primary' /> Tham gia tranh chấp #{joinTarget.id}
                                                </h3>
                                                <p className='text-sm text-base-content/70'>Bạn có thể để lại ghi chú cho các bên trước khi tham gia phòng tranh chấp.</p>
                                                <textarea
                                                        className='textarea textarea-bordered w-full'
                                                        rows={4}
                                                        placeholder='Ghi chú cho các bên (tuỳ chọn)'
                                                        value={joinReason}
                                                        onChange={event => setJoinReason(event.target.value)}
                                                />
                                                <div className='modal-action'>
                                                        <button className='btn btn-ghost' onClick={() => setJoinTarget(null)} disabled={joinMutation.isPending}>
                                                                Huỷ
                                                        </button>
                                                        <button className='btn btn-primary' onClick={handleJoin} disabled={joinMutation.isPending}>
                                                                {joinMutation.isPending ? 'Đang xử lý...' : 'Tham gia tranh chấp'}
                                                        </button>
                                                </div>
                                        </div>
                                        <div className='modal-backdrop' onClick={() => !joinMutation.isPending && setJoinTarget(null)}>
                                                Đóng
                                        </div>
                                </div>
                        ) : null}
                </div>
        )
}

