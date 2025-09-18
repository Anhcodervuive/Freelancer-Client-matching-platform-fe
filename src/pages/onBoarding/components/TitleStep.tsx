import { WizardStepHeader } from './WizardLayout'

export function TitleStep({ value, onChange }: { value: string; onChange: (_value: string) => void }) {
  return (
    <div>
      <WizardStepHeader
        title='Tiêu đề chuyên môn của bạn là gì?'
        subtitle='Một tiêu đề rõ ràng giúp khách hàng nhanh chóng hiểu thế mạnh của bạn.'
      />
      <input
        className='input input-bordered w-full'
        placeholder='Ví dụ: Chuyên gia phát triển website & ứng dụng di động'
        value={value}
        onChange={event => onChange(event.target.value)}
      />
      <p className='mt-3 text-xs text-base-content/70'>Gợi ý: Nêu rõ lĩnh vực và công nghệ chính bạn sử dụng.</p>
    </div>
  )
}
