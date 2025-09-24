import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { LANGUAGE_OPTIONS, PROFICIENCY_OPTIONS } from '~/constants/language'
import type { JobPostFormValues } from '../schema'

type LanguageRequirementsProps = { hidden?: boolean }

export function LanguageRequirements({ hidden }: LanguageRequirementsProps) {
        const { control, watch, setValue } = useFormContext<JobPostFormValues>()
        const { fields, append, remove } = useFieldArray({ name: 'languages', control })
        const languages = watch('languages') ?? []
        const englishIndex = languages.findIndex(item => item.languageCode?.toLowerCase() === 'en')
        const english = englishIndex >= 0 ? languages[englishIndex] : undefined

        const addEnglishRequirement = () => {
                append({ languageCode: 'en', proficiency: 'CONVERSATIONAL' })
        }

        const removeEnglish = () => {
                if (englishIndex >= 0) {
                        remove(englishIndex)
                }
        }

        const otherLanguages = fields
                .map((field, index) => ({ field, index }))
                .filter(({ index }) => languages[index]?.languageCode?.toLowerCase() !== 'en')

        return (
                <section className={`rounded-2xl border border-base-200 p-5 ${hidden ? 'hidden' : ''}`}>
                        <div className='mb-4 flex flex-col gap-1'>
                                <h3 className='text-base font-semibold text-base-content'>Language preferences</h3>
                                <p className='text-xs text-base-content/60'>Ensure freelancers can communicate effectively with your team.</p>
                        </div>

                        <div className='grid gap-4 md:grid-cols-2'>
                                <div className='rounded-xl border border-primary/30 bg-primary/5 p-4'>
                                        <div className='mb-3 flex items-center justify-between text-sm font-medium text-primary'>
                                                <span>English level</span>
                                                {english ? (
                                                        <button type='button' className='btn btn-ghost btn-xs text-error' onClick={removeEnglish}>
                                                                Remove
                                                        </button>
                                                ) : null}
                                        </div>
                                        {english ? (
                                                <div className='flex items-center gap-3'>
                                                        <span className='text-sm font-semibold text-primary'>English</span>
                                                        <select
                                                                className='select select-bordered select-sm flex-1'
                                                                value={english.proficiency}
                                                                onChange={event =>
                                                                        setValue(
                                                                                `languages.${englishIndex}.proficiency`,
                                                                                event.target.value,
                                                                                { shouldDirty: true }
                                                                        )
                                                                }
                                                        >
                                                                {PROFICIENCY_OPTIONS.map(option => (
                                                                        <option key={option.value} value={option.value}>
                                                                                {option.name}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>
                                        ) : (
                                                <button type='button' className='btn btn-outline btn-sm gap-2' onClick={addEnglishRequirement}>
                                                        <Plus className='size-4' /> Add English requirement
                                                </button>
                                        )}
                                        <p className='mt-3 text-xs text-primary/70'>Freelancers must meet this minimum to apply.</p>
                                </div>

                                <div className='rounded-xl border border-base-200 p-4'>
                                        <div className='mb-3 text-sm font-medium text-base-content'>Additional languages</div>
                                        {otherLanguages.length === 0 ? (
                                                <p className='rounded-lg border border-dashed border-base-300 p-3 text-xs text-base-content/60'>
                                                        Optional. Add languages if your project requires specific regional skills.
                                                </p>
                                        ) : (
                                                <div className='space-y-3'>
                                                        {otherLanguages.map(({ field, index }) => (
                                                                <div key={field.id} className='flex items-center gap-3'>
                                                                        <Controller
                                                                                control={control}
                                                                                name={`languages.${index}.languageCode` as const}
                                                                                render={({ field: ctrlField }) => (
                                                                                        <select className='select select-bordered select-sm flex-1' {...ctrlField}>
                                                                                                {LANGUAGE_OPTIONS.map(language => (
                                                                                                        <option key={language.value} value={language.value}>
                                                                                                                {language.name}
                                                                                                        </option>
                                                                                                ))}
                                                                                        </select>
                                                                                )}
                                                                        />
                                                                        <Controller
                                                                                control={control}
                                                                                name={`languages.${index}.proficiency` as const}
                                                                                render={({ field: ctrlField }) => (
                                                                                        <select className='select select-bordered select-sm flex-1' {...ctrlField}>
                                                                                                {PROFICIENCY_OPTIONS.map(option => (
                                                                                                        <option key={option.value} value={option.value}>
                                                                                                                {option.name}
                                                                                                        </option>
                                                                                                ))}
                                                                                        </select>
                                                                                )}
                                                                        />
                                                                        <button
                                                                                type='button'
                                                                                className='btn btn-ghost btn-xs text-error'
                                                                                onClick={() => remove(index)}
                                                                        >
                                                                                <Trash2 className='size-4' />
                                                                        </button>
                                                                </div>
                                                        ))}
                                                </div>
                                        )}
                                        <button
                                                type='button'
                                                className='btn btn-outline btn-sm mt-3 gap-2'
                                                onClick={() =>
                                                        append({
                                                                languageCode: 'vi',
                                                                proficiency: 'CONVERSATIONAL'
                                                        })
                                                }
                                        >
                                                <Plus className='size-4' /> Add language
                                        </button>
                                </div>
                        </div>
                </section>
        )
}
