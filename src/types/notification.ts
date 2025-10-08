import type { Profile } from './profile'

export enum NotificationEvent {
        JOB_INVITATION_CREATED = 'JOB_INVITATION_CREATED',
        JOB_INVITATION_CANCELLED = 'JOB_INVITATION_CANCELLED',
        JOB_INVITATION_ACCEPTED = 'JOB_INVITATION_ACCEPTED',
        JOB_INVITATION_DECLINED = 'JOB_INVITATION_DECLINED',
        JOB_OFFER_SENT = 'JOB_OFFER_SENT',
        JOB_HIRE = 'JOB_HIRE',
        JOB_ACCEPT = 'JOB_ACCEPT',
        PROPOSAL_SUBMITTED = 'PROPOSAL_SUBMITTED',
	DISPUTE_CREATED = 'DISPUTE_CREATED',
	DISPUTE_UPDATED = 'DISPUTE_UPDATED',
	SYSTEM_MESSAGE = 'SYSTEM_MESSAGE'
}

export enum NotificationResource {
	JOB_POST = 'JOB_POST',
	JOB_INVITATION = 'JOB_INVITATION',
	JOB_PROPOSAL = 'JOB_PROPOSAL',
	CONTRACT = 'CONTRACT',
	DISPUTE = 'DISPUTE',
	SYSTEM = 'SYSTEM'
}

export enum NotificationStatus {
	PENDING = 'PENDING',
	DELIVERED = 'DELIVERED',
	READ = 'READ'
}

export type NotificationMetadata = {
	title?: string | null
	description?: string | null
	[key: string]: unknown
}

export type Notification = {
	id: string
	recipientId: string
	recipient: {
		profile: Profile
	}
	actorId?: string | null
	actor: {
		profile: Profile
	}
	event: NotificationEvent
	resourceType: NotificationResource
	resourceId: string
	status: NotificationStatus
	readAt?: string | null
	deliveredAt?: string | null
	createdAt: string
	updatedAt: string
	title?: string | null
	message?: string | null
	metadata?: NotificationMetadata | null
}
