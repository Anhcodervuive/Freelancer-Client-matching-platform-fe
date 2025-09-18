import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function WizardStepHeader({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
}) {
  return (
    <div className='mb-6 flex flex-col gap-2'>
      <div className='flex items-center gap-2 text-primary'>
        {icon}
        <span className='font-semibold uppercase tracking-wide text-xs'>Onboarding</span>
      </div>
      <h2 className='text-2xl font-semibold leading-tight'>{title}</h2>
      {subtitle ? <p className='text-base-content/70 text-sm'>{subtitle}</p> : null}
    </div>
  )
}

export function WizardProgress({
  currentIndex,
  total,
}: {
  currentIndex: number
  total: number
}) {
  const percentage = total > 1 ? Math.round((currentIndex / (total - 1)) * 100) : 0

  return (
    <div className='mb-6 space-y-2'>
      <div className='flex items-center justify-between text-xs text-base-content/70'>
        <span>Progress</span>
        <span>{percentage}%</span>
      </div>
      <progress
        className='progress progress-primary h-2 w-full bg-base-200'
        value={percentage}
        max={100}
      />
    </div>
  )
}

export function WizardFooter({
  canPrev,
  canNext,
  onPrev,
  onNext,
  nextLabel,
  hideNext = false,
}: {
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  nextLabel?: string
  hideNext?: boolean
}) {
  return (
    <div className='mt-10 flex items-center justify-between border-t border-base-200 pt-6'>
      <button type='button' className='btn btn-ghost gap-2' disabled={!canPrev} onClick={onPrev}>
        <ChevronLeft className='size-4' /> Trở lại
      </button>
      {hideNext ? null : (
        <button type='button' className='btn btn-primary gap-2' disabled={!canNext} onClick={onNext}>
          {nextLabel ?? 'Tiếp tục'}
          <ChevronRight className='size-4' />
        </button>
      )}
    </div>
  )
}
