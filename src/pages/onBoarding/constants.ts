import { FREELANCER_LIMITS } from '~/constants/freelancer'

export const WIZARD_LIMITS = FREELANCER_LIMITS

export const WIZARD_STEPS = [
  'role',
  'cat-spec',
  'skills',
  'title',
  'education',
  'languages',
  'overview',
  'location',
] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]
