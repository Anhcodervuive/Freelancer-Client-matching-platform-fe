import { z } from 'zod'

export const JOB_PAYMENT_MODES = [
	{
		value: 'FIXED_SINGLE',
		label: 'Single payment project',
		description: 'Pay talent once when all agreed deliverables are complete.',
		budgetLabel: 'Total project budget',
		placeholder: 'e.g. 1500',
		step: 5
	},
	{
		value: 'FIXED_MILESTONE',
		label: 'Milestone-based project',
		description: 'Divide the scope into milestones and release funds as work is approved.',
		budgetLabel: 'Budget per milestone',
		placeholder: 'e.g. 500',
		step: 5
	}
] as const

export const JOB_EXPERIENCE_LEVELS = [
	{
		value: 'ENTRY',
		label: 'Entry',
		description: 'Looking for beginners getting started with this type of work.'
	},
	{
		value: 'INTERMEDIATE',
		label: 'Intermediate',
		description: 'Looking for experience and a track record delivering similar projects.'
	},
	{
		value: 'EXPERT',
		label: 'Expert',
		description: 'Looking for the very best with deep expertise for this engagement.'
	}
] as const

export const JOB_DURATION_COMMITMENTS = [
	{ value: 'LESS_THAN_ONE_MONTH', label: 'Less than 1 month' },
	{ value: 'ONE_TO_THREE_MONTHS', label: '1 to 3 months' },
	{ value: 'THREE_TO_SIX_MONTHS', label: '3 to 6 months' },
	{ value: 'MORE_THAN_SIX_MONTHS', label: 'More than 6 months' },
	{ value: 'ONGOING', label: 'Ongoing project' }
] as const

export const JOB_LOCATION_TYPES = [
	{
		value: 'REMOTE',
		label: 'Remote',
		description: 'Work from anywhere. Great for distributed teams.'
	},
	{
		value: 'ON_SITE',
		label: 'On-site',
		description: 'Freelancers work from your office or a specific location.'
	},
	{
		value: 'HYBRID',
		label: 'Hybrid',
		description: 'Blend of remote and on-site collaboration.'
	}
] as const

export const JOB_VISIBILITY_OPTIONS = [
	{ value: 'PUBLIC', label: 'Public, visible to everyone' },
	{ value: 'PRIVATE', label: 'Private, only invited talent can apply' },
	{ value: 'INVITE_ONLY', label: 'Invite only, visible to invited freelancers' }
] as const

export const JOB_STATUS_OPTIONS = [
	{ value: 'DRAFT', label: 'Save as draft' },
	{ value: 'PUBLISHED', label: 'Publish immediately' },
	{ value: 'CLOSED', label: 'Close this job' }
] as const

export const CURRENCY_CODES = ['USD', 'EUR', 'VND', 'JPY', 'AUD'] as const

export const JobPaymentModeSchema = z.enum(JOB_PAYMENT_MODES.map(mode => mode.value) as [string, ...string[]])
export const JobExperienceLevelSchema = z.enum(JOB_EXPERIENCE_LEVELS.map(level => level.value) as [string, ...string[]])
export const JobDurationCommitmentSchema = z.enum(
	JOB_DURATION_COMMITMENTS.map(item => item.value) as [string, ...string[]]
)
export const JobLocationTypeSchema = z.enum(JOB_LOCATION_TYPES.map(item => item.value) as [string, ...string[]])
export const JobVisibilitySchema = z.enum(JOB_VISIBILITY_OPTIONS.map(item => item.value) as [string, ...string[]])
export const JobStatusSchema = z.enum(JOB_STATUS_OPTIONS.map(item => item.value) as [string, ...string[]])

export type JobPaymentMode = z.infer<typeof JobPaymentModeSchema>
export type JobExperienceLevel = z.infer<typeof JobExperienceLevelSchema>
export type JobDurationCommitment = z.infer<typeof JobDurationCommitmentSchema>
export type JobLocationType = z.infer<typeof JobLocationTypeSchema>
export type JobVisibility = z.infer<typeof JobVisibilitySchema>
export type JobStatus = z.infer<typeof JobStatusSchema>
