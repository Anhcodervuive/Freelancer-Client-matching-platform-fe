import { useRef } from 'react'
import { Paperclip } from 'lucide-react'

type ChatFileInputProps = {
	multiple?: boolean
	accept?: string
	onFiles: (_files: File[]) => void
}

export default function ChatFileInput({ multiple = false, accept = '*/*', onFiles }: ChatFileInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const files = Array.from(e.target.files)
			onFiles(files)
			e.target.value = '' // cho phép chọn lại cùng file
		}
	}

	return (
		<>
			<button type='button' className='btn btn-ghost btn-circle' onClick={() => inputRef.current?.click()}>
				<Paperclip className='w-5 h-5' />
			</button>

			<input ref={inputRef} type='file' hidden multiple={multiple} accept={accept} onChange={handleChange} />
		</>
	)
}
