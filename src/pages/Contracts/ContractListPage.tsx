import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { CalendarClock, ChevronRight, Clock3, FileText, Loader2, Search, Users } from 'lucide-react'

import { listContracts } from '~/apis/contract.api'
import { getContractStatusMeta } from '~/constants/contract'
import { routes } from '~/config/routes'
import { useDebounce } from '~/hooks/comons/useDebounce'
import { selectCurrentUser } from '~/redux/user/userSlice'
import type { Contract } from '~/types/contract'
import { Role } from '~/types/user'
import { formatDateTime } from '~/utils/format'
import {
        extractLanguageLabels,
        extractSkillNames,
        getBudgetDisplay,
        getParticipantLocation,
        getParticipantName
} from './utils'

const CONTRACT_PAGE_SIZE = 6

const roleFilterOptions = [
        { value: 'all', label: 'Tất cả hợp đồng' },
        { value: 'client', label: 'Tôi là khách hàng' },
        { value: 'freelancer', label: 'Tôi là freelancer' }
] as const

type RoleFilterValue = (typeof roleFilterOptions)[number]['value']

type ContractCardProps = {
        contract: Contract
}

const ContractCard = ({ contract }: ContractCardProps) => {
        const title = contract.title?.trim() || contract.jobPost?.title || 'Hợp đồng không tên'
        const statusMeta = getContractStatusMeta(contract.status)
        const clientName =
                getParticipantName(contract.client.profile, contract.client.companyName) || 'Khách hàng'
        const freelancerName =
                getParticipantName(contract.freelancer.profile, undefined) || 'Freelancer'
        const clientLocation = getParticipantLocation(contract.client.profile)
        const freelancerLocation = getParticipantLocation(contract.freelancer.profile)
        const updatedAt = formatDateTime(contract.updatedAt || contract.createdAt)
        const startDate = formatDateTime(contract.startDate || contract.offer?.startDate || contract.acceptedAt, {
                dateStyle: 'medium'
        })
        const skills = extractSkillNames(contract).slice(0, 5)
        const languages = extractLanguageLabels(contract).slice(0, 3)
        const budget = getBudgetDisplay(contract)

        return (
                <Link
                        to={routes.contracts.detail(contract.id)}
                        className='group flex h-full flex-col justify-between rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_35px_90px_rgba(59,130,246,0.12)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'
                >
                        <div className='space-y-5'>
                                <div className='flex flex-wrap items-start gap-3'>
                                        <div className='flex-1 space-y-1'>
                                                <h3 className='text-lg font-semibold text-slate-900 transition group-hover:text-primary'>
                                                        {title}
                                                </h3>
                                                <p className='text-sm text-slate-500'>
                                                        Cập nhật lần cuối {updatedAt ?? '—'}
                                                </p>
                                        </div>
                                        <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badge} ${statusMeta.text}`}
                                        >
                                                <span className='size-2 rounded-full bg-current'></span>
                                                {statusMeta.label}
                                        </span>
                                </div>

                                <div className='grid gap-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600 shadow-inner shadow-white/20'>
                                        <div className='grid gap-3 md:grid-cols-2'>
                                                <div className='space-y-1'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>Khách hàng</p>
                                                        <div className='flex items-start gap-2'>
                                                                <Users className='mt-0.5 size-4 text-primary' />
                                                                <div>
                                                                        <p className='font-semibold text-slate-800'>{clientName}</p>
                                                                        <p className='text-xs text-slate-500'>{clientLocation ?? 'Không rõ vị trí'}</p>
                                                                </div>
                                                        </div>
                                                </div>
                                                <div className='space-y-1'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>Freelancer</p>
                                                        <div className='flex items-start gap-2'>
                                                                <Users className='mt-0.5 size-4 text-secondary' />
                                                                <div>
                                                                        <p className='font-semibold text-slate-800'>{freelancerName}</p>
                                                                        <p className='text-xs text-slate-500'>
                                                                                {freelancerLocation ?? 'Không rõ vị trí'}
                                                                        </p>
                                                                </div>
                                                        </div>
                                                </div>
                                        </div>

                                        <div className='flex flex-wrap items-center gap-3 text-xs text-slate-500'>
                                                {startDate && (
                                                        <span className='inline-flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-primary'>
                                                                <CalendarClock className='size-3.5' /> Bắt đầu {startDate}
                                                        </span>
                                                )}
                                                {budget && (
                                                        <span className='inline-flex items-center gap-1 rounded-full border border-secondary/10 bg-secondary/5 px-3 py-1 text-secondary'>
                                                                <Clock3 className='size-3.5' /> {budget}
                                                        </span>
                                                )}
                                                {languages.length > 0 && (
                                                        <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600'>
                                                                <FileText className='size-3.5' /> Ngôn ngữ: {languages.join(', ')}
                                                        </span>
                                                )}
                                        </div>
                                </div>

                                {skills.length > 0 && (
                                        <div className='flex flex-wrap items-center gap-2'>
                                                {skills.map(skill => (
                                                        <span
                                                                key={skill}
                                                                className='rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm'
                                                        >
                                                                {skill}
                                                        </span>
                                                ))}
                                        </div>
                                )}
                        </div>

                        <div className='mt-6 flex items-center justify-between text-sm font-medium text-primary'>
                                <span className='inline-flex items-center gap-2'>
                                        Xem chi tiết
                                        <ChevronRight className='size-4 transition group-hover:translate-x-1' />
                                </span>
                                <span className='text-xs font-medium text-slate-400'>Nhấp để mở Workroom</span>
                        </div>
                </Link>
        )
}

const EmptyState = () => (
        <div className='flex flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-slate-200 bg-white/80 p-12 text-center text-slate-500 shadow-inner shadow-white/40'>
                <div className='rounded-full bg-primary/10 p-4 text-primary'>
                        <FileText className='size-8' />
                </div>
                <div className='space-y-2'>
                        <h3 className='text-xl font-semibold text-slate-800'>Chưa có hợp đồng nào</h3>
                        <p className='max-w-md text-sm text-slate-500'>Khi bạn nhận hoặc tạo hợp đồng, chúng sẽ hiển thị tại đây để bạn quản lý milestones, tệp và thanh toán.</p>
                </div>
        </div>
)

const ContractListPage = () => {
        const currentUser = useSelector(selectCurrentUser)
        const inferredRole: RoleFilterValue = currentUser?.role === Role.CLIENT ? 'client' : currentUser?.role === Role.FREELANCER ? 'freelancer' : 'all'
        const [roleFilter, setRoleFilter] = useState<RoleFilterValue>(inferredRole)
        const [page, setPage] = useState(1)
        const [searchTerm, setSearchTerm] = useState('')
        const debouncedSearch = useDebounce(searchTerm, 400)

        useEffect(() => {
                setPage(1)
        }, [roleFilter, debouncedSearch])

        const queryFilters = useMemo(() => {
                const trimmedSearch = debouncedSearch.trim()
                return {
                        page,
                        limit: CONTRACT_PAGE_SIZE,
                        role: roleFilter === 'all' ? undefined : roleFilter,
                        search: trimmedSearch ? trimmedSearch : undefined
                }
        }, [page, roleFilter, debouncedSearch])

        const { data, isFetching, isLoading, isError, refetch } = useQuery({
                queryKey: ['contracts', queryFilters],
                queryFn: () => listContracts(queryFilters),
                keepPreviousData: true
        })

        const contracts = data?.data ?? []
        const total = data?.total ?? 0
        const limit = data?.limit ?? CONTRACT_PAGE_SIZE
        const totalPages = Math.max(1, Math.ceil(total / limit))
        const from = contracts.length ? (page - 1) * limit + 1 : 0
        const to = contracts.length ? from + contracts.length - 1 : 0

        return (
                <div className='space-y-10'>
                        <section className='rounded-[38px] border border-white/60 bg-gradient-to-br from-primary/10 via-white to-secondary/20 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] md:p-12'>
                                <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
                                        <div className='space-y-4'>
                                                <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary'>Workroom</span>
                                                <h1 className='text-3xl font-bold text-slate-900 md:text-4xl'>Quản lý hợp đồng &amp; cộng tác theo phong cách Upwork</h1>
                                                <p className='max-w-2xl text-sm text-slate-600 md:text-base'>Xem nhanh các hợp đồng đang hoạt động, milestones sắp đến hạn và hồ sơ đối tác của bạn. Chọn vai trò để lọc hợp đồng bạn đang làm với tư cách khách hàng hoặc freelancer.</p>
                                        </div>
                                        <div className='grid gap-3 rounded-3xl border border-white/70 bg-white/80 p-5 text-sm text-slate-600 shadow-inner shadow-white/30'>
                                                <div className='flex items-center gap-3'>
                                                        <div className='flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary'>
                                                                <Users className='size-5' />
                                                        </div>
                                                        <div>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Hợp đồng đang mở</p>
                                                                <p className='text-lg font-semibold text-slate-900'>{total}</p>
                                                        </div>
                                                </div>
                                                <div className='flex items-center gap-3'>
                                                        <div className='flex size-12 items-center justify-center rounded-2xl border border-secondary/10 bg-secondary/10 text-secondary'>
                                                                <CalendarClock className='size-5' />
                                                        </div>
                                                        <div>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Cập nhật gần nhất</p>
                                                                <p className='text-sm text-slate-600'>Theo dõi các mốc và hoạt động mới nhất trong hợp đồng của bạn.</p>
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        </section>

                        <section className='space-y-6 rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] md:p-8'>
                                <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                        <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/70 p-1 shadow-inner shadow-white/30'>
                                                {roleFilterOptions.map(option => (
                                                        <button
                                                                key={option.value}
                                                                type='button'
                                                                onClick={() => setRoleFilter(option.value)}
                                                                className={`rounded-xl px-4 py-2 text-xs font-semibold transition md:text-sm ${
                                                                        roleFilter === option.value
                                                                                ? 'bg-gradient-to-r from-primary/90 to-secondary/80 text-white shadow-lg shadow-primary/20'
                                                                                : 'text-slate-500 hover:bg-primary/10 hover:text-primary'
                                                                }`}
                                                        >
                                                                {option.label}
                                                        </button>
                                                ))}
                                        </div>

                                        <label className='relative flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-2 text-sm text-slate-500 shadow-inner shadow-white/20 focus-within:border-primary/50 focus-within:text-primary'>
                                                <Search className='size-4 shrink-0' />
                                                <input
                                                        value={searchTerm}
                                                        onChange={event => setSearchTerm(event.target.value)}
                                                        placeholder='Tìm kiếm theo tiêu đề hợp đồng, freelancer hoặc khách hàng'
                                                        className='w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none'
                                                />
                                        </label>
                                </div>

                                {isError && (
                                        <div className='rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-600'>
                                                Không thể tải danh sách hợp đồng. <button className='font-semibold underline' onClick={() => refetch()}>Thử lại</button>
                                        </div>
                                )}

                                <div className='grid gap-6 md:grid-cols-2'>
                                        {isLoading && (
                                                <div className='col-span-full flex justify-center py-12 text-slate-500'>
                                                        <Loader2 className='size-6 animate-spin' />
                                                </div>
                                        )}

                                        {!isLoading && !contracts.length && <EmptyState />}

                                        {contracts.map(contract => (
                                                <ContractCard key={contract.id} contract={contract} />
                                        ))}
                                </div>

                                {isFetching && !isLoading && (
                                        <div className='flex items-center gap-2 text-sm text-slate-500'>
                                                <Loader2 className='size-4 animate-spin' />
                                                Đang cập nhật dữ liệu...
                                        </div>
                                )}

                                {contracts.length > 0 && (
                                        <div className='flex flex-col gap-4 border-t border-white/70 pt-4 md:flex-row md:items-center md:justify-between'>
                                                <p className='text-sm text-slate-500'>
                                                        Hiển thị <span className='font-semibold text-slate-700'>{from}</span> -{' '}
                                                        <span className='font-semibold text-slate-700'>{to}</span> trên tổng số{' '}
                                                        <span className='font-semibold text-slate-700'>{total}</span> hợp đồng
                                                </p>
                                                <div className='flex items-center gap-3'>
                                                        <button
                                                                type='button'
                                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                                disabled={page === 1}
                                                                className='inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/30 hover:text-primary'
                                                        >
                                                                Trước
                                                        </button>
                                                        <span className='text-sm font-semibold text-slate-500'>Trang {page}/{totalPages}</span>
                                                        <button
                                                                type='button'
                                                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                                                disabled={page === totalPages}
                                                                className='inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/30 hover:text-primary'
                                                        >
                                                                Sau
                                                        </button>
                                                </div>
                                        </div>
                                )}
                        </section>
                </div>
        )
}

export default ContractListPage
