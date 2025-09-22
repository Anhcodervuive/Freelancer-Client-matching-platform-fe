// components/freelancer/EducationModal.tsx
import { useEffect, useMemo, useState } from 'react'
import { useFreelancerEducation } from '~/hooks/api/useFreelancerEducation'
import type { FreelancerEducation } from '~/types/profile'

type Props = {
	initial?: FreelancerEducation | null
	onClose: () => void
	userId?: string
}

export default function EducationManagerModal({ initial, onClose, userId }: Props) {
	const { createMutation, updateMutation } = useFreelancerEducation(userId)
	const editing = Boolean(initial)

	const [schoolName, setSchoolName] = useState(initial?.schoolName ?? '')
	const [startYear, setStartYear] = useState<number | ''>(initial?.startYear ?? '')
	const [endYear, setEndYear] = useState<number | ''>(initial?.endYear ?? '')
	const [degreeTitle, setDegreeTitle] = useState(initial?.degreeTitle ?? '')
	const [fieldOfStudy, setFieldOfStudy] = useState(initial?.fieldOfStudy ?? '')

	const years = useMemo(() => {
		const now = new Date().getFullYear()
		const arr = []
		for (let y = now + 6; y >= 1950; y--) arr.push(y)
		return arr
	}, [])

	const canSave = schoolName.trim().length > 0

	const onSave = () => {
		const payload = {
			schoolName: schoolName.trim(),
			startYear: startYear === '' ? null : Number(startYear),
			endYear: endYear === '' ? null : Number(endYear),
			degreeTitle: degreeTitle?.trim() || null,
			fieldOfStudy: fieldOfStudy?.trim() || null
		}

		if (editing && initial?.id) {
			updateMutation.mutate({ edutionId: initial?.id, payload }, { onSuccess: onClose })
		} else {
			createMutation.mutate(payload, { onSuccess: onClose })
		}
	}

	// Close on ESC
	useEffect(() => {
		const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
		window.addEventListener('keydown', fn)
		return () => window.removeEventListener('keydown', fn)
	}, [onClose])

        return (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
                        <div className='bg-base-100 w-full max-w-xl rounded-2xl p-6'>
                                <div className='text-xl font-bold mb-4'>{editing ? 'Edit education' : 'Add education'}</div>

                                <div className='space-y-4'>
                                        <div>
                                                <label className='label'>
                                                        <span className='label-text'>School</span>
                                                </label>
                                                <input
                                                        className='input input-bordered input-sm md:input-md w-full'
                                                        placeholder='Ex: Northwestern University'
                                                        value={schoolName}
                                                        onChange={e => setSchoolName(e.target.value)}
                                                />
                                        </div>

                                        <div>
                                                <label className='label'>
                                                        <span className='label-text'>Dates attended (optional)</span>
                                                </label>
                                                <div className='grid grid-cols-2 gap-3'>
                                                        <select
                                                                className='select select-bordered select-sm md:select-md'
                                                                value={startYear === '' ? '' : String(startYear)}
                                                                onChange={e => setStartYear(e.target.value ? Number(e.target.value) : '')}>
                                                                <option value=''>From</option>
                                                                {years.map(y => (
                                                                        <option key={y} value={y}>
                                                                                {y}
                                                                        </option>
                                                                ))}
                                                        </select>

                                                        <select
                                                                className='select select-bordered select-sm md:select-md'
                                                                value={endYear === '' ? '' : String(endYear)}
                                                                onChange={e => setEndYear(e.target.value ? Number(e.target.value) : '')}>
                                                                <option value=''>To (or expected)</option>
                                                                {years.map(y => (
                                                                        <option key={y} value={y}>
                                                                                {y}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>
                                        </div>

                                        <div className='grid grid-cols-2 gap-3'>
                                                <div>
                                                        <label className='label'>
                                                                <span className='label-text'>Degree (optional)</span>
                                                        </label>
                                                        <input
                                                                className='input input-bordered input-sm md:input-md w-full'
                                                                placeholder="Ex: Bachelor's degree"
                                                                value={degreeTitle ?? ''}
                                                                onChange={e => setDegreeTitle(e.target.value)}
                                                        />
                                                </div>
                                                <div>
                                                        <label className='label'>
                                                                <span className='label-text'>Area of study (optional)</span>
                                                        </label>
                                                        <input
                                                                className='input input-bordered input-sm md:input-md w-full'
                                                                placeholder='Ex: Computer Science'
                                                                value={fieldOfStudy ?? ''}
                                                                onChange={e => setFieldOfStudy(e.target.value)}
                                                        />
                                                </div>
                                        </div>
                                </div>

                                <div className='mt-6 flex justify-end gap-2'>
                                        <button className='btn btn-ghost btn-sm md:btn-md' onClick={onClose}>
                                                Cancel
                                        </button>
                                        <button className='btn btn-primary btn-sm md:btn-md' onClick={onSave} disabled={!canSave}>
                                                Save
                                        </button>
                                </div>
                        </div>
                </div>
        )
}
