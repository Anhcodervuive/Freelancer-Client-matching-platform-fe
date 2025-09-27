export type JobInvitationStatus =
        | 'PENDING'
        | 'ACCEPTED'
        | 'DECLINED'
        | 'EXPIRED'
        | 'WITHDRAWN'
        | (string & {})

export type JobInvitation = {
        id: string
        jobId: string
        freelancerId: string
        status: JobInvitationStatus
        message?: string | null
        expiresAt?: string | null
        respondedAt?: string | null
        createdAt?: string | null
        updatedAt?: string | null
        respondedMessage?: string | null
}

export type CreateJobInvitationInput = {
        jobId: string
        freelancerId: string
        message?: string
        expiresAt?: string
}

export type JobInvitationFilterInput = {
        page?: number
        limit?: number
        jobId?: string
        freelancerId?: string
        status?: JobInvitationStatus
        statuses?: JobInvitationStatus[]
        search?: string
        sentFrom?: Date | string
        sentTo?: Date | string
        respondedFrom?: Date | string
        respondedTo?: Date | string
        includeExpired?: boolean
        sortBy?: 'newest' | 'oldest' | 'responded-latest' | 'responded-earliest'
}

export type PaginatedJobInvitationResponse = {
        data?: JobInvitation[]
        total?: number
        page?: number
        limit?: number
        message?: string
}
