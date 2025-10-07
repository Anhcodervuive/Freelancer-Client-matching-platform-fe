import type { ClientFreelancerListItem } from './client-freelancer'
import type { JobProposal, JobProposalStatus } from './job-proposal'

export type ClientJobProposal = JobProposal & {
        freelancer?: ClientFreelancerListItem | null
        chatThreadId?: string | null
        chatThread?: { id?: string | null } | null
        metadata?: Record<string, unknown> | null
}

export type ClientJobProposalStatusAggregate = {
        status?: JobProposalStatus | string | null
        count?: number | null
}

export type ClientJobProposalAggregates = {
        statuses?: ClientJobProposalStatusAggregate[] | null
}

export type PaginatedClientJobProposalResponse = {
        data?: ClientJobProposal[] | null
        total?: number
        page?: number
        limit?: number
        aggregates?: ClientJobProposalAggregates | null
}
