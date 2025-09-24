import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import type { JobPostFormValues } from '../schema'

type ScreeningQuestionsProps = { hidden?: boolean }

export function ScreeningQuestions({ hidden }: ScreeningQuestionsProps) {
        const {
                control,
                formState: { errors }
        } = useFormContext<JobPostFormValues>()
        const { fields, append, remove } = useFieldArray({ name: 'screeningQuestions', control })

        const addQuestion = () => {
                append({ question: '', isRequired: true })
        }

        return (
                <section className={`rounded-2xl border border-base-200 p-5 ${hidden ? 'hidden' : ''}`}>
                        <div className='mb-4 flex flex-col gap-1'>
                                <h3 className='text-base font-semibold text-base-content'>Screening questions</h3>
                                <p className='text-xs text-base-content/60'>Vet applicants faster with custom questions or scenarios.</p>
                        </div>

                        <div className='space-y-4'>
                                {fields.map((field, index) => (
                                        <div key={field.id} className='rounded-2xl border border-base-200 bg-base-100/60 p-4'>
                                                <div className='flex items-center justify-between gap-3'>
                                                        <span className='text-sm font-medium text-base-content'>Question {index + 1}</span>
                                                        <button
                                                                type='button'
                                                                className='btn btn-ghost btn-xs text-error'
                                                                onClick={() => remove(index)}
                                                        >
                                                                <Trash2 className='size-4' />
                                                        </button>
                                                </div>
                                                <Controller
                                                        control={control}
                                                        name={`screeningQuestions.${index}.question` as const}
                                                        render={({ field: ctrlField }) => (
                                                                <textarea
                                                                        {...ctrlField}
                                                                        rows={3}
                                                                        placeholder='Describe a real challenge or ask for an example of relevant work.'
                                                                        className='textarea textarea-bordered mt-3 w-full'
                                                                />
                                                        )}
                                                />
                                                {errors.screeningQuestions?.[index]?.question ? (
                                                        <p className='mt-1 text-xs text-error'>
                                                                {errors.screeningQuestions?.[index]?.question?.message as string}
                                                        </p>
                                                ) : null}
                                                <div className='mt-3 flex items-center gap-2 text-xs text-base-content/70'>
                                                        <Controller
                                                                control={control}
                                                                name={`screeningQuestions.${index}.isRequired` as const}
                                                                render={({ field: ctrlField }) => (
                                                                        <input
                                                                                type='checkbox'
                                                                                className='toggle toggle-primary toggle-xs'
                                                                                checked={ctrlField.value}
                                                                                onChange={event => ctrlField.onChange(event.target.checked)}
                                                                        />
                                                                )}
                                                        />
                                                        <span>Applicants must answer this question</span>
                                                </div>
                                        </div>
                                ))}
                        </div>

                        <button type='button' className='btn btn-outline btn-sm mt-4 gap-2' onClick={addQuestion}>
                                <Plus className='size-4' /> Add screening question
                        </button>
                </section>
        )
}
