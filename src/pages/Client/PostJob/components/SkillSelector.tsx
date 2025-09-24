import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

type SkillSelectorProps = {
        title: string
        description: string
        placeholder: string
        options: { id: string; name: string }[]
        selected: string[]
        onChange: (_ids: string[]) => void
        disabled?: boolean
        tone?: 'primary' | 'secondary'
        onSearchChange?: (_value: string) => void
}

export function SkillSelector({
        title,
        description,
        placeholder,
        options,
        selected,
        onChange,
        disabled = false,
        tone = 'primary',
        onSearchChange
}: SkillSelectorProps) {
        const [keyword, setKeyword] = useState('')

        const filtered = useMemo(() => {
                const lower = keyword.trim().toLowerCase()
                if (!lower) return options
                return options.filter(option => option.name.toLowerCase().includes(lower))
        }, [keyword, options])

        const toggle = (id: string) => {
                if (selected.includes(id)) {
                        onChange(selected.filter(item => item !== id))
                        return
                }
                onChange([...selected, id])
        }

        return (
                <div className='rounded-2xl border border-base-200 p-5'>
                        <div className='mb-3'>
                                <h3 className='text-base font-semibold text-base-content'>{title}</h3>
                                <p className='text-xs text-base-content/60'>{description}</p>
                        </div>

                        <input
                                value={keyword}
                                onChange={event => {
                                        const value = event.target.value
                                        setKeyword(value)
                                        onSearchChange?.(value)
                                }}
                                placeholder={placeholder}
                                disabled={disabled}
                                className='input input-bordered mb-3 w-full'
                        />

                        <div className='flex flex-wrap gap-2'>
                                {selected.map(id => {
                                        const skill = options.find(option => option.id === id)
                                        return (
                                                <span
                                                        key={id}
                                                        className={`badge gap-2 rounded-full px-3 py-3 text-xs font-medium ${
                                                                tone === 'primary'
                                                                        ? 'badge-primary'
                                                                        : 'border border-dashed border-primary/40 bg-transparent text-primary'
                                                        }`}
                                                >
                                                        {skill?.name ?? id}
                                                        <button type='button' onClick={() => toggle(id)} className='rounded-full bg-black/10 p-[2px]'>
                                                                <X className='size-3' />
                                                        </button>
                                                </span>
                                        )
                                })}
                        </div>

                        <div className='mt-4 space-y-2'>
                                {disabled ? (
                                        <p className='rounded-xl border border-dashed border-base-300 p-4 text-center text-xs text-base-content/60'>
                                                Pick a specialty first to browse available skills.
                                        </p>
                                ) : filtered.length > 0 ? (
                                        filtered.map(option => {
                                                const active = selected.includes(option.id)
                                                return (
                                                        <button
                                                                key={option.id}
                                                                type='button'
                                                                className={`flex w-full items-center justify-between rounded-xl border px-4 py-2 text-left text-sm transition ${
                                                                        active
                                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                                : 'border-base-200 hover:border-primary/40'
                                                                }`}
                                                                onClick={() => toggle(option.id)}
                                                        >
                                                                <span>{option.name}</span>
                                                                <span className='text-xs'>{active ? 'Selected' : 'Add'}</span>
                                                        </button>
                                                )
                                        })
                                ) : (
                                        <p className='rounded-xl border border-dashed border-base-300 p-4 text-center text-xs text-base-content/60'>
                                                No skills match that search yet. Try a different keyword.
                                        </p>
                                )}
                        </div>
                </div>
        )
}
