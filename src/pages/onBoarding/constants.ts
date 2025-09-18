export const WIZARD_LIMITS = {
  maxCategories: 2,
  maxSpecialties: 6,
  maxSkills: 15,
} as const

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
