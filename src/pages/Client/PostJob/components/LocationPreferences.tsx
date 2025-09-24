import { useMemo, useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Globe2, MapPin, Trash2 } from 'lucide-react'
import CountrySelect, { type CountryOption } from '~/components/form/CountryAutocomplete'
import { JOB_LOCATION_TYPES } from '~/constants/job'
import type { JobPostFormValues } from '../schema'

type LocationPreferencesProps = { hidden?: boolean }

function buildCustomCode(label: string) {
        return label
                .trim()
                .toUpperCase()
                .replace(/[^A-Z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 20)
}

export function LocationPreferences({ hidden }: LocationPreferencesProps) {
        const { control, watch, register } = useFormContext<JobPostFormValues>()
        const locationType = watch('locationType')
        const { fields, append, remove, replace } = useFieldArray({ name: 'preferredLocations', control })
        const [country, setCountry] = useState<CountryOption | null>(null)
        const [regionNote, setRegionNote] = useState('')

        const summary = useMemo(() => {
                if (!fields.length) return 'Open to talent worldwide.'
                if (fields.length === 1) return fields[0]?.label ?? 'Specific location'
                return `${fields.length} preferred locations`
        }, [fields])

        const addLocation = () => {
                if (!country && !regionNote.trim()) return
                let code = country?.value ?? buildCustomCode(regionNote)
                let label = country?.label ?? regionNote.trim()
                if (country && regionNote.trim()) {
                        label = `${country.label} (${regionNote.trim()})`
                        code = `${country.value}-${buildCustomCode(regionNote)}`
                }
                if (!label) return
                if (fields.some(field => field.label === label)) return
                append({ code, label })
                setCountry(null)
                setRegionNote('')
        }

        const resetLocations = () => {
                replace([])
        }

        return (
                <section className={`rounded-2xl border border-base-200 p-5 ${hidden ? 'hidden' : ''}`}>
                        <div className='mb-4 flex flex-col gap-1'>
                                <h3 className='text-base font-semibold text-base-content'>Location</h3>
                                <p className='text-xs text-base-content/60'>Share whether the work is remote-friendly or tied to a specific place.</p>
                        </div>

                        <div className='grid gap-4 md:grid-cols-3'>
                                {JOB_LOCATION_TYPES.map(option => {
                                        const active = locationType === option.value
                                        return (
                                                <label
                                                        key={option.value}
                                                        className={`cursor-pointer rounded-2xl border p-4 transition ${
                                                                active
                                                                        ? 'border-primary bg-primary/10 text-primary'
                                                                        : 'border-base-200 hover:border-primary/40'
                                                        }`}
                                                >
                                                        <input
                                                                type='radio'
                                                                className='hidden'
                                                                value={option.value}
                                                                {...register('locationType')}
                                                        />
                                                        <div className='flex items-center gap-2 text-sm font-semibold'>
                                                                {option.value === 'REMOTE' ? <Globe2 className='size-4' /> : <MapPin className='size-4' />}
                                                                {option.label}
                                                        </div>
                                                        <p className='mt-2 text-xs text-base-content/70'>{option.description}</p>
                                                </label>
                                        )
                                })}
                        </div>

                        <div className='mt-6 rounded-2xl border border-dashed border-base-300 p-4'>
                                <div className='mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-base-content/70'>
                                        <div>
                                                <div className='font-semibold text-base-content'>Preferred locations</div>
                                                <p className='text-xs text-base-content/60'>Limit proposals to specific countries, cities, or time zones.</p>
                                        </div>
                                        <span className='text-xs font-medium uppercase tracking-wide'>{summary}</span>
                                </div>
                                <div className='grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]'>
                                        <CountrySelect
                                                value={country}
                                                onChange={setCountry}
                                                placeholder='Select country'
                                                className='w-full'
                                        />
                                        <input
                                                value={regionNote}
                                                onChange={event => setRegionNote(event.target.value)}
                                                placeholder='City, timezone, or onsite requirement'
                                                className='input input-bordered'
                                        />
                                        <button type='button' className='btn btn-primary' onClick={addLocation}>
                                                Add
                                        </button>
                                </div>
                                <div className='mt-4 flex flex-wrap gap-2'>
                                        {fields.map((field, index) => (
                                                <span
                                                        key={field.id}
                                                        className='badge badge-outline gap-2 rounded-full px-3 py-3 text-xs font-medium'
                                                >
                                                        {field.label}
                                                        <button
                                                                type='button'
                                                                className='rounded-full bg-error/10 p-[2px] text-error'
                                                                onClick={() => remove(index)}
                                                        >
                                                                <Trash2 className='size-3' />
                                                        </button>
                                                </span>
                                        ))}
                                </div>
                                <div className='mt-4 flex flex-wrap items-center gap-3 text-xs text-base-content/60'>
                                        <button type='button' className='btn btn-ghost btn-xs' onClick={resetLocations}>
                                                Clear preferred locations
                                        </button>
                                        <span>Leave empty to receive proposals worldwide.</span>
                                </div>
                        </div>
                </section>
        )
}
