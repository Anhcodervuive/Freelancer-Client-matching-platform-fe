import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { getAllCategories } from '~/apis/admin/category.api'
import { getSpecialties } from '~/apis/admin/specialty.api'
import { FREELANCER_LIMITS } from '~/constants/freelancer'
import type { Category } from '~/types/Category'
import type { Specialty } from '~/types/specialty'
import type { ProfileCategory, ProfileSpecialty } from '~/hooks/api/useFreelancerCategorySpecialty'

type Props = {
        open: boolean
        onClose: () => void
        initialCategories: ProfileCategory[]
        initialSpecialties: ProfileSpecialty[]
        onSave: (_payload: { categoryIds: string[]; specialtyIds: string[] }) => Promise<void>
}

const CATEGORY_FETCH_LIMIT = 100
const SPECIALTY_FETCH_LIMIT = 500

export default function CategorySpecialtyManagerModal({
        open,
        onClose,
        initialCategories,
        initialSpecialties,
        onSave
}: Props) {
        const [selectedCategories, setSelectedCategories] = useState<string[]>([])
        const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
        const [expandedCategories, setExpandedCategories] = useState<string[]>([])
        const [search, setSearch] = useState('')
        const [saving, setSaving] = useState(false)
        const [limitWarning, setLimitWarning] = useState<'category' | 'specialty' | null>(null)

        const categoriesQuery = useQuery({
                queryKey: ['manage-categories'],
                enabled: open,
                queryFn: () => getAllCategories({ page: 1, limit: CATEGORY_FETCH_LIMIT, search: '' })
        })

        const categories = useMemo(
                () =>
                        (categoriesQuery.data?.data ?? []).slice().sort((a: Category, b: Category) =>
                                a.name.localeCompare(b.name)
                        ),
                [categoriesQuery.data?.data]
        )

        const categoryIds = useMemo(() => {
                const ids = new Set<string>()
                for (const category of categories) ids.add(category.id)
                for (const category of initialCategories) ids.add(category.id)
                return Array.from(ids).sort()
        }, [categories, initialCategories])

        const specialtiesQuery = useQuery({
                queryKey: ['manage-specialties', categoryIds],
                enabled: open && categoryIds.length > 0,
                queryFn: () => getSpecialties({ page: 1, limit: SPECIALTY_FETCH_LIMIT, search: '', categoryId: categoryIds })
        })

        const specialties = useMemo(() => specialtiesQuery.data?.data ?? [], [specialtiesQuery.data?.data])

        const specialtiesByCategory = useMemo(() => {
                const map = new Map<string, Specialty[]>()
                for (const specialty of specialties) {
                        const list = map.get(specialty.categoryId)
                        if (list) {
                                list.push(specialty)
                        } else {
                                map.set(specialty.categoryId, [specialty])
                        }
                }
                for (const list of map.values()) {
                        list.sort((a, b) => a.name.localeCompare(b.name))
                }
                return map
        }, [specialties])

        const categoryNameMap = useMemo(() => {
                const map = new Map<string, string>()
                for (const category of categories) {
                        map.set(category.id, category.name)
                }
                for (const category of initialCategories) {
                        if (!map.has(category.id)) {
                                map.set(category.id, category.name)
                        }
                }
                return map
        }, [categories, initialCategories])

        const specialtyMetaMap = useMemo(() => {
                const map = new Map<string, { name: string; categoryId: string }>()
                for (const specialty of specialties) {
                        map.set(specialty.id, { name: specialty.name, categoryId: specialty.categoryId })
                }
                for (const specialty of initialSpecialties) {
                        map.set(specialty.id, { name: specialty.name, categoryId: specialty.categoryId })
                }
                return map
        }, [specialties, initialSpecialties])

        useEffect(() => {
                if (!open) return
                setSelectedCategories(initialCategories.map(category => category.id))
                setSelectedSpecialties(initialSpecialties.map(specialty => specialty.id))
                setExpandedCategories(initialCategories.map(category => category.id))
                setSearch('')
                setSaving(false)
                setLimitWarning(null)
        }, [open, initialCategories, initialSpecialties])

        const searchTerm = search.trim().toLowerCase()

        const filteredCategories = useMemo(() => {
                if (!searchTerm) return categories
                return categories.filter(category => {
                        const nameMatch = category.name.toLowerCase().includes(searchTerm)
                        if (nameMatch) return true
                        const list = specialtiesByCategory.get(category.id) ?? []
                        return list.some(item => item.name.toLowerCase().includes(searchTerm))
                })
        }, [categories, specialtiesByCategory, searchTerm])

        const expandedSet = useMemo(() => new Set(expandedCategories), [expandedCategories])
        const selectedCategorySet = useMemo(() => new Set(selectedCategories), [selectedCategories])
        const selectedSpecialtySet = useMemo(() => new Set(selectedSpecialties), [selectedSpecialties])

        const toggleExpanded = (categoryId: string) => {
                setExpandedCategories(prev =>
                        prev.includes(categoryId)
                                ? prev.filter(id => id !== categoryId)
                                : [...prev, categoryId]
                )
        }

        const ensureCategorySelected = (categoryId: string) => {
                let allowed = true
                setSelectedCategories(prev => {
                        if (prev.includes(categoryId)) return prev
                        if (prev.length >= FREELANCER_LIMITS.maxCategories) {
                                allowed = false
                                return prev
                        }
                        setExpandedCategories(current =>
                                current.includes(categoryId) ? current : [...current, categoryId]
                        )
                        return [...prev, categoryId]
                })
                return allowed
        }

        const handleCategoryToggle = (categoryId: string) => {
                setLimitWarning(null)
                setSelectedCategories(prev => {
                        if (prev.includes(categoryId)) {
                                setSelectedSpecialties(current =>
                                        current.filter(id => {
                                                const meta = specialtyMetaMap.get(id)
                                                return meta?.categoryId !== categoryId
                                        })
                                )
                                return prev.filter(id => id !== categoryId)
                        }
                        if (prev.length >= FREELANCER_LIMITS.maxCategories) {
                                setLimitWarning('category')
                                return prev
                        }
                        setExpandedCategories(current =>
                                current.includes(categoryId) ? current : [...current, categoryId]
                        )
                        return [...prev, categoryId]
                })
        }

        const handleSpecialtyToggle = (specialtyId: string, categoryId: string) => {
                setLimitWarning(null)
                setSelectedSpecialties(prev => {
                        if (prev.includes(specialtyId)) {
                                return prev.filter(id => id !== specialtyId)
                        }
                        const categoryAlreadySelected = selectedCategorySet.has(categoryId)
                        if (!categoryAlreadySelected) {
                                const allowed = ensureCategorySelected(categoryId)
                                if (!allowed) {
                                        setLimitWarning('category')
                                        return prev
                                }
                        } else {
                                setExpandedCategories(current =>
                                        current.includes(categoryId) ? current : [...current, categoryId]
                                )
                        }
                        if (prev.length >= FREELANCER_LIMITS.maxSpecialties) {
                                setLimitWarning('specialty')
                                return prev
                        }
                        return [...prev, specialtyId]
                })
        }

        const handleSave = async () => {
                try {
                        setSaving(true)
                        await onSave({ categoryIds: selectedCategories, specialtyIds: selectedSpecialties })
                        onClose()
                } catch (error) {
                        console.error(error)
                } finally {
                        setSaving(false)
                }
        }

        if (!open) return null

        const loading = categoriesQuery.isLoading || specialtiesQuery.isLoading
        const loadError = categoriesQuery.isError || specialtiesQuery.isError

        return (
                <div className='fixed inset-0 z-[60]'>
                        <div className='absolute inset-0 bg-black/40' onClick={() => (!saving ? onClose() : null)} />

                        <div className='absolute inset-0 flex items-center justify-center p-4 md:p-8'>
                                <div className='w-full max-w-4xl rounded-2xl bg-white shadow-xl'>
                                        <div className='flex items-center justify-between border-b border-base-200 px-6 py-4'>
                                                <div>
                                                        <h3 className='text-lg font-semibold'>Categories</h3>
                                                        <p className='text-sm text-base-content/60'>
                                                                Chọn tối đa {FREELANCER_LIMITS.maxCategories} danh mục và {FREELANCER_LIMITS.maxSpecialties} chuyên môn.
                                                        </p>
                                                </div>
                                                <button className='btn btn-ghost btn-sm' onClick={onClose} disabled={saving}>
                                                        ✕
                                                </button>
                                        </div>

                                        <div className='space-y-6 px-6 py-5'>
                                                <div className='space-y-3 rounded-xl border border-base-200 p-4'>
                                                        <div className='text-sm font-medium text-base-content'>Đã chọn</div>
                                                        <div className='flex flex-wrap gap-2'>
                                                                {selectedCategories.map(id => (
                                                                        <span key={id} className='badge badge-neutral badge-lg gap-1'>
                                                                                {categoryNameMap.get(id) ?? 'Category'}
                                                                        </span>
                                                                ))}
                                                                {selectedSpecialties.map(id => (
                                                                        <span key={id} className='badge badge-outline badge-lg gap-1'>
                                                                                {specialtyMetaMap.get(id)?.name ?? 'Specialty'}
                                                                        </span>
                                                                ))}
                                                                {selectedCategories.length === 0 && selectedSpecialties.length === 0 && (
                                                                        <span className='text-sm text-base-content/60'>Chưa chọn danh mục hoặc chuyên môn nào.</span>
                                                                )}
                                                        </div>
                                                        <div className='text-xs text-base-content/60'>
                                                                {selectedCategories.length}/{FREELANCER_LIMITS.maxCategories} danh mục • {selectedSpecialties.length}/
                                                                {FREELANCER_LIMITS.maxSpecialties} chuyên môn
                                                        </div>
                                                </div>

                                                <div className='relative'>
                                                        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50' />
                                                        <input
                                                                className='input input-bordered w-full pl-9'
                                                                placeholder='Tìm kiếm danh mục hoặc chuyên môn'
                                                                value={search}
                                                                onChange={event => setSearch(event.target.value)}
                                                        />
                                                </div>

                                                {limitWarning && (
                                                        <div className='rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning'>
                                                                {limitWarning === 'category'
                                                                        ? `Bạn chỉ có thể chọn tối đa ${FREELANCER_LIMITS.maxCategories} danh mục.`
                                                                        : `Bạn chỉ có thể chọn tối đa ${FREELANCER_LIMITS.maxSpecialties} chuyên môn.`}
                                                        </div>
                                                )}

                                                {loading ? (
                                                        <div className='flex items-center justify-center py-20 text-base-content/60'>
                                                                <Loader2 className='mr-2 h-5 w-5 animate-spin' /> Đang tải dữ liệu...
                                                        </div>
                                                ) : loadError ? (
                                                        <div className='rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error'>
                                                                Không thể tải danh sách danh mục / chuyên môn. Vui lòng thử lại sau.
                                                        </div>
                                                ) : (
                                                        <div className='max-h-[420px] space-y-3 overflow-y-auto pr-1'>
                                                                {filteredCategories.map(category => {
                                                                        const items = specialtiesByCategory.get(category.id) ?? []
                                                                        const matchesSearch =
                                                                                searchTerm.length > 0 &&
                                                                                (category.name.toLowerCase().includes(searchTerm) ||
                                                                                        items.some(item => item.name.toLowerCase().includes(searchTerm)))
                                                                        const expanded = expandedSet.has(category.id) || matchesSearch
                                                                        const disabled =
                                                                                !selectedCategorySet.has(category.id) &&
                                                                                selectedCategories.length >= FREELANCER_LIMITS.maxCategories
                                                                        return (
                                                                                <div key={category.id} className='rounded-xl border border-base-200'>
                                                                                        <button
                                                                                                type='button'
                                                                                                className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left'
                                                                                                onClick={() => toggleExpanded(category.id)}
                                                                                                aria-expanded={expanded}
                                                                                        >
                                                                                                <div>
                                                                                                        <div className='font-semibold'>{category.name}</div>
                                                                                                        <div className='text-xs text-base-content/60'>
                                                                                                                {items.length} chuyên môn
                                                                                                        </div>
                                                                                                </div>
                                                                                                <div className='flex items-center gap-3'>
                                                                                                        <input
                                                                                                                type='checkbox'
                                                                                                                className='checkbox checkbox-sm'
                                                                                                                checked={selectedCategorySet.has(category.id)}
                                                                                                                onChange={() => handleCategoryToggle(category.id)}
                                                                                                                disabled={saving || (!selectedCategorySet.has(category.id) && disabled)}
                                                                                                        />
                                                                                                        <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
                                                                                                                ▾
                                                                                                        </span>
                                                                                                </div>
                                                                                        </button>
                                                                                        {expanded && (
                                                                                                <div className='border-t border-base-200 px-4 py-3'>
                                                                                                        {items.length === 0 ? (
                                                                                                                <div className='text-sm text-base-content/60'>Chưa có chuyên môn nào.</div>
                                                                                                        ) : (
                                                                                                                <div className='flex flex-wrap gap-2'>
                                                                                                                        {items.map(item => {
                                                                                                                                const isChecked = selectedSpecialtySet.has(item.id)
                                                                                                                                const disableSpecialty =
                                                                                                                                        !isChecked &&
                                                                                                                                        selectedSpecialties.length >= FREELANCER_LIMITS.maxSpecialties
                                                                                                                                return (
                                                                                                                                        <label
                                                                                                                                                key={item.id}
                                                                                                                                                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
                                                                                                                                                        isChecked
                                                                                                                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                                                                                                                : 'border-base-200'
                                                                                                                                                } ${saving ? 'opacity-50' : ''}`}
                                                                                                                                        >
                                                                                                                                                <input
                                                                                                                                                        type='checkbox'
                                                                                                                                                        className='checkbox checkbox-sm'
                                                                                                                                                        checked={isChecked}
                                                                                                                                                        disabled={saving || disableSpecialty}
                                                                                                                                                        onChange={() => handleSpecialtyToggle(item.id, category.id)}
                                                                                                                                                />
                                                                                                                                                <span>{item.name}</span>
                                                                                                                                        </label>
                                                                                                                                )
                                                                                                                        })}
                                                                                                                </div>
                                                                                                        )}
                                                                                                </div>
                                                                                        )}
                                                                                </div>
                                                                        )
                                                                })}
                                                                {filteredCategories.length === 0 && (
                                                                        <div className='rounded-xl border border-base-200 px-4 py-10 text-center text-sm text-base-content/60'>
                                                                                Không tìm thấy danh mục phù hợp.
                                                                        </div>
                                                                )}
                                                        </div>
                                                )}
                                        </div>

                                        <div className='flex items-center justify-end gap-3 border-t border-base-200 px-6 py-4'>
                                                <button className='btn btn-ghost' onClick={onClose} disabled={saving}>
                                                        Hủy
                                                </button>
                                                <button className='btn btn-primary' onClick={handleSave} disabled={saving}>
                                                        {saving ? 'Đang lưu...' : 'Lưu'}
                                                </button>
                                        </div>
                                </div>
                        </div>
                </div>
        )
}
