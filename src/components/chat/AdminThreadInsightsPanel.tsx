import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
        ChevronLeft,
        ChevronRight,
        Gavel,
        ShieldCheck,
        AlertCircle,
        Loader2,
        UserCircle2
} from 'lucide-react'

import { getContractDetail } from '~/apis/contract.api'
import { getAdminDisputes } from '~/apis/admin/dispute.api'
import type { chatThread } from '~/types/chat'
import type { AdminDisputeListItem } from '~/types/dispute'
import { Role } from '~/types/user'
import { formatCurrency, formatDateTime } from '~/utils/format'

const shimmerBaseClass =
        "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:content-[''] before:pointer-events-none before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent"

type AdminThreadInsightsPanelProps = {
        thread?: chatThread
        isCollapsed: boolean
        onToggleCollapse: () => void
}

const paymentModeLabels: Record<string, string> = {
        FIXED: 'Fixed price contract',
        MILESTONE: 'Milestone based contract',
        HOURLY: 'Hourly contract'
}

function buildFullName(firstName?: string | null, lastName?: string | null) {
        return [firstName, lastName].filter(Boolean).join(' ')
}

function getParticipantNameByRole(thread?: chatThread, role?: Role) {
        if (!thread || !role) return undefined
        const participant = thread.participants?.find(item => item.role === role)
        const firstName = participant?.user?.profile.firstName
        const lastName = participant?.user?.profile.lastName
        return buildFullName(firstName, lastName)
}

function formatStatus(status?: string | null) {
        if (!status) return 'Unknown'
        return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

function parseAmount(value?: unknown) {
        if (value === undefined || value === null) return undefined
        if (typeof value === 'number') return Number.isNaN(value) ? undefined : value
        const amount = Number(value)
        return Number.isNaN(amount) ? undefined : amount
}

function StatRow({ label, value }: { label: string; value?: string | number | null }) {
        return (
                <div className='flex items-center justify-between gap-3 text-sm'>
                        <span className='text-slate-500'>{label}</span>
                        <span className='font-medium text-slate-900'>{value ?? '—'}</span>
                </div>
        )
}

export default function AdminThreadInsightsPanel({ thread, isCollapsed, onToggleCollapse }: AdminThreadInsightsPanelProps) {
        const contractId = thread?.contractId ?? thread?.contract?.id

        const {
                data: contractDetail,
                isLoading: isContractLoading,
                isFetching: isContractFetching
        } = useQuery({
                queryKey: ['admin-thread-contract', contractId],
                queryFn: () => getContractDetail(contractId!),
                enabled: Boolean(contractId)
        })

        const {
                data: disputes,
                isLoading: isDisputeLoading,
                isFetching: isDisputeFetching
        } = useQuery({
                queryKey: ['admin-thread-disputes', contractId],
                queryFn: () => getAdminDisputes({ contractId: contractId!, page: 1, limit: 3 }),
                enabled: Boolean(contractId)
        })

        const contract = contractDetail ?? thread?.contract ?? null

        const activeDispute = useMemo<AdminDisputeListItem | undefined>(() => {
                if (!disputes?.data?.length) return undefined
                return disputes.data[0]
        }, [disputes?.data])

        const contractCurrency =
                contract?.fixedPriceCurrency ??
                contract?.hourlyRateCurrency ??
                contract?.totalPaidCurrency ??
                activeDispute?.amounts?.currency ??
                thread?.contract?.fixedPriceCurrency ??
                thread?.contract?.hourlyRateCurrency ??
                thread?.contract?.totalPaidCurrency

        const budgetDisplay = formatCurrency(contract?.fixedPrice ?? contract?.totalPaidAmount ?? undefined, contractCurrency)

        const hourlyRateDisplay = formatCurrency(contract?.hourlyRate ?? undefined, contract?.hourlyRateCurrency ?? contractCurrency)

        const paymentModeLabel = contract?.paymentMode ? paymentModeLabels[contract.paymentMode] ?? contract.paymentMode : null

        const lastUpdated = formatDateTime(contract?.updatedAt ?? thread?.updatedAt, { dateStyle: 'medium' })

        const categoryLabel =
                contract?.jobPost?.specialty?.category?.name ??
                contract?.jobPost?.specialty?.name ??
                thread?.jobPost?.specialty?.category?.name ??
                thread?.jobPost?.specialty?.name ??
                '—'

        const clientName =
                buildFullName(contract?.client?.profile?.firstName ?? null, contract?.client?.profile?.lastName ?? null) ||
                contract?.client?.companyName ||
                getParticipantNameByRole(thread, Role.CLIENT) ||
                '—'

        const freelancerName =
                buildFullName(contract?.freelancer?.profile?.firstName ?? null, contract?.freelancer?.profile?.lastName ?? null) ||
                contract?.freelancer?.title ||
                getParticipantNameByRole(thread, Role.FREELANCER) ||
                '—'

        const disputeStatus = formatStatus(activeDispute?.status ?? activeDispute?.dispute?.status)
        const needsAdmin = activeDispute?.needsAdmin ?? activeDispute?.metrics?.needsAdmin ?? false
        const hasAdminJoined = activeDispute?.joined ?? activeDispute?.metrics?.hasAdminJoined ?? false

        const fundedAmount = formatCurrency(parseAmount(activeDispute?.amounts?.funded), activeDispute?.amounts?.currency)
        const releasedAmount = formatCurrency(parseAmount(activeDispute?.amounts?.released), activeDispute?.amounts?.currency)
        const refundedAmount = formatCurrency(parseAmount(activeDispute?.amounts?.refunded), activeDispute?.amounts?.currency)
        const disputableAmount = formatCurrency(parseAmount(activeDispute?.amounts?.disputable), activeDispute?.amounts?.currency)

        const isLoading = (isContractLoading || isDisputeLoading) && !(contract || activeDispute)
        const isUpdating = isContractFetching || isDisputeFetching

        if (isCollapsed) {
                return (
                        <aside className='flex h-full items-center justify-center rounded-3xl border border-base-200 bg-base-100/80 p-2 shadow-lg'>
                                <button
                                        type='button'
                                        onClick={onToggleCollapse}
                                        className='flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-base-200 bg-base-100 px-3 py-4 text-xs font-semibold text-base-content/70 shadow-inner transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-base-100'
                                >
                                        <ChevronLeft className='size-4' />
                                        <span>Mở rộng</span>
                                </button>
                        </aside>
                )
        }

        if (!thread) {
                return (
                        <aside className='flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-base-200 bg-base-100/90 p-6 text-center text-sm text-base-content/70 shadow-lg'>
                                <p>Chọn một cuộc trò chuyện để xem thông tin hợp đồng và dispute.</p>
                        </aside>
                )
        }

        return (
                <aside className='flex h-full flex-col overflow-hidden rounded-3xl border border-base-200 bg-base-100/90 p-4 shadow-lg'>
                        <div className='mb-3 flex items-center justify-between gap-3'>
                                <div>
                                        <p className='text-xs font-medium uppercase tracking-wide text-primary/80'>Conversation context</p>
                                        <h2 className='text-lg font-semibold text-base-content'>Admin insights</h2>
                                </div>
                                <button
                                        type='button'
                                        onClick={onToggleCollapse}
                                        className='inline-flex items-center gap-1 rounded-full border border-base-200 bg-base-100 px-3 py-1 text-xs font-semibold text-base-content/70 shadow-inner transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-base-100'
                                >
                                        <span className='hidden sm:inline'>Thu gọn</span>
                                        <span className='sm:sr-only'>Thu gọn bảng thông tin</span>
                                        <ChevronRight className='size-3' />
                                </button>
                        </div>

                        <div className='relative flex-1 space-y-5 overflow-y-auto pr-1'>
                                {isUpdating && (
                                        <div className='absolute right-2 top-0 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-primary/70'>
                                                <Loader2 className='size-3 animate-spin' />
                                                <span>Đang đồng bộ</span>
                                        </div>
                                )}

                                {isLoading ? (
                                        <div className={`rounded-2xl border border-base-200 bg-base-100/80 p-4 shadow-inner ${shimmerBaseClass}`}>
                                                <div className='flex flex-col gap-3'>
                                                        <div className='h-4 w-1/2 rounded-full bg-base-200/80'></div>
                                                        <div className='h-3 w-2/3 rounded-full bg-base-200/70'></div>
                                                        <div className='h-3 w-1/3 rounded-full bg-base-200/60'></div>
                                                        <div className='h-24 rounded-2xl bg-base-200/40'></div>
                                                </div>
                                        </div>
                                ) : (
                                        <section className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-inner'>
                                                <div className='flex items-start justify-between gap-3'>
                                                        <div>
                                                                <p className='text-xs font-medium uppercase tracking-wide text-primary/70'>Active contract</p>
                                                                <h3 className='mt-1 text-lg font-semibold text-base-content'>{
                                                                        contract?.title ?? thread?.jobPost?.title ?? thread?.subject ?? 'Không có tiêu đề'
                                                                }</h3>
                                                                <p className='text-sm text-base-content/60'>{categoryLabel}</p>
                                                        </div>
                                                        <span className='inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
                                                                <ShieldCheck className='size-4' />
                                                                Workroom
                                                        </span>
                                                </div>
                                                <div className='mt-4 grid grid-cols-2 gap-4 text-sm text-base-content/80'>
                                                        <div>
                                                                <p className='text-xs uppercase tracking-wide text-base-content/40'>Client</p>
                                                                <p className='font-medium text-base-content'>{clientName}</p>
                                                                <p className='text-xs text-base-content/50'>{contract?.client?.companyName ?? 'Premium member'}</p>
                                                        </div>
                                                        <div>
                                                                <p className='text-xs uppercase tracking-wide text-base-content/40'>Freelancer</p>
                                                                <p className='font-medium text-base-content'>{freelancerName}</p>
                                                                <p className='text-xs text-base-content/50'>{contract?.freelancer?.title ?? 'Top Rated Plus'}</p>
                                                        </div>
                                                        <div>
                                                                <p className='text-xs uppercase tracking-wide text-base-content/40'>Budget</p>
                                                                <p className='font-medium text-base-content'>{budgetDisplay ?? hourlyRateDisplay ?? '—'}</p>
                                                                <p className='text-xs text-base-content/50'>{paymentModeLabel ?? 'Contract overview'}</p>
                                                        </div>
                                                        <div>
                                                                <p className='text-xs uppercase tracking-wide text-base-content/40'>Last update</p>
                                                                <p className='font-medium text-base-content'>{lastUpdated ?? '—'}</p>
                                                                <p className='text-xs text-base-content/50'>Synced to platform</p>
                                                        </div>
                                                </div>
                                        </section>
                                )}

                                <section className='rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4'>
                                        <header className='flex items-center justify-between text-sm font-semibold text-primary'>
                                                <span>Dispute &amp; escrow</span>
                                                {activeDispute ? (
                                                        <span className='inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary'>
                                                                <Gavel className='size-3' />
                                                                {disputeStatus}
                                                        </span>
                                                ) : (
                                                        <span className='text-xs font-medium text-primary/60'>Không có dispute</span>
                                                )}
                                        </header>
                                        {activeDispute ? (
                                                <div className='mt-4 space-y-3 text-sm text-base-content/80'>
                                                        <StatRow label='Need admin attention' value={needsAdmin ? 'Yes' : 'No'} />
                                                        <StatRow label='Admin joined' value={hasAdminJoined ? 'Yes' : 'No'} />
                                                        <div className='grid grid-cols-2 gap-3 rounded-xl border border-primary/20 bg-white/80 p-3 text-xs text-base-content/70'>
                                                                <div className='space-y-1'>
                                                                        <p className='text-[11px] uppercase tracking-wide text-primary/60'>Escrow funded</p>
                                                                        <p className='text-sm font-semibold text-base-content'>{fundedAmount ?? '—'}</p>
                                                                </div>
                                                                <div className='space-y-1'>
                                                                        <p className='text-[11px] uppercase tracking-wide text-primary/60'>Escrow released</p>
                                                                        <p className='text-sm font-semibold text-base-content'>{releasedAmount ?? '—'}</p>
                                                                </div>
                                                                <div className='space-y-1'>
                                                                        <p className='text-[11px] uppercase tracking-wide text-primary/60'>Refunded</p>
                                                                        <p className='text-sm font-semibold text-base-content'>{refundedAmount ?? '—'}</p>
                                                                </div>
                                                                <div className='space-y-1'>
                                                                        <p className='text-[11px] uppercase tracking-wide text-primary/60'>Disputable</p>
                                                                        <p className='text-sm font-semibold text-base-content'>{disputableAmount ?? '—'}</p>
                                                                </div>
                                                        </div>
                                                        {activeDispute.metrics?.lastProposalCreatedAt && (
                                                                <StatRow
                                                                        label='Last proposal'
                                                                        value={
                                                                                formatDateTime(activeDispute.metrics?.lastProposalCreatedAt, {
                                                                                        dateStyle: 'medium',
                                                                                        timeStyle: 'short'
                                                                                }) ?? '—'
                                                                        }
                                                                />
                                                        )}
                                                        {activeDispute.admin && (activeDispute.admin.firstName || activeDispute.admin.lastName) && (
                                                                <div className='flex items-center gap-2 rounded-xl border border-primary/20 bg-white/80 p-3 text-xs text-base-content/70'>
                                                                        <UserCircle2 className='size-4 text-primary' />
                                                                        <div className='flex flex-col'>
                                                                                <span className='text-[11px] uppercase tracking-wide text-primary/60'>Last admin</span>
                                                                                <span className='text-sm font-semibold text-base-content'>{buildFullName(activeDispute.admin.firstName, activeDispute.admin.lastName)}</span>
                                                                        </div>
                                                                </div>
                                                        )}
                                                </div>
                                        ) : (
                                                <div className='mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-white/80 p-3 text-sm text-primary/70'>
                                                        <AlertCircle className='size-4 shrink-0' />
                                                        <p>Chưa có tranh chấp nào liên kết với hợp đồng này. Tiếp tục theo dõi để phát hiện sớm.</p>
                                                </div>
                                        )}
                                </section>
                        </div>
                </aside>
        )
}
