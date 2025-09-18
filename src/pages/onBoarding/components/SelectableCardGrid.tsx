import { Check } from 'lucide-react'

export interface SelectableItem {
  id: string
  name: string
  description?: string
}

export function SelectableCardGrid({
  items,
  value,
  onChange,
  max,
  disabledIds,
  columns = 1,
}: {
  items: SelectableItem[]
  value: string[]
  onChange: (_ids: string[]) => void
  max: number
  disabledIds?: Set<string>
  columns?: 1 | 2 | 3
}) {
  const toggle = (id: string) => {
    if (disabledIds?.has(id)) return

    const exists = value.includes(id)
    if (exists) {
      onChange(value.filter(item => item !== id))
      return
    }

    if (value.length < max) {
      onChange([...value, id])
    }
  }

  const gridClass =
    columns === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1'

  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {items.map(item => {
        const selected = value.includes(item.id)
        const disabled = disabledIds?.has(item.id)

        return (
          <button
            key={item.id}
            type='button'
            className={`group rounded-xl border px-4 py-3 text-left transition-all ${
              selected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-base-200 hover:border-primary/40 hover:bg-base-200/40'
            } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            onClick={() => toggle(item.id)}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='space-y-1'>
                <p className='font-medium'>{item.name}</p>
                {item.description ? (
                  <p className='text-sm text-base-content/70'>{item.description}</p>
                ) : null}
              </div>
              {selected ? <Check className='size-4 shrink-0' /> : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}
