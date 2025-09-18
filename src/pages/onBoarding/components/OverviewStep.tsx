import { WizardStepHeader } from './WizardLayout'

export function OverviewStep({ value, onChange }: { value: string; onChange: (_value: string) => void }) {
  return (
    <div>
      <WizardStepHeader
        title='Giới thiệu bản thân'
        subtitle='Chia sẻ kinh nghiệm, thế mạnh và phong cách làm việc của bạn (tối thiểu 100 ký tự).'
      />
      <textarea
        className='textarea textarea-bordered min-h-40 w-full'
        placeholder='Hãy kể về các dự án nổi bật, kỹ năng chính và giá trị bạn mang lại cho khách hàng.'
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  )
}
