import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
        AlertCircle,
        BadgeDollarSign,
        Calendar,
        ChevronLeft,
        ChevronRight,
        Filter,
        Layers,
        Loader2,
        MapPin,
        RefreshCcw,
        Search,
        SlidersHorizontal,
        XCircle
} from 'lucide-react'
import {
        JOB_EXPERIENCE_LEVELS,
        JOB_LOCATION_TYPES,
        JOB_PAYMENT_MODES,
        JOB_STATUS_OPTIONS,
        JOB_VISIBILITY_OPTIONS,
        type JobExperienceLevel,
        type JobLocationType,
        type JobPaymentMode,
        type JobStatus,
        type JobVisibility
} from '~/constants/job'
import { listAdminJobPosts } from '~/apis/admin/job-post.api'
import type { AdminJobPostFilterInput, AdminJobPostListResponse, JobPostListItem } from '~/types/job-post'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { LucideIcon } from 'lucide-react'

type AttachmentsFilterValue = 'all' | 'with' | 'without'

type MultiSelectOption<T extends string> = { value: T; label: string }

type MultiSelectGroupProps<T extends string> = {
        label: string
        icon: LucideIcon
        options: MultiSelectOption<T>[]
        selectedValues: T[]
        onChange: (_values: T[]) => void
}

const limitOptions = [10, 20, 50]

const statusOptions: MultiSelectOption<JobStatus>[] = JOB_STATUS_OPTIONS.map(option => ({
        value: option.value,
        label: option.label
}))

const paymentModeOptions: MultiSelectOption<JobPaymentMode>[] = JOB_PAYMENT_MODES.map(option => ({
        value: option.value,
        label: option.label
}))

const experienceLevelOptions: MultiSelectOption<JobExperienceLevel>[] = JOB_EXPERIENCE_LEVELS.map(option => ({
        value: option.value,
        label: option.label
}))

const locationTypeOptions: MultiSelectOption<JobLocationType>[] = JOB_LOCATION_TYPES.map(option => ({
        value: option.value,
        label: option.label
}))

const statusLabelMap = Object.fromEntries(statusOptions.map(option => [option.value, option.label])) as Record<JobStatus, string>
const paymentModeLabelMap = Object.fromEntries(paymentModeOptions.map(option => [option.value, option.label])) as Record<
        JobPaymentMode,
        string
>
const experienceLevelLabelMap = Object.fromEntries(
        experienceLevelOptions.map(option => [option.value, option.label])
) as Record<JobExperienceLevel, string>
const locationTypeLabelMap = Object.fromEntries(
        locationTypeOptions.map(option => [option.value, option.label])
) as Record<JobLocationType, string>
const visibilityLabelMap = Object.fromEntries(
        JOB_VISIBILITY_OPTIONS.map(option => [option.value, option.label])
) as Record<JobVisibility, string>

function MultiSelectGroup<T extends string>({
        label,
        icon: Icon,
        options,
        selectedValues,
        onChange
}: MultiSelectGroupProps<T>) {
        const toggleValue = (value: T) => {
                onChange(
                        selectedValues.includes(value)
                                ? selectedValues.filter(item => item !== value)
                                : [...selectedValues, value]
                )
        }

        return (
                <div className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                        <div className='mb-3 flex items-center justify-between gap-2'>
                                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                        <Icon className='size-4' />
                                        <span>{label}</span>
                                </div>
                                <button
                                        type='button'
                                        className='btn btn-ghost btn-xs gap-1 text-xs'
                                        disabled={selectedValues.length === 0}
                                        onClick={() => onChange([])}
                                >
                                        <XCircle className='size-3.5' />
                                        Bỏ chọn
                                </button>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                                {options.map(option => {
                                        const isActive = selectedValues.includes(option.value)
                                        return (
                                                <button
                                                        key={option.value}
                                                        type='button'
                                                        className={`btn btn-xs ${
                                                                isActive
                                                                        ? 'btn-primary text-primary-content'
                                                                        : 'btn-outline border-base-300'
                                                        }`}
                                                        onClick={() => toggleValue(option.value)}
                                                >
                                                        {option.label}
                                                </button>
                                        )
                                })}
                                {options.length === 0 && (
                                        <span className='text-sm text-base-content/60'>Không có tùy chọn</span>
                                )}
                        </div>
                </div>
        )
}

const parseListInput = (value: string) =>
        value
                .split(/[\n,]+/)
                .map(item => item.trim())
                .filter(item => item.length > 0)

const parseNumberInput = (value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return undefined
        const parsed = Number(trimmed)
        return Number.isFinite(parsed) ? parsed : undefined
}

const parseDateInput = (value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return undefined
        const isoString = `${trimmed}T00:00:00.000Z`
        const date = new Date(isoString)
        return Number.isNaN(date.getTime()) ? undefined : date
}

const formatDateTime = (value?: string | null) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '—'
        return date.toLocaleString('vi-VN', { hour12: false })
}

const formatBudget = (job: JobPostListItem) => {
        if (job.budgetAmount == null || !job.budgetCurrency) {
                return 'Chưa cập nhật'
        }

        try {
                return new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: job.budgetCurrency,
                        maximumFractionDigits: 0
                }).format(job.budgetAmount)
        } catch {
                return `${job.budgetAmount} ${job.budgetCurrency}`
        }
}

const statusBadgeClass = (status: JobStatus) => {
        switch (status) {
                case 'PUBLISHED':
                        return 'badge border border-success/40 bg-success/10 text-success'
                case 'CLOSED':
                        return 'badge border border-neutral/40 bg-neutral/10 text-neutral'
                case 'DRAFT':
                default:
                        return 'badge badge-outline'
        }
}

export default function AdminProjects() {
        const [page, setPage] = useState(1)
        const [limit, setLimit] = useState<number>(20)
        const [search, setSearch] = useState('')
        const [statuses, setStatuses] = useState<JobStatus[]>([])
        const [paymentModes, setPaymentModes] = useState<JobPaymentMode[]>([])
        const [experienceLevels, setExperienceLevels] = useState<JobExperienceLevel[]>([])
        const [locationTypes, setLocationTypes] = useState<JobLocationType[]>([])
        const [visibility, setVisibility] = useState<JobVisibility | 'ALL'>('ALL')
        const [attachmentsFilter, setAttachmentsFilter] = useState<AttachmentsFilterValue>('all')
        const [includeDeleted, setIncludeDeleted] = useState(false)
        const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
        const [formVersionsInput, setFormVersionsInput] = useState('')
        const [specialtyId, setSpecialtyId] = useState('')
        const [categoryId, setCategoryId] = useState('')
        const [clientId, setClientId] = useState('')
        const [languageCodesInput, setLanguageCodesInput] = useState('')
        const [skillIdsInput, setSkillIdsInput] = useState('')
        const [budgetMinInput, setBudgetMinInput] = useState('')
        const [budgetMaxInput, setBudgetMaxInput] = useState('')
        const [createdFromInput, setCreatedFromInput] = useState('')
        const [createdToInput, setCreatedToInput] = useState('')

        const debouncedSearch = useDebounce(search, 500)

        const formVersions = useMemo(() => parseListInput(formVersionsInput), [formVersionsInput])
        const languageCodes = useMemo(
                () => parseListInput(languageCodesInput).map(code => code.toUpperCase()),
                [languageCodesInput]
        )
        const skillIds = useMemo(() => parseListInput(skillIdsInput), [skillIdsInput])
        const budgetMin = useMemo(() => parseNumberInput(budgetMinInput), [budgetMinInput])
        const budgetMax = useMemo(() => parseNumberInput(budgetMaxInput), [budgetMaxInput])
        const createdFrom = useMemo(() => parseDateInput(createdFromInput), [createdFromInput])
        const createdTo = useMemo(() => parseDateInput(createdToInput), [createdToInput])

        const budgetError = budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax
        const createdRangeError = Boolean(createdFrom && createdTo && createdFrom > createdTo)
        const hasValidationError = budgetError || createdRangeError

        const filters = useMemo(() => {
                const nextFilters: AdminJobPostFilterInput = {
                        page,
                        limit,
                        sortBy
                }

                if (debouncedSearch.trim()) {
                        nextFilters.search = debouncedSearch.trim()
                }

                if (statuses.length > 0) {
                        nextFilters.statuses = statuses
                }

                if (paymentModes.length > 0) {
                        nextFilters.paymentModes = paymentModes
                }

                if (experienceLevels.length > 0) {
                        nextFilters.experienceLevels = experienceLevels
                }

                if (locationTypes.length > 0) {
                        nextFilters.locationTypes = locationTypes
                }

                if (visibility !== 'ALL') {
                        nextFilters.visibility = visibility
                }

                if (attachmentsFilter !== 'all') {
                        nextFilters.hasAttachments = attachmentsFilter === 'with'
                }

                if (includeDeleted) {
                        nextFilters.includeDeleted = true
                }

                if (formVersions.length > 0) {
                        nextFilters.formVersions = formVersions
                }

                if (specialtyId.trim()) {
                        nextFilters.specialtyId = specialtyId.trim()
                }

                if (categoryId.trim()) {
                        nextFilters.categoryId = categoryId.trim()
                }

                if (clientId.trim()) {
                        nextFilters.clientId = clientId.trim()
                }

                if (languageCodes.length > 0) {
                        nextFilters.languageCodes = languageCodes
                }

                if (skillIds.length > 0) {
                        nextFilters.skillIds = skillIds
                }

                if (budgetMin !== undefined) {
                        nextFilters.budgetMin = budgetMin
                }

                if (budgetMax !== undefined) {
                        nextFilters.budgetMax = budgetMax
                }

                if (createdFrom) {
                        nextFilters.createdFrom = createdFrom
                }

                if (createdTo) {
                        nextFilters.createdTo = createdTo
                }

                return nextFilters
        }, [
                page,
                limit,
                sortBy,
                debouncedSearch,
                statuses,
                paymentModes,
                experienceLevels,
                locationTypes,
                visibility,
                attachmentsFilter,
                includeDeleted,
                formVersions,
                specialtyId,
                categoryId,
                clientId,
                languageCodes,
                skillIds,
                budgetMin,
                budgetMax,
                createdFrom,
                createdTo
        ])

        const queryKey = useMemo(() => ['admin-job-posts', filters], [filters])

        const { data, isLoading, isError, isFetching, error, refetch } = useQuery<AdminJobPostListResponse>({
                queryKey,
                queryFn: async () => listAdminJobPosts(filters),
                placeholderData: keepPreviousData,
                enabled: !hasValidationError
        })

        const jobs = data?.data ?? []
        const meta = data?.meta
        const total = meta?.total ?? jobs.length
        const currentPage = meta?.page ?? page
        const pageSize = meta?.limit && meta.limit > 0 ? meta.limit : limit
        const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1
        const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
        const endItem = total === 0 ? 0 : Math.min(currentPage * pageSize, total)

        const validationMessage = (() => {
                if (budgetError) return 'budgetMin phải nhỏ hơn hoặc bằng budgetMax'
                if (createdRangeError) return 'createdFrom phải nhỏ hơn hoặc bằng createdTo'
                return null
        })()

        const handleResetFilters = () => {
                setSearch('')
                setStatuses([])
                setPaymentModes([])
                setExperienceLevels([])
                setLocationTypes([])
                setVisibility('ALL')
                setAttachmentsFilter('all')
                setIncludeDeleted(false)
                setSortBy('newest')
                setFormVersionsInput('')
                setSpecialtyId('')
                setCategoryId('')
                setClientId('')
                setLanguageCodesInput('')
                setSkillIdsInput('')
                setBudgetMinInput('')
                setBudgetMaxInput('')
                setCreatedFromInput('')
                setCreatedToInput('')
                setPage(1)
        }

        const errorMessage = error instanceof Error ? error.message : 'Không thể tải danh sách job posts.'

        return (
                <div className='space-y-6 p-6'>
                        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                                <div>
                                        <h1 className='text-2xl font-semibold text-base-content'>Quản lý job posts</h1>
                                        <p className='text-sm text-base-content/70'>Theo dõi, lọc và rà soát các bài đăng tuyển dụng của khách hàng.</p>
                                </div>
                                <div className='flex items-center gap-2'>
                                        <button
                                                type='button'
                                                className='btn btn-ghost gap-2'
                                                onClick={() => refetch()}
                                                disabled={isFetching && !isError}
                                        >
                                                {isFetching ? <Loader2 className='size-4 animate-spin' /> : <RefreshCcw className='size-4' />}
                                                Làm mới
                                        </button>
                                        <button type='button' className='btn btn-outline gap-2' onClick={handleResetFilters}>
                                                <Filter className='size-4' />
                                                Xóa bộ lọc
                                        </button>
                                </div>
                        </div>

                        <div className='space-y-5 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]'>
                                        <label className='input input-bordered flex items-center gap-2'>
                                                <Search className='size-4 text-base-content/60' />
                                                <input
                                                        value={search}
                                                        onChange={event => {
                                                                setSearch(event.target.value)
                                                                setPage(1)
                                                        }}
                                                        placeholder='Tìm kiếm theo tiêu đề hoặc mô tả'
                                                        className='grow'
                                                />
                                        </label>

                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                        <SlidersHorizontal className='size-3.5' /> Sắp xếp
                                                </span>
                                                <select
                                                        className='select select-bordered select-sm'
                                                        value={sortBy}
                                                        onChange={event => {
                                                                setSortBy(event.target.value as 'newest' | 'oldest')
                                                                setPage(1)
                                                        }}
                                                >
                                                        <option value='newest'>Mới nhất</option>
                                                        <option value='oldest'>Cũ nhất</option>
                                                </select>
                                        </label>

                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                        <BadgeDollarSign className='size-3.5' /> Đính kèm
                                                </span>
                                                <select
                                                        className='select select-bordered select-sm'
                                                        value={attachmentsFilter}
                                                        onChange={event => {
                                                                setAttachmentsFilter(event.target.value as AttachmentsFilterValue)
                                                                setPage(1)
                                                        }}
                                                >
                                                        <option value='all'>Tất cả</option>
                                                        <option value='with'>Có đính kèm</option>
                                                        <option value='without'>Không đính kèm</option>
                                                </select>
                                        </label>

                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                        <Layers className='size-3.5' /> Visibility
                                                </span>
                                                <select
                                                        className='select select-bordered select-sm'
                                                        value={visibility}
                                                        onChange={event => {
                                                                setVisibility(event.target.value as JobVisibility | 'ALL')
                                                                setPage(1)
                                                        }}
                                                >
                                                        <option value='ALL'>Tất cả</option>
                                                        {JOB_VISIBILITY_OPTIONS.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>

                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                        Số bản ghi
                                                </span>
                                                <select
                                                        className='select select-bordered select-sm'
                                                        value={limit}
                                                        onChange={event => {
                                                                setLimit(Number(event.target.value))
                                                                setPage(1)
                                                        }}
                                                >
                                                        {limitOptions.map(option => (
                                                                <option key={option} value={option}>
                                                                        {option} / trang
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>

                                        <label className='flex items-center gap-2 text-sm font-medium text-base-content'>
                                                <input
                                                        type='checkbox'
                                                        className='checkbox checkbox-sm'
                                                        checked={includeDeleted}
                                                        onChange={event => {
                                                                setIncludeDeleted(event.target.checked)
                                                                setPage(1)
                                                        }}
                                                />
                                                Bao gồm job đã xóa
                                        </label>
                                </div>

                                <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-2'>
                                        <MultiSelectGroup
                                                label='Trạng thái'
                                                icon={Filter}
                                                options={statusOptions}
                                                selectedValues={statuses}
                                                onChange={values => {
                                                        setStatuses(values)
                                                        setPage(1)
                                                }}
                                        />
                                        <MultiSelectGroup
                                                label='Hình thức thanh toán'
                                                icon={BadgeDollarSign}
                                                options={paymentModeOptions}
                                                selectedValues={paymentModes}
                                                onChange={values => {
                                                        setPaymentModes(values)
                                                        setPage(1)
                                                }}
                                        />
                                        <MultiSelectGroup
                                                label='Kinh nghiệm yêu cầu'
                                                icon={Layers}
                                                options={experienceLevelOptions}
                                                selectedValues={experienceLevels}
                                                onChange={values => {
                                                        setExperienceLevels(values)
                                                        setPage(1)
                                                }}
                                        />
                                        <MultiSelectGroup
                                                label='Hình thức làm việc'
                                                icon={MapPin}
                                                options={locationTypeOptions}
                                                selectedValues={locationTypes}
                                                onChange={values => {
                                                        setLocationTypes(values)
                                                        setPage(1)
                                                }}
                                        />
                                </div>

                                <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/70'>Form version</span>
                                                <textarea
                                                        className='textarea textarea-bordered h-20'
                                                        placeholder='Nhập nhiều giá trị, phân tách bằng dấu phẩy hoặc dòng mới'
                                                        value={formVersionsInput}
                                                        onChange={event => {
                                                                setFormVersionsInput(event.target.value)
                                                                setPage(1)
                                                        }}
                                                />
                                        </label>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/70'>Mã ngôn ngữ</span>
                                                <textarea
                                                        className='textarea textarea-bordered h-20'
                                                        placeholder='VD: EN, VI'
                                                        value={languageCodesInput}
                                                        onChange={event => {
                                                                setLanguageCodesInput(event.target.value)
                                                                setPage(1)
                                                        }}
                                                />
                                        </label>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/70'>Kỹ năng yêu cầu</span>
                                                <textarea
                                                        className='textarea textarea-bordered h-20'
                                                        placeholder='Nhập danh sách skillId'
                                                        value={skillIdsInput}
                                                        onChange={event => {
                                                                setSkillIdsInput(event.target.value)
                                                                setPage(1)
                                                        }}
                                                />
                                        </label>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/70'>Specialty ID</span>
                                                <input
                                                        className='input input-bordered'
                                                        value={specialtyId}
                                                        onChange={event => {
                                                                setSpecialtyId(event.target.value)
                                                                setPage(1)
                                                        }}
                                                        placeholder='Nhập specialtyId'
                                                />
                                        </label>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/70'>Category ID</span>
                                                <input
                                                        className='input input-bordered'
                                                        value={categoryId}
                                                        onChange={event => {
                                                                setCategoryId(event.target.value)
                                                                setPage(1)
                                                        }}
                                                        placeholder='Nhập categoryId'
                                                />
                                        </label>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/70'>Client ID</span>
                                                <input
                                                        className='input input-bordered'
                                                        value={clientId}
                                                        onChange={event => {
                                                                setClientId(event.target.value)
                                                                setPage(1)
                                                        }}
                                                        placeholder='Nhập clientId'
                                                />
                                        </label>
                                </div>

                                <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                        <BadgeDollarSign className='size-3.5' /> Budget min
                                                </span>
                                                <input
                                                        type='number'
                                                        className='input input-bordered'
                                                        value={budgetMinInput}
                                                        onChange={event => {
                                                                setBudgetMinInput(event.target.value)
                                                                setPage(1)
                                                        }}
                                                        placeholder='Từ'
                                                />
                                        </label>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                        <BadgeDollarSign className='size-3.5' /> Budget max
                                                </span>
                                                <input
                                                        type='number'
                                                        className='input input-bordered'
                                                        value={budgetMaxInput}
                                                        onChange={event => {
                                                                setBudgetMaxInput(event.target.value)
                                                                setPage(1)
                                                        }}
                                                        placeholder='Đến'
                                                />
                                        </label>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                        <Calendar className='size-3.5' /> Từ ngày tạo
                                                </span>
                                                <input
                                                        type='date'
                                                        className='input input-bordered'
                                                        value={createdFromInput}
                                                        onChange={event => {
                                                                setCreatedFromInput(event.target.value)
                                                                setPage(1)
                                                        }}
                                                />
                                        </label>
                                        <label className='flex flex-col gap-1 text-sm text-base-content'>
                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                        <Calendar className='size-3.5' /> Đến ngày tạo
                                                </span>
                                                <input
                                                        type='date'
                                                        className='input input-bordered'
                                                        value={createdToInput}
                                                        onChange={event => {
                                                                setCreatedToInput(event.target.value)
                                                                setPage(1)
                                                        }}
                                                />
                                        </label>
                                </div>

                                {validationMessage && (
                                        <div className='alert alert-error mt-2'>
                                                <AlertCircle className='size-5' />
                                                <span>{validationMessage}</span>
                                        </div>
                                )}
                        </div>

                        <div className='rounded-3xl border border-base-200 bg-base-100 shadow-sm'>
                                <div className='flex items-center justify-between border-b border-base-200 px-6 py-4 text-sm text-base-content/70'>
                                        <span>
                                                Hiển thị {startItem}-{endItem} / {total} job posts
                                        </span>
                                        <span>Trang {currentPage} / {totalPages}</span>
                                </div>
                                <div className='overflow-x-auto'>
                                        <table className='table'>
                                                <thead>
                                                        <tr>
                                                                <th className='min-w-[260px]'>Job post</th>
                                                                <th className='min-w-[180px]'>Client &amp; danh mục</th>
                                                                <th className='min-w-[200px]'>Yêu cầu</th>
                                                                <th className='min-w-[200px]'>Ngân sách &amp; thanh toán</th>
                                                                <th className='min-w-[160px]'>Trạng thái</th>
                                                                <th className='min-w-[200px]'>Thời gian</th>
                                                        </tr>
                                                </thead>
                                                <tbody>
                                                        {isLoading && (
                                                                <tr>
                                                                        <td colSpan={6}>
                                                                                <div className='space-y-4 p-6'>
                                                                                        <div className='skeleton h-12 w-full' />
                                                                                        <div className='skeleton h-12 w-full' />
                                                                                        <div className='skeleton h-12 w-full' />
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        )}
                                                        {!isLoading && isError && (
                                                                <tr>
                                                                        <td colSpan={6}>
                                                                                <div className='alert alert-error m-4'>
                                                                                        <AlertCircle className='size-5' />
                                                                                        <span>{errorMessage}</span>
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        )}
                                                        {!isLoading && !isError && jobs.length === 0 && (
                                                                <tr>
                                                                        <td colSpan={6}>
                                                                                <div className='p-8 text-center text-base-content/60'>Không có job post nào phù hợp.</div>
                                                                        </td>
                                                                </tr>
                                                        )}
                                                        {!isLoading && !isError && jobs.map(job => (
                                                                <tr key={job.id} className='align-top'>
                                                                        <td>
                                                                                <div className='flex flex-col gap-1'>
                                                                                        <span className='text-sm font-semibold text-base-content'>{job.title}</span>
                                                                                        <p className='line-clamp-2 text-xs text-base-content/70'>{job.description}</p>
                                                                                        <span className='text-[11px] uppercase tracking-wide text-base-content/50'>ID: {job.id}</span>
                                                                                </div>
                                                                        </td>
                                                                        <td>
                                                                                <div className='space-y-1 text-sm text-base-content/80'>
                                                                                        <div className='font-medium text-base-content'>Client: {job.clientId}</div>
                                                                                        {job.specialty && (
                                                                                                <div>
                                                                                                        <div>{job.specialty.name}</div>
                                                                                                        {job.specialty.category && (
                                                                                                                <div className='text-xs text-base-content/60'>
                                                                                                                        Category: {job.specialty.category.name}
                                                                                                                </div>
                                                                                                        )}
                                                                                                </div>
                                                                                        )}
                                                                                        <div className='text-xs text-base-content/60'>Visibility: {visibilityLabelMap[job.visibility] ?? job.visibility}</div>
                                                                                </div>
                                                                        </td>
                                                                        <td>
                                                                                <div className='space-y-1 text-sm text-base-content/80'>
                                                                                        <div>Kinh nghiệm: {experienceLevelLabelMap[job.experienceLevel] ?? job.experienceLevel}</div>
                                                                                        <div>Hình thức: {locationTypeLabelMap[job.locationType] ?? job.locationType}</div>
                                                                                        <div className='text-xs text-base-content/60'>Form version: {job.formVersion}</div>
                                                                                </div>
                                                                        </td>
                                                                        <td>
                                                                                <div className='space-y-1 text-sm text-base-content/80'>
                                                                                        <div>Ngân sách: {formatBudget(job)}</div>
                                                                                        <div className='text-xs text-base-content/60'>Hình thức: {paymentModeLabelMap[job.paymentMode] ?? job.paymentMode}</div>
                                                                                        <div className='text-xs text-base-content/60'>Đính kèm: {job.attachmentsCount}</div>
                                                                                </div>
                                                                        </td>
                                                                        <td>
                                                                                <div className='flex flex-col gap-2 text-sm text-base-content'>
                                                                                        <span className={statusBadgeClass(job.status)}>{statusLabelMap[job.status] ?? job.status}</span>
                                                                                        {job.isDeleted && (
                                                                                                <span className='badge border border-error/30 bg-error/10 text-error'>Đã xóa</span>
                                                                                        )}
                                                                                        {job.publishedAt ? (
                                                                                                <span className='text-xs text-base-content/60'>Đã xuất bản</span>
                                                                                        ) : (
                                                                                                <span className='text-xs text-base-content/60'>Chưa xuất bản</span>
                                                                                        )}
                                                                                </div>
                                                                        </td>
                                                                        <td>
                                                                                <div className='space-y-1 text-xs text-base-content/70'>
                                                                                        <div>Tạo: {formatDateTime(job.createdAt)}</div>
                                                                                        <div>Cập nhật: {formatDateTime(job.updatedAt)}</div>
                                                                                        <div>Xuất bản: {formatDateTime(job.publishedAt)}</div>
                                                                                        {job.deletedAt && <div>Xóa: {formatDateTime(job.deletedAt)}</div>}
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        ))}
                                                </tbody>
                                        </table>
                                </div>
                                <div className='flex items-center justify-between border-t border-base-200 px-6 py-4'>
                                        <div className='text-sm text-base-content/70'>
                                                Tổng cộng: {total} job posts
                                        </div>
                                        <div className='join'>
                                                <button
                                                        type='button'
                                                        className='btn join-item'
                                                        disabled={currentPage <= 1}
                                                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                >
                                                        <ChevronLeft className='size-4' />
                                                </button>
                                                <button type='button' className='btn join-item'>
                                                        Trang {currentPage} / {totalPages}
                                                </button>
                                                <button
                                                        type='button'
                                                        className='btn join-item'
                                                        disabled={currentPage >= totalPages}
                                                        onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                                >
                                                        <ChevronRight className='size-4' />
                                                </button>
                                        </div>
                                </div>
                        </div>
                </div>
        )
}
