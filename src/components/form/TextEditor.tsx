// components/BioEditor.tsx
import React from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import {
	Bold,
	Italic,
	Underline as UIcon,
	Link2,
	Link2Off,
	Undo2,
	Redo2,
	Ellipsis,
	Type,
	List,
	AlignLeft,
	AlignCenter,
	AlignRight,
	AlignJustify
} from 'lucide-react'

type Props = {
	value?: string
	onChange: (_html: string) => void
	maxChars?: number
	className?: string // cho phép custom thêm
}

const btn = (active?: boolean) => `btn btn-sm btn-ghost ${active ? 'btn-active btn-primary' : ''}`

export default function TextEditor({ value = '<p></p>', onChange, maxChars = 5000, className = '' }: Props) {
	const [, force] = React.useReducer(x => x + 1, 0)

	const editor = useEditor({
		content: value,
		extensions: [
			StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
			Underline,
			Link.configure({ openOnClick: false, autolink: true }),
			Highlight,
			TextStyle,
			Color,
			TextAlign.configure({ types: ['heading', 'paragraph'] }),
			TaskList,
			TaskItem.configure({ nested: true }),
			Placeholder.configure({
				placeholder: 'Write an engaging overview. Use bullets for highlights…'
			})
		],
		editorProps: {
			attributes: {
				// Gắn class trực tiếp lên .ProseMirror (editable area)
				class: [
					'prose prose-sm max-w-none focus:outline-none',
					// ↓ giảm khoảng cách & line-height
					'leading-6', // line-height ~1.5
					'prose-p:my-1', // p: 0.25rem trên/dưới
					'prose-li:my-0.5', // li: 0.125rem
					'prose-ul:my-1 prose-ol:my-1', // ul/ol margin nhỏ
					'prose-hr:my-2'
				].join(' '),
				style: 'min-height: 18rem; max-height: 36vh' // 👈 CHÌA KHOÁ: tăng chiều cao thực sự
			}
		},
		onUpdate: ({ editor }) => onChange(editor.getHTML())
	})

	// Buộc toolbar re-render theo selection/marks
	React.useEffect(() => {
		if (!editor) return
		const rerender = () => force()
		editor.on('selectionUpdate', rerender)
		editor.on('transaction', rerender)
		return () => {
			editor.off('selectionUpdate', rerender)
			editor.off('transaction', rerender)
		}
	}, [editor])

	if (!editor) return null

	const textLen = editor.getText().length

	const setLink = () => {
		const prev = editor.getAttributes('link').href as string | undefined
		const url = window.prompt('Enter URL', prev || 'https://')
		if (url === null) return
		if (!url) return editor.chain().focus().unsetLink().run()
		editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noreferrer' }).run()
	}

	return (
		<div className={`space-y-2 ${className}`}>
			{/* Toolbar compact */}
			<div className='flex items-center flex-wrap gap-1'>
				{/* Core */}
				<div className='join'>
					<button className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>
						<Bold size={16} />
					</button>
					<button
						className={btn(editor.isActive('italic'))}
						onClick={() => editor.chain().focus().toggleItalic().run()}>
						<Italic size={16} />
					</button>
					<button
						className={btn(editor.isActive('underline'))}
						onClick={() => editor.chain().focus().toggleUnderline().run()}>
						<UIcon size={16} />
					</button>
				</div>

				{/* Link */}
				<div className='join'>
					<button className={btn(editor.isActive('link'))} onClick={setLink}>
						<Link2 size={16} />
					</button>
					<button className='btn btn-sm btn-ghost' onClick={() => editor.chain().focus().unsetLink().run()}>
						<Link2Off size={16} />
					</button>
				</div>

				{/* Headings dropdown */}
				<div className='dropdown'>
					<button tabIndex={0} className='btn btn-sm btn-ghost'>
						<Type size={16} />
						<span className='ml-1 hidden sm:inline'>Headings</span>
					</button>
					<ul tabIndex={0} className='dropdown-content menu p-2 shadow bg-base-100 rounded-box w-36 z-50'>
						<li>
							<button
								className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
								onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
								H2
							</button>
						</li>
						<li>
							<button
								className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
								onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
								H3
							</button>
						</li>
						<li>
							<button
								className={editor.isActive('heading', { level: 4 }) ? 'active' : ''}
								onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
								H4
							</button>
						</li>
					</ul>
				</div>

				{/* Lists dropdown */}
				<div className='dropdown'>
					<button tabIndex={0} className='btn btn-sm btn-ghost'>
						<List size={16} />
						<span className='ml-1 hidden sm:inline'>Lists</span>
					</button>
					<ul tabIndex={0} className='dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40 z-50'>
						<li>
							<button
								className={editor.isActive('bulletList') ? 'active' : ''}
								onClick={() => editor.chain().focus().toggleBulletList().run()}>
								Bullet
							</button>
						</li>
						<li>
							<button
								className={editor.isActive('orderedList') ? 'active' : ''}
								onClick={() => editor.chain().focus().toggleOrderedList().run()}>
								Numbered
							</button>
						</li>
						<li>
							<button
								className={editor.isActive('taskList') ? 'active' : ''}
								onClick={() => editor.chain().focus().toggleTaskList().run()}>
								Task
							</button>
						</li>
					</ul>
				</div>

				{/* Align dropdown */}
				<div className='dropdown'>
					<button tabIndex={0} className='btn btn-sm btn-ghost'>
						<AlignLeft size={16} />
						<span className='ml-1 hidden sm:inline'>Align</span>
					</button>
					<ul tabIndex={0} className='dropdown-content menu p-2 shadow bg-base-100 rounded-box w-44 z-50'>
						<li>
							<button
								className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''}
								onClick={() => editor.chain().focus().setTextAlign('left').run()}>
								<AlignLeft size={14} /> Left
							</button>
						</li>
						<li>
							<button
								className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''}
								onClick={() => editor.chain().focus().setTextAlign('center').run()}>
								<AlignCenter size={14} /> Center
							</button>
						</li>
						<li>
							<button
								className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''}
								onClick={() => editor.chain().focus().setTextAlign('right').run()}>
								<AlignRight size={14} /> Right
							</button>
						</li>
						<li>
							<button
								className={editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}
								onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
								<AlignJustify size={14} /> Justify
							</button>
						</li>
					</ul>
				</div>

				{/* More dropdown */}
				<div className='dropdown'>
					<button tabIndex={0} className='btn btn-sm btn-ghost'>
						<Ellipsis size={16} />
					</button>
					<ul tabIndex={0} className='dropdown-content menu p-2 shadow bg-base-100 rounded-box w-56 z-50'>
						<li>
							<button onClick={() => editor.chain().focus().toggleStrike().run()}>Strikethrough</button>
						</li>
						<li>
							<button onClick={() => editor.chain().focus().toggleCode().run()}>Inline code</button>
						</li>
						<li>
							<button onClick={() => editor.chain().focus().toggleHighlight().run()}>Highlight</button>
						</li>
						<li className='menu-title'>Color</li>
						<li>
							<input
								type='color'
								className='w-full h-8'
								onChange={e => editor.chain().focus().setColor(e.target.value).run()}
							/>
						</li>
						<li className='menu-title'>Background</li>
						<li>
							<input
								type='color'
								className='w-full h-8'
								onChange={e => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
							/>
						</li>
						<li className='menu-title'>Other</li>
						<li>
							<button onClick={() => editor.chain().focus().setHorizontalRule().run()}>Horizontal rule</button>
						</li>
						<li>
							<button onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
								Clear formatting
							</button>
						</li>
					</ul>
				</div>

				{/* Undo / Redo */}
				<div className='join ml-auto'>
					<button className='btn btn-sm btn-ghost' onClick={() => editor.chain().focus().undo().run()}>
						<Undo2 size={16} />
					</button>
					<button className='btn btn-sm btn-ghost' onClick={() => editor.chain().focus().redo().run()}>
						<Redo2 size={16} />
					</button>
				</div>
			</div>

			{/* Editor box – cao + scroll, border đẹp */}
			<div className='rounded-2xl border border-warning p-3'>
				<div className='max-h-[36rem] overflow-y-auto'>
					<EditorContent editor={editor} />
				</div>
			</div>

			<div className={`text-xs ${textLen > maxChars ? 'text-error' : 'text-base-content/60'}`}>
				{textLen}/{maxChars}
			</div>
		</div>
	)
}
