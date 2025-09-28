import type { JobProposalStatus } from '~/types/job-proposal'

export const JOB_PROPOSAL_STATUS_META: Record<
        JobProposalStatus,
        { label: string; description: string; badgeClass: string; tone: 'neutral' | 'positive' | 'negative' }
> = {
        SUBMITTED: {
                label: 'Submitted',
                description: 'Waiting for client review.',
                badgeClass: 'badge-primary/20 text-primary',
                tone: 'neutral'
        },
        SHORTLISTED: {
                label: 'Shortlisted',
                description: 'Client is interested in your proposal.',
                badgeClass: 'badge-secondary/20 text-secondary',
                tone: 'positive'
        },
        INTERVIEWING: {
                label: 'Interviewing',
                description: 'You are currently interviewing with the client.',
                badgeClass: 'badge-info/20 text-info',
                tone: 'positive'
        },
        HIRED: {
                label: 'Hired',
                description: 'This proposal resulted in a contract.',
                badgeClass: 'badge-success/20 text-success',
                tone: 'positive'
        },
        DECLINED: {
                label: 'Declined',
                description: 'The client declined this proposal.',
                badgeClass: 'badge-error/20 text-error',
                tone: 'negative'
        },
        WITHDRAWN: {
                label: 'Withdrawn',
                description: 'You withdrew this proposal.',
                badgeClass: 'badge-ghost text-base-content/60',
                tone: 'negative'
        }
}

export const ACTIVE_PROPOSAL_STATUSES: JobProposalStatus[] = ['SHORTLISTED', 'INTERVIEWING', 'HIRED']
export const SUBMITTED_PROPOSAL_STATUSES: JobProposalStatus[] = ['SUBMITTED']
