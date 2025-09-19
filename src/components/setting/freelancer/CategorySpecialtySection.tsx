import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import CategorySpecialtyManagerModal from './CategorySpecialtyManagerModal'
import { useFreelancerCategorySpecialty } from '~/hooks/api/useFreelancerCategorySpecialty'
import { setFreelancerCategoryAndSpecialty } from '~/apis/freelancerProfile.api'

type Props = { userId?: string; editable?: boolean }

type CategoryGroup = {
        category: { id: string; name: string }
        specialties: { id: string; name: string; categoryId: string }[]
}

export default function CategorySpecialtySection({ userId, editable = true }: Props) {
        const [open, setOpen] = useState(false)
        const queryClient = useQueryClient()

        const { categories, specialties, categoriesQuery, specialtiesQuery } = useFreelancerCategorySpecialty(userId)

        const mutation = useMutation({
                mutationFn: (payload: { categoryIds: string[]; specialtyIds: string[] }) =>
                        setFreelancerCategoryAndSpecialty(payload),
                onSuccess: async () => {
                        await Promise.all([
                                queryClient.invalidateQueries({ queryKey: ['freelancerCategories', userId] }),
                                queryClient.invalidateQueries({ queryKey: ['freelancerSpecialties', userId] })
                        ])
                }
        })

        const grouped = useMemo(() => {
                const map = new Map<string, CategoryGroup>()
                for (const category of categories) {
                        map.set(category.id, { category, specialties: [] })
                }
                for (const specialty of specialties) {
                        const existing = map.get(specialty.categoryId)
                        if (existing) {
                                existing.specialties.push({ id: specialty.id, name: specialty.name, categoryId: specialty.categoryId })
                        } else {
                                const name = specialty.categoryName ?? 'Unnamed category'
                                map.set(specialty.categoryId, {
                                        category: { id: specialty.categoryId, name },
                                        specialties: [
                                                { id: specialty.id, name: specialty.name, categoryId: specialty.categoryId }
                                        ]
                                })
                        }
                }
                return Array.from(map.values()).map(group => ({
                        category: group.category,
                        specialties: group.specialties.sort((a, b) => a.name.localeCompare(b.name))
                })).sort((a, b) => a.category.name.localeCompare(b.category.name))
        }, [categories, specialties])

        const isLoading = categoriesQuery.isLoading || specialtiesQuery.isLoading
        const isError = categoriesQuery.isError || specialtiesQuery.isError
        const hasSelections = grouped.length > 0
        const canEdit = editable && Boolean(userId)

        return (
                <section className='rounded-xl border border-base-200 bg-white/90 p-4'>
                        <div className='flex items-center justify-between'>
                                <h3 className='font-semibold'>Categories</h3>
                                {canEdit && (
                                        <button
                                                className='btn btn-ghost btn-circle btn-sm text-green-700'
                                                onClick={() => setOpen(true)}
                                                disabled={isLoading || mutation.isPending}
                                                title='Manage categories'
                                        >
                                                <Pencil size={16} />
                                        </button>
                                )}
                        </div>

                        <div className='mt-3 space-y-4'>
                                {isLoading ? (
                                        <div className='space-y-3'>
                                                <div className='skeleton h-4 w-32'></div>
                                                <div className='flex flex-wrap gap-2'>
                                                        <div className='skeleton h-6 w-28 rounded-full'></div>
                                                        <div className='skeleton h-6 w-24 rounded-full'></div>
                                                        <div className='skeleton h-6 w-20 rounded-full'></div>
                                                </div>
                                        </div>
                                ) : isError ? (
                                        <div className='text-sm text-error'>Không thể tải dữ liệu danh mục và chuyên môn.</div>
                                ) : hasSelections ? (
                                        grouped.map(group => (
                                                <div key={group.category.id} className='space-y-2'>
                                                        <div className='font-semibold text-base-content'>{group.category.name}</div>
                                                        {group.specialties.length > 0 ? (
                                                                <div className='flex flex-wrap gap-2'>
                                                                        {group.specialties.map(item => (
                                                                                <span
                                                                                        key={item.id}
                                                                                        className='badge badge-outline rounded-full px-3 py-2 text-sm font-medium'
                                                                                >
                                                                                        {item.name}
                                                                                </span>
                                                                        ))}
                                                                </div>
                                                        ) : (
                                                                <div className='text-sm text-base-content/60'>Chưa chọn chuyên môn cho danh mục này.</div>
                                                        )}
                                                </div>
                                        ))
                                ) : (
                                        <div className='text-sm text-base-content/60'>
                                                {canEdit
                                                        ? 'Bạn chưa chọn danh mục nào. Nhấn vào biểu tượng chỉnh sửa để bắt đầu.'
                                                        : 'Freelancer chưa cập nhật danh mục làm việc.'}
                                        </div>
                                )}
                        </div>

                        {canEdit && (
                                <CategorySpecialtyManagerModal
                                        open={open}
                                        onClose={() => setOpen(false)}
                                        initialCategories={categories}
                                        initialSpecialties={specialties}
                                        onSave={async payload => {
                                                await mutation.mutateAsync({
                                                        categoryIds: payload.categoryIds,
                                                        specialtyIds: payload.specialtyIds
                                                })
                                        }}
                                />
                        )}
                </section>
        )
}
