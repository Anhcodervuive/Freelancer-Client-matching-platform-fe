import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { WIZARD_LIMITS } from '../constants'
import { SelectableCardGrid, type SelectableItem } from './SelectableCardGrid'
import { WizardStepHeader } from './WizardLayout'

interface CategorySpecialtyStepProps {
  categories: SelectableItem[]
  specialties: Array<SelectableItem & { categoryId: string }>
  categoryIds: string[]
  specialtyIds: string[]
  onCategoryChange: (_ids: string[]) => void
  onSpecialtyChange: (_ids: string[]) => void
  searchKeyword: {
    category: string
    onCategoryChange: (_value: string) => void
    specialty: string
    onSpecialtyChange: (_value: string) => void
  }
}

export function CategorySpecialtyStep({
  categories,
  specialties,
  categoryIds,
  specialtyIds,
  onCategoryChange,
  onSpecialtyChange,
  searchKeyword,
}: CategorySpecialtyStepProps) {
  const filteredSpecialties = useMemo(() => {
    if (categoryIds.length === 0) return specialties
    return specialties.filter(item => categoryIds.includes(item.categoryId))
  }, [categoryIds, specialties])

  return (
    <div>
      <WizardStepHeader
        title='Bạn giỏi lĩnh vực nào?'
        subtitle={`Chọn tối đa ${WIZARD_LIMITS.maxCategories} danh mục chính và ${WIZARD_LIMITS.maxSpecialties} chuyên môn phù hợp.`}
      />

      <div className='grid gap-10 lg:grid-cols-2'>
        <div className='space-y-4'>
          <div className='flex items-center justify-between text-sm font-medium'>
            <span>Danh mục</span>
            <span>
              {categoryIds.length}/{WIZARD_LIMITS.maxCategories}
            </span>
          </div>
          <label className='input input-bordered flex items-center gap-2'>
            <Search className='size-4 opacity-70' />
            <input
              className='grow'
              placeholder='Tìm kiếm danh mục'
              value={searchKeyword.category}
              onChange={event => searchKeyword.onCategoryChange(event.target.value)}
            />
          </label>
          <SelectableCardGrid
            items={categories}
            value={categoryIds}
            onChange={onCategoryChange}
            max={WIZARD_LIMITS.maxCategories}
            columns={2}
          />
        </div>

        <div className='space-y-4'>
          <div className='flex items-center justify-between text-sm font-medium'>
            <span>Chuyên môn</span>
            <span>
              {specialtyIds.length}/{WIZARD_LIMITS.maxSpecialties}
            </span>
          </div>
          <label className='input input-bordered flex items-center gap-2'>
            <Search className='size-4 opacity-70' />
            <input
              className='grow'
              placeholder='Tìm kiếm chuyên môn'
              value={searchKeyword.specialty}
              onChange={event => searchKeyword.onSpecialtyChange(event.target.value)}
            />
          </label>
          <SelectableCardGrid
            items={filteredSpecialties}
            value={specialtyIds}
            onChange={onSpecialtyChange}
            max={WIZARD_LIMITS.maxSpecialties}
            columns={2}
          />
        </div>
      </div>

      <p className='mt-6 text-xs text-base-content/70'>Bạn có thể thay đổi các lựa chọn này bất kỳ lúc nào.</p>
    </div>
  )
}
