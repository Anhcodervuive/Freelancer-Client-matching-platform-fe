import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Upload, Link, FileText, Camera, File } from 'lucide-react'
import { toast } from 'react-toastify'

import { MediationEvidenceSourceType } from '~/types/mediation-evidence'
import type { 
	CreateMediationEvidenceSubmissionInput,
	MediationEvidenceItemInput 
} from '~/types/mediation-evidence'

const MediationEvidenceItemSchema = z.object({
	label: z.string().min(1, 'Vui lòng nhập label cho bằng chứng').max(255, 'Label không được quá 255 ký tự'),
	description: z.string().max(2000, 'Mô tả không được quá 2000 ký tự').optional(),
	sourceType: z.nativeEnum(MediationEvidenceSourceType),
	sourceId: z.string().optional(),
	assetId: z.string().optional(),
	url: z.string().optional(),
	fileName: z.string().max(500).optional(),
	fileSize: z.number().int().min(0).optional(),
	mimeType: z.string().max(100).optional(),
	displayOrder: z.number().int().min(0).optional().default(0)
}).superRefine((data, ctx) => {
	// For external URL, require URL and validate format
	if (data.sourceType === MediationEvidenceSourceType.EXTERNAL_URL) {
		if (!data.url) {
			ctx.addIssue({
				code: 'custom',
				message: 'Vui lòng nhập URL cho bằng chứng',
				path: ['url']
			})
		} else {
			// Validate URL format
			try {
				new URL(data.url)
			} catch {
				ctx.addIssue({
					code: 'custom',
					message: 'URL không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://',
					path: ['url']
				})
			}
		}
	}
	// For file uploads, require fileName (assetId is optional for mock)
	else if (data.sourceType === MediationEvidenceSourceType.DOCUMENT_UPLOAD || 
			 data.sourceType === MediationEvidenceSourceType.SCREENSHOT) {
		if (!data.fileName) {
			ctx.addIssue({
				code: 'custom',
				message: 'Vui lòng upload file cho bằng chứng',
				path: ['fileName']
			})
		}
	}
	// For attachments, require sourceId
	else if (data.sourceType === MediationEvidenceSourceType.MILESTONE_ATTACHMENT ||
			 data.sourceType === MediationEvidenceSourceType.CHAT_ATTACHMENT) {
		if (!data.sourceId) {
			ctx.addIssue({
				code: 'custom',
				message: 'Vui lòng nhập Source ID cho bằng chứng',
				path: ['sourceId']
			})
		}
	}
})

const MediationEvidenceFormSchema = z.object({
	title: z.string().min(1, 'Vui lòng nhập tiêu đề bằng chứng').max(500, 'Tiêu đề không được quá 500 ký tự'),
	description: z.string().max(5000, 'Mô tả không được quá 5000 ký tự').optional(),
	items: z.array(MediationEvidenceItemSchema).min(1, 'Cần ít nhất một item bằng chứng').max(50, 'Không được quá 50 items')
})

type FormData = z.infer<typeof MediationEvidenceFormSchema>

interface MediationEvidenceFormProps {
	disputeId: string
	onSubmit: (data: CreateMediationEvidenceSubmissionInput) => Promise<void>
	onCancel: () => void
	isLoading?: boolean
	isModal?: boolean
}

const sourceTypeOptions = [
	{ value: MediationEvidenceSourceType.DOCUMENT_UPLOAD, label: 'Upload Document', icon: FileText },
	{ value: MediationEvidenceSourceType.SCREENSHOT, label: 'Screenshot', icon: Camera },
	{ value: MediationEvidenceSourceType.EXTERNAL_URL, label: 'External Link', icon: Link },
	{ value: MediationEvidenceSourceType.MILESTONE_ATTACHMENT, label: 'Milestone Attachment', icon: File },
	{ value: MediationEvidenceSourceType.CHAT_ATTACHMENT, label: 'Chat Attachment', icon: File },
	{ value: MediationEvidenceSourceType.CONTRACT_DOCUMENT, label: 'Contract Document', icon: FileText }
]

export default function MediationEvidenceForm({
	disputeId, // eslint-disable-line @typescript-eslint/no-unused-vars
	onSubmit,
	onCancel,
	isLoading = false,
	isModal = false
}: MediationEvidenceFormProps) {
	const [uploadingFiles, setUploadingFiles] = useState<Set<number>>(new Set())

	const {
		register,
		control,
		handleSubmit,
		watch,
		setValue,
		trigger,
		formState: { errors, isValid }
	} = useForm<FormData>({
		resolver: zodResolver(MediationEvidenceFormSchema),
		defaultValues: {
			title: '',
			description: '',
			items: [{
				label: '',
				description: '',
				sourceType: MediationEvidenceSourceType.EXTERNAL_URL,
				displayOrder: 0
			}]
		}
	})

	const { fields, append, remove } = useFieldArray({
		control,
		name: 'items'
	})

	const handleFileUpload = useCallback(async (file: File, itemIndex: number) => {
		setUploadingFiles(prev => new Set(prev).add(itemIndex))
		
		try {
			// TODO: Implement file upload to your storage service
			// const uploadedAsset = await uploadFile(file)
			
			// For now, simulate upload with shorter delay
			await new Promise(resolve => setTimeout(resolve, 500))
			
			// Set the uploaded file info (no assetId for mock upload)
			setValue(`items.${itemIndex}.fileName`, file.name)
			setValue(`items.${itemIndex}.fileSize`, file.size)
			setValue(`items.${itemIndex}.mimeType`, file.type)
			if (!watch(`items.${itemIndex}.label`)) {
				setValue(`items.${itemIndex}.label`, file.name)
			}
			
			// For mock upload, we don't set assetId since it doesn't exist in database
			// In real implementation, you would upload to storage service and get real assetId
			
			// Trigger validation after setting values
			await trigger(`items.${itemIndex}`)
			await trigger() // Trigger full form validation
			
			toast.success('File uploaded successfully')
		} catch (error) {
			toast.error('Failed to upload file')
			console.error('Upload error:', error)
		} finally {
			setUploadingFiles(prev => {
				const newSet = new Set(prev)
				newSet.delete(itemIndex)
				return newSet
			})
		}
	}, [setValue, watch])

	const addEvidenceItem = () => {
		append({
			label: '',
			description: '',
			sourceType: MediationEvidenceSourceType.EXTERNAL_URL,
			displayOrder: fields.length
		})
	}

	const removeEvidenceItem = (index: number) => {
		if (fields.length > 1) {
			remove(index)
		}
	}

	const onFormSubmit = async (data: any) => {
		try {
			// Clean up data - remove empty/unnecessary fields
			const cleanedData = {
				...data,
				items: data.items.map((item: any) => {
					const cleanedItem = { ...item }
					
					// Remove empty URL for non-external-url types
					if (item.sourceType !== MediationEvidenceSourceType.EXTERNAL_URL) {
						delete cleanedItem.url
					}
					
					// Remove empty sourceId for non-attachment types
					if (item.sourceType !== MediationEvidenceSourceType.MILESTONE_ATTACHMENT && 
						item.sourceType !== MediationEvidenceSourceType.CHAT_ATTACHMENT) {
						delete cleanedItem.sourceId
					}
					
					// Remove mock assetId (starts with 'mock-') or empty assetId
					if (!cleanedItem.assetId || cleanedItem.assetId.startsWith('mock-')) {
						delete cleanedItem.assetId
					}
					
					return cleanedItem
				})
			}
			
			console.log('Form submit data (cleaned):', cleanedData)
			await onSubmit(cleanedData)
		} catch (error) {
			console.error('Submit error:', error)
		}
	}

	// Debug form state
	const formValues = watch()
	console.log('Form values:', formValues)
	console.log('Form errors:', errors)
	console.log('Form isValid:', isValid)

	return (
		<div className={isModal ? "" : "max-w-4xl mx-auto p-6"}>
			<div className={isModal ? "" : "bg-white rounded-lg shadow-sm border border-gray-200"}>
				{!isModal && (
					<div className="px-6 py-4 border-b border-gray-200">
						<h2 className="text-xl font-semibold text-gray-900">Submit Evidence for Mediation</h2>
						<p className="text-sm text-gray-600 mt-1">
							Provide evidence to support your case in the mediation process
						</p>
					</div>
				)}

				<form onSubmit={handleSubmit(onFormSubmit)} className={isModal ? "p-6 space-y-6" : "p-6 space-y-6"}>
					{/* Title */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Evidence Title *
						</label>
						<input
							{...register('title')}
							type="text"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Brief title describing your evidence"
						/>
						{errors.title && (
							<p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
						)}
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Description
						</label>
						<textarea
							{...register('description')}
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Provide context and explanation for your evidence"
						/>
						{errors.description && (
							<p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
						)}
					</div>

					{/* Evidence Items */}
					<div>
						<div className="flex items-center justify-between mb-4">
							<label className="block text-sm font-medium text-gray-700">
								Evidence Items *
							</label>
							<button
								type="button"
								onClick={addEvidenceItem}
								className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
							>
								<Plus className="w-4 h-4" />
								Add Item
							</button>
						</div>

						<div className="space-y-4">
							{fields.map((field, index) => (
								<EvidenceItemForm
									key={field.id}
									index={index}
									register={register}
									watch={watch}
									setValue={setValue}
									errors={errors}
									onFileUpload={handleFileUpload}
									onRemove={() => removeEvidenceItem(index)}
									canRemove={fields.length > 1}
									isUploading={uploadingFiles.has(index)}
								/>
							))}
						</div>

						{errors.items && (
							<p className="text-red-500 text-sm mt-2">{errors.items.message}</p>
						)}
					</div>

					{/* Form-level errors */}
					{!isValid && Object.keys(errors).length > 0 && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4">
							<h4 className="text-sm font-medium text-red-800 mb-2">Vui lòng sửa các lỗi sau:</h4>
							<ul className="text-sm text-red-700 space-y-1">
								{errors.title && <li>• {errors.title.message}</li>}
								{errors.description && <li>• {errors.description.message}</li>}
								{errors.items && <li>• {errors.items.message}</li>}
								{errors.items && Array.isArray(errors.items) && errors.items.map((itemError, index) => (
									itemError && (
										<li key={index}>
											• Item {index + 1}: {
												itemError.label?.message || 
												itemError.url?.message || 
												itemError.sourceId?.message ||
												itemError.assetId?.message ||
												'Có lỗi trong item này'
											}
										</li>
									)
								))}
							</ul>
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
						<button
							type="button"
							onClick={onCancel}
							className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
							disabled={isLoading}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!isValid || isLoading || uploadingFiles.size > 0}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
							title={!isValid ? 'Vui lòng sửa các lỗi trong form' : ''}
						>
							{isLoading ? 'Submitting...' : 'Submit Evidence'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
interface EvidenceItemFormProps {
	index: number
	register: any
	watch: any
	setValue: any
	errors: any
	onFileUpload: (file: File, index: number) => Promise<void>
	onRemove: () => void
	canRemove: boolean
	isUploading: boolean
}

function EvidenceItemForm({
	index,
	register,
	watch,
	setValue,
	errors,
	onFileUpload,
	onRemove,
	canRemove,
	isUploading
}: EvidenceItemFormProps) {
	const sourceType = watch(`items.${index}.sourceType`)
	const selectedOption = sourceTypeOptions.find(opt => opt.value === sourceType)
	const IconComponent = selectedOption?.icon || FileText

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (file) {
			onFileUpload(file, index)
		}
	}

	return (
		<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-2">
					<IconComponent className="w-5 h-5 text-gray-600" />
					<h4 className="font-medium text-gray-900">Evidence Item {index + 1}</h4>
				</div>
				{canRemove && (
					<button
						type="button"
						onClick={onRemove}
						className="text-red-600 hover:text-red-800"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Source Type */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Evidence Type *
					</label>
					<select
						{...register(`items.${index}.sourceType`)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{sourceTypeOptions.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				{/* Label */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Label *
					</label>
					<input
						{...register(`items.${index}.label`)}
						type="text"
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Brief description of this evidence"
					/>
					{errors.items?.[index]?.label && (
						<p className="text-red-500 text-xs mt-1">{errors.items[index].label.message}</p>
					)}
				</div>
			</div>

			{/* Description */}
			<div className="mt-4">
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					{...register(`items.${index}.description`)}
					rows={2}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Additional details about this evidence"
				/>
			</div>

			{/* Source-specific inputs */}
			<div className="mt-4">
				{sourceType === MediationEvidenceSourceType.EXTERNAL_URL && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							URL *
						</label>
						<input
							{...register(`items.${index}.url`)}
							type="url"
							className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
								errors.items?.[index]?.url ? 'border-red-500' : 'border-gray-300'
							}`}
							placeholder="https://example.com/evidence"
						/>
						{errors.items?.[index]?.url && (
							<p className="text-red-500 text-xs mt-1">{errors.items[index].url.message}</p>
						)}
						<p className="text-xs text-gray-500 mt-1">
							Nhập URL hợp lệ bắt đầu bằng http:// hoặc https://
						</p>
					</div>
				)}

				{(sourceType === MediationEvidenceSourceType.DOCUMENT_UPLOAD ||
				  sourceType === MediationEvidenceSourceType.SCREENSHOT) && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Upload File *
						</label>
						<div className="flex items-center gap-3">
							<input
								type="file"
								onChange={handleFileChange}
								className="hidden"
								id={`file-upload-${index}`}
								accept={sourceType === MediationEvidenceSourceType.SCREENSHOT ? 'image/*' : '*'}
								disabled={isUploading}
							/>
							<label
								htmlFor={`file-upload-${index}`}
								className={`flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 ${
									isUploading ? 'opacity-50 cursor-not-allowed' : ''
								}`}
							>
								<Upload className="w-4 h-4" />
								{isUploading ? 'Uploading...' : 'Choose File'}
							</label>
							{watch(`items.${index}.fileName`) && (
								<span className="text-sm text-gray-600">
									{watch(`items.${index}.fileName`)}
								</span>
							)}
						</div>
						{errors.items?.[index]?.assetId && (
							<p className="text-red-500 text-xs mt-1">{errors.items[index].assetId.message}</p>
						)}
					</div>
				)}

				{(sourceType === MediationEvidenceSourceType.MILESTONE_ATTACHMENT ||
				  sourceType === MediationEvidenceSourceType.CHAT_ATTACHMENT) && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Source ID
						</label>
						<input
							{...register(`items.${index}.sourceId`)}
							type="text"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="ID of the milestone or chat message"
						/>
						<p className="text-xs text-gray-500 mt-1">
							Reference to existing {sourceType === MediationEvidenceSourceType.MILESTONE_ATTACHMENT ? 'milestone' : 'chat message'}
						</p>
						{errors.items?.[index]?.sourceId && (
							<p className="text-red-500 text-xs mt-1">{errors.items[index].sourceId.message}</p>
						)}
					</div>
				)}
			</div>
		</div>
	)
}