import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import JobProposalForm from './components/JobProposalForm'
import type { JobProposalFormValues } from './components/JobProposalForm'
import {
        getFreelancerJobProposalDetail,
        updateJobProposal
} from '~/apis/job-proposal.api'
import { routes } from '~/config/routes'
import type { JobProposal } from '~/types/job-proposal'
import { ACTIVE_PROPOSAL_STATUSES, JOB_PROPOSAL_STATUS_META } from '~/constants/job-proposal'

const determineRedirectPath = (proposal?: JobProposal) => {
        if (!proposal) return routes.freelancer.jobs.invitations
        if (ACTIVE_PROPOSAL_STATUSES.includes(proposal.status)) {
                        return `${routes.freelancer.jobs.invitations}?tab=active`
        }
        if (proposal.status === 'SUBMITTED') {
                return `${routes.freelancer.jobs.invitations}?tab=submitted`
        }
        return routes.freelancer.jobs.invitations
}

const EditJobProposalPage = () => {
        const { proposalId } = useParams<{ proposalId: string }>()
        const navigate = useNavigate()
        const queryClient = useQueryClient()

        const proposalQuery = useQuery<JobProposal>({
                queryKey: ['freelancer-job-proposal', proposalId],
                enabled: Boolean(proposalId),
                queryFn: async () => {
                        if (!proposalId) {
                                throw new Error('Missing proposal identifier')
                        }
                        return getFreelancerJobProposalDetail(proposalId)
                }
        })

        const updateMutation = useMutation({
                mutationFn: async (values: JobProposalFormValues) => {
                        if (!proposalId) {
                                throw new Error('Missing proposal identifier')
                        }
                        const payload = {
                                coverLetter: values.coverLetter ?? null,
                                bidAmount: values.bidAmount ?? null,
                                bidCurrency:
                                        values.bidAmount === undefined || values.bidAmount === null
                                                ? null
                                                : 'USD',
                                estimatedDuration: values.estimatedDuration ?? null
                        }
                        return updateJobProposal(proposalId, payload)
                },
                onSuccess: async data => {
                        toast.success('Proposal updated successfully.')
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-proposals'] })
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-proposal', proposalId] })
                        navigate(determineRedirectPath(data))
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Unable to update proposal.'
                        toast.error(message)
                }
        })

        const defaultValues = useMemo(() => {
                if (!proposalQuery.data) return undefined
                return {
                        coverLetter: proposalQuery.data.coverLetter ?? '',
                        bidAmount: proposalQuery.data.bidAmount ?? undefined,
                        bidCurrency: proposalQuery.data.bidAmount ? 'USD' : undefined,
                        estimatedDuration: proposalQuery.data.estimatedDuration ?? undefined
                } satisfies Partial<JobProposalFormValues>
        }, [proposalQuery.data])

        if (!proposalId) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10'>
                                <div className='rounded-3xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error'>
                                        Proposal identifier is missing. Return to the proposals page and try again.
                                </div>
                        </div>
                )
        }

        if (proposalQuery.isLoading) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-base-content/70'>
                                <div className='flex items-center gap-3 rounded-3xl border border-base-200 bg-base-100 px-6 py-4 shadow-sm'>
                                        <Loader2 className='size-5 animate-spin text-primary' />
                                        <span>Loading proposal details…</span>
                                </div>
                        </div>
                )
        }

        if (proposalQuery.isError || !proposalQuery.data) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10'>
                                <div className='rounded-3xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error'>
                                        Unable to load this proposal. {(proposalQuery.error as Error)?.message || 'Please try again later.'}
                                </div>
                        </div>
                )
        }

        const proposal = proposalQuery.data
        const statusMeta = JOB_PROPOSAL_STATUS_META[proposal.status]
        const jobTitle = proposal.job?.title ?? 'Job proposal'
        const jobId = proposal.job?.id ?? proposal.jobId

        return (
                <div className='mx-auto w-full max-w-4xl px-4 py-8 lg:px-0'>
                        <div className='mb-6 flex items-center gap-3 text-sm text-base-content/70'>
                                <ArrowLeft className='size-4' />
                                <button
                                        type='button'
                                        onClick={() => navigate(determineRedirectPath(proposal))}
                                        className='link link-hover text-primary'
                                >
                                        Back to proposals
                                </button>
                        </div>

                        <div className='space-y-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                        <div>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-primary/70'>Edit proposal</p>
                                                <h1 className='mt-2 text-2xl font-semibold text-base-content'>{jobTitle}</h1>
                                                <p className='mt-2 text-sm text-base-content/70'>Make adjustments to your message or bid before the client makes a decision.</p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-100/80 p-4 text-sm text-base-content/70'>
                                                <div className='flex items-center gap-2 font-medium text-base-content'>
                                                        <BadgeCheck className='size-4 text-primary/70' /> Current status
                                                </div>
                                                <span className={`badge mt-3 w-fit ${statusMeta.badgeClass}`}>
                                                        {statusMeta.label}
                                                </span>
                                                <Link
                                                        to={routes.freelancer.jobs.detail(jobId)}
                                                        className='mt-3 inline-flex items-center text-xs font-medium text-primary hover:underline'
                                                >
                                                        View job posting
                                                </Link>
                                        </div>
                                </div>

                                <JobProposalForm
                                        mode='edit'
                                        defaultValues={defaultValues}
                                        submitLabel={updateMutation.isPending ? 'Saving…' : 'Save changes'}
                                        isSubmitting={updateMutation.isPending}
                                        onCancel={() => navigate(determineRedirectPath(proposal))}
                                        onSubmit={values => updateMutation.mutate(values)}
                                />
                        </div>
                </div>
        )
}

export default EditJobProposalPage
