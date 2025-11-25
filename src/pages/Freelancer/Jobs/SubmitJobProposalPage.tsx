import { useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BriefcaseBusiness, Clock, DollarSign, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import JobProposalForm from './components/JobProposalForm'
import type { JobProposalFormValues } from './components/JobProposalForm'
import { fetchFreelancerJobPostDetail } from '~/apis/job-post.api'
import { createJobProposal } from '~/apis/job-proposal.api'
import { routes } from '~/config/routes'
import type { JobPostDetail } from '~/types/job-post'
import { JOB_DURATION_COMMITMENTS } from '~/constants/job'

const durationMap = Object.fromEntries(
        JOB_DURATION_COMMITMENTS.map(item => [item.value, item.label])
) as Record<string, string>

const formatBudget = (job?: JobPostDetail) => {
        if (!job || job.budgetAmount == null || !job.budgetCurrency) return 'Budget TBD'
        try {
                return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: job.budgetCurrency,
                        maximumFractionDigits: 0
                }).format(job.budgetAmount)
        } catch {
                return `${job.budgetAmount.toLocaleString()} ${job.budgetCurrency}`
        }
}

const SubmitJobProposalPage = () => {
        const { jobId } = useParams<{ jobId: string }>()
        const [searchParams] = useSearchParams()
        const invitationId = searchParams.get('invitationId') ?? undefined
        const navigate = useNavigate()
        const queryClient = useQueryClient()

        const jobQuery = useQuery<JobPostDetail>({
                queryKey: ['freelancer-job-post', jobId],
                enabled: Boolean(jobId),
                queryFn: async () => {
                        if (!jobId) {
                                throw new Error('Missing job identifier')
                        }
                        return fetchFreelancerJobPostDetail(jobId)
                }
        })

        const submitMutation = useMutation({
                mutationFn: async (values: JobProposalFormValues) => {
                        if (!jobId) {
                                throw new Error('Missing job identifier')
                        }
                        const payload = {
                                jobId,
                                invitationId,
                                coverLetter: values.coverLetter ?? null,
                                bidAmount: values.bidAmount ?? undefined,
                                bidCurrency:
                                        values.bidAmount === undefined || values.bidAmount === null
                                                ? undefined
                                                : 'USD',
                                estimatedDuration: values.estimatedDuration ?? undefined
                        }
                        return createJobProposal(payload)
                },
                onSuccess: async () => {
                        toast.success('Proposal submitted successfully.')
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-proposals'] })
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-post', jobId] })
                        navigate(`${routes.freelancer.jobs.invitations}?tab=submitted`)
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Unable to submit proposal.'
                        toast.error(message)
                }
        })

        const defaultFormValues = useMemo(() => {
                if (!jobQuery.data) return undefined
                return {
                        bidCurrency: 'USD'
                } satisfies Partial<JobProposalFormValues>
        }, [jobQuery.data])

        if (!jobId) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10'>
                                <div className='rounded-3xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error'>
                                        Job identifier is missing. Please return to the marketplace.
                                </div>
                        </div>
                )
        }

        if (jobQuery.isLoading) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10 text-base-content/70'>
                                <div className='flex items-center gap-3 rounded-3xl border border-base-200 bg-base-100 px-6 py-4 shadow-sm'>
                                        <Loader2 className='size-5 animate-spin text-primary' />
                                        <span>Loading job details…</span>
                                </div>
                        </div>
                )
        }

        if (jobQuery.isError || !jobQuery.data) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10'>
                                <div className='rounded-3xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error'>
                                        Unable to load the job post. {(jobQuery.error as Error)?.message || 'Please try again later.'}
                                </div>
                        </div>
                )
        }

        const job = jobQuery.data

        return (
                <div className='mx-auto w-full max-w-4xl px-4 py-8 lg:px-0'>
                        <div className='mb-6 flex items-center gap-3 text-sm text-base-content/70'>
                                <ArrowLeft className='size-4' />
                                <Link to={routes.freelancer.jobs.detail(job.id)} className='link link-hover text-primary'>
                                        Back to job details
                                </Link>
                        </div>

                        <div className='space-y-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                        <div>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-primary/70'>Submit proposal</p>
                                                <h1 className='mt-2 text-2xl font-semibold text-base-content'>{job.title}</h1>
                                                <p className='mt-2 text-sm text-base-content/70'>Tell the client why you are the best fit and outline your terms if needed.</p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-100/80 p-4 text-sm text-base-content/70'>
                                                <div className='flex items-center gap-2 font-medium text-base-content'>
                                                        <BriefcaseBusiness className='size-4 text-primary/70' /> Project summary
                                                </div>
                                                <ul className='mt-3 space-y-2'>
                                                        <li className='flex items-center gap-2'>
                                                                <DollarSign className='size-4 text-primary/70' /> {formatBudget(job)}
                                                        </li>
                                                        <li className='flex items-center gap-2'>
                                                                <Clock className='size-4 text-primary/70' />
                                                                {job.duration ? durationMap[job.duration] ?? 'Flexible duration' : 'Flexible duration'}
                                                        </li>
                                                </ul>
                                        </div>
                                </div>

                                <JobProposalForm
                                        mode='create'
                                        defaultValues={defaultFormValues}
                                        submitLabel={submitMutation.isPending ? 'Submitting…' : 'Submit proposal'}
                                        isSubmitting={submitMutation.isPending}
                                        onCancel={() => navigate(-1)}
                                        onSubmit={values => submitMutation.mutate(values)}
                                />
                        </div>
                </div>
        )
}

export default SubmitJobProposalPage
