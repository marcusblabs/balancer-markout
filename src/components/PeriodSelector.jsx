import { PERIODS } from '../config'

export default function PeriodSelector({ value, onChange }) {
  return (
    <div className="seg" role="tablist" aria-label="Time period">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          role="tab"
          aria-selected={value === p.key}
          className={'seg-btn' + (value === p.key ? ' on' : '')}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
