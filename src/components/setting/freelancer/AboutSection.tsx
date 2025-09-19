// components/FreelancerAboutSection.tsx
import React from 'react'
import DOMPurify from 'dompurify'
import BioEditor from '~/components/form/TextEditor'
import { useFreelancerProfile } from '~/hooks/api/useFreelancerProfile'
import LinkChip from '~/components/LinkChip'
import { Pencil } from 'lucide-react'

type Props = { userId?: string; editable?: boolean }

export default function AboutSection({ userId, editable = true }: Props) {
        const { data, isLoading, save, saving } = useFreelancerProfile(userId)

        const [open, setOpen] = React.useState(false)
	const [title, setTitle] = React.useState('')
	const [bioHtml, setBioHtml] = React.useState('<p></p>')
	const [links, setLinks] = React.useState<string[]>([])
	const [linkInput, setLinkInput] = React.useState('')

        React.useEffect(() => {
                if (isLoading || !data) return
                setTitle(data.title ?? '')
                setBioHtml(typeof data.bio === 'string' ? data.bio : '<p></p>')
                setLinks(Array.isArray(data.links) ? data.links : [])
        }, [isLoading, data])

        React.useEffect(() => {
                if (!editable) {
                        setOpen(false)
                }
        }, [editable])

	const addLink = () => {
		const raw = linkInput.trim()
		if (!raw) return
		try {
			const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`).toString()
			if (!links.includes(u)) setLinks(s => [...s, u])
			setLinkInput('')
		} catch (error) {
			console.log(error)
		}
	}
	const removeLink = (u: string) => setLinks(s => s.filter(x => x !== u))

	const onSubmit = async () => {
		if (title.length > 255) return
		// sanitize trước khi lưu (cũng nên làm lại ở server)
		const cleanBio = DOMPurify.sanitize(bioHtml, {
			ALLOWED_TAGS: [
				'p',
				'br',
				'strong',
				'em',
				'u',
				's',
				'code',
				'pre',
				'ul',
				'ol',
				'li',
				'blockquote',
				'a',
				'h1',
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'hr',
				'mark',
				'span'
			],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		})
		await save({ title, bio: cleanBio, links })
		setOpen(false)
	}

	const safeBio = React.useMemo(
		() =>
			DOMPurify.sanitize(data?.bio || '', {
				ALLOWED_TAGS: [
					'p',
					'br',
					'strong',
					'em',
					'u',
					's',
					'code',
					'pre',
					'ul',
					'ol',
					'li',
					'blockquote',
					'a',
					'h1',
					'h2',
					'h3',
					'h4',
					'h5',
					'h6',
					'hr',
					'mark',
					'span'
				],
				ALLOWED_ATTR: ['href', 'target', 'rel']
			}),
		[data?.bio]
	)

	return (
		<div className='cardborder bg-white/90 rounded-box'>
			<div className='card-body gap-3'>
                                <div className='flex items-center justify-between'>
                                        <h2 className='text-2xl font-bold'>Profile overview</h2>
                                        {editable && (
                                                <button className='btn btn-sm btn-circle btn-ghost text-green-700' onClick={() => setOpen(true)}>
                                                        <Pencil />
                                                </button>
                                        )}
                                </div>

				<p className='font-semibold'>{data?.title || 'Add a short headline about your expertise'}</p>

				<div className='prose dark:prose-invert max-w-none'>
					{safeBio ? (
						<div dangerouslySetInnerHTML={{ __html: safeBio }} />
					) : (
						<p className='text-base-content/60'>Describe your strengths, skills, projects, and what you deliver.</p>
					)}
				</div>

				<div className='mt-2 flex flex-wrap gap-2'>
					{(data?.links ?? []).map((u: string) => (
						<LinkChip key={u} url={u} />
					))}
				</div>
			</div>

			{/* Modal */}
                        {editable && open && (
                                <div className='modal modal-open'>
					<div className='modal-box w-11/12 max-w-3xl'>
						<h3 className='font-bold text-lg'>Edit profile overview</h3>

						<div className='mt-3 form-control flex flex-col'>
							<label className='label'>
								<span className='label-text'>Headline (title)</span>
								<span className='label-text-alt'>{title.length}/255</span>
							</label>
							<input
								className='input input-bordered'
								value={title}
								maxLength={255}
								onChange={e => setTitle(e.target.value)}
								placeholder='Front-end Developer | React, TypeScript'
							/>
						</div>

						<div className='mt-3'>
							<label className='label'>
								<span className='label-text'>Bio / Overview</span>
							</label>
							<BioEditor value={bioHtml} onChange={setBioHtml} />
						</div>

						<div className='mt-3 form-control'>
							<label className='label'>
								<span className='label-text'>Links (GitHub, Portfolio, Blog...)</span>
							</label>
							<div className='join w-full'>
								<input
									className='input input-bordered join-item w-full'
									value={linkInput}
									onChange={e => setLinkInput(e.target.value)}
									placeholder='https://github.com/yourname'
								/>
								<button className='btn join-item' onClick={addLink}>
									Add
								</button>
							</div>
							<div className='mt-2 flex flex-wrap gap-2'>
								{links.map(u => (
									<LinkChip key={u} url={u} onRemove={() => removeLink(u)} />
								))}
							</div>
						</div>

						<div className='modal-action'>
							<button className='btn' onClick={() => setOpen(false)}>
								Cancel
							</button>
							<button className={`btn btn-primary ${saving ? 'btn-disabled' : ''}`} onClick={onSubmit}>
								{saving ? 'Saving...' : 'Save'}
							</button>
						</div>
					</div>
					<div className='modal-backdrop' onClick={() => setOpen(false)} />
				</div>
			)}
		</div>
	)
}
