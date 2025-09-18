import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { WIZARD_LIMITS } from '../constants'
import { WizardStepHeader } from './WizardLayout'

interface SkillsStepProps {
  options: { id: string; name: string }[]
  picked: string[]
  onChange: (_ids: string[]) => void
  keyword: string
  onKeywordChange: (_value: string) => void
}

export function SkillsStep({ options, picked, onChange, keyword, onKeywordChange }: SkillsStepProps) {
  const filtered = useMemo(() => {
    const lower = keyword.trim().toLowerCase()
    if (!lower) return options
    return options.filter(option => option.name.toLowerCase().includes(lower))
  }, [keyword, options])

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      onChange(picked.filter(item => item !== id))
      return
    }
    if (picked.length < WIZARD_LIMITS.maxSkills) {
      onChange([...picked, id])
    }
  }

  return (
    <div>
      <WizardStepHeader
        title='Bạn thành thạo những kỹ năng nào?'
        subtitle={`Hãy chọn tối đa ${WIZARD_LIMITS.maxSkills} kỹ năng để hệ thống gợi ý công việc chính xác hơn.`}
      />

      <label className='input input-bordered flex items-center gap-2'>
        <Search className='size-4 opacity-70' />
        <input
          className='grow'
          placeholder='Nhập kỹ năng bạn muốn tìm'
          value={keyword}
          onChange={event => onKeywordChange(event.target.value)}
        />
        <span className='text-xs text-base-content/70'>
          {picked.length}/{WIZARD_LIMITS.maxSkills}
        </span>
      </label>

      <div className='mt-4 flex flex-wrap gap-2'>
        {picked.map(id => {
          const skill = options.find(item => item.id === id)
          if (!skill) return null

          return (
            <span key={id} className='badge badge-primary gap-2 rounded-full px-3 py-3 text-xs font-medium'>
              {skill.name}
              <button type='button' onClick={() => toggle(id)} className='rounded-full bg-primary/20 px-1 text-[10px]'>
                ✕
              </button>
            </span>
          )
        })}
      </div>

      <div className='mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
        {filtered.map(item => {
          const selected = picked.includes(item.id)
          return (
            <button
              key={item.id}
              type='button'
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-base-200 hover:border-primary/40 hover:bg-base-200/40'
              }`}
              onClick={() => toggle(item.id)}
            >
              {item.name}
            </button>
          )
        })}
        {filtered.length === 0 ? (
          <div className='col-span-full rounded-lg border border-dashed border-base-300 p-6 text-center text-sm text-base-content/70'>
            Không tìm thấy kỹ năng phù hợp, hãy thử từ khóa khác.
          </div>
        ) : null}
      </div>
    </div>
  )
}
