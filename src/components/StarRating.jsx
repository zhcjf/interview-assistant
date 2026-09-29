import { useState } from 'react'
import { IconStar } from './Icons.jsx'

export function StarRating({ value = 0, onChange, size = 24, readOnly = false }) {
  const [hover, setHover] = useState(0)
  const display = hover || value
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
          className={`p-0.5 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          style={{ background: 'none', border: 'none' }}
        >
          <IconStar
            width={size}
            height={size}
            style={{
              fill: n <= display ? '#FAAD14' : 'none',
              color: n <= display ? '#FAAD14' : '#D0D7DE',
            }}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-xs text-text-tertiary">{value}/5</span>
      )}
    </div>
  )
}
