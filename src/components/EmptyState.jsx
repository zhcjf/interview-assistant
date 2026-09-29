import { IconPlus, IconUpload, IconReview } from './Icons.jsx'

const illustrations = {
  interviews: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="56" fill="#EEF2FF" />
      <path d="M40 45h40a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H56l-10 8v-8h-6a4 4 0 0 1-4-4V49a4 4 0 0 1 4-4z" fill="#4F6EF7" opacity="0.15" />
      <circle cx="50" cy="58" r="2.5" fill="#4F6EF7" />
      <circle cx="60" cy="58" r="2.5" fill="#4F6EF7" />
      <circle cx="70" cy="58" r="2.5" fill="#4F6EF7" />
    </svg>
  ),
  jobs: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="56" fill="#EEF2FF" />
      <rect x="36" y="44" width="48" height="36" rx="4" fill="#4F6EF7" opacity="0.15" />
      <path d="M50 44v-4a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v4" stroke="#4F6EF7" strokeWidth="3" fill="none" />
    </svg>
  ),
  reviews: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="56" fill="#FFF7E6" />
      <path d="M44 56l8 8 16-16" stroke="#FAAD14" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  default: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="56" fill="#F0F2F5" />
      <path d="M50 50h20M50 60h20M50 70h12" stroke="#8C9AB0" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
}

export default function EmptyState({
  type = 'default',
  title,
  description,
  actions = [],
}) {
  const illustration = illustrations[type] || illustrations.default
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {illustration}
      <h3 className="mt-6 text-base font-medium text-text-primary">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-text-tertiary text-center max-w-sm">{description}</p>
      )}
      {actions.length > 0 && (
        <div className="mt-6 flex items-center gap-3">
          {actions.map((a, i) => {
            const Icon = a.icon
            return (
              <button
                key={i}
                onClick={a.onClick}
                className={a.primary ? 'btn-primary' : 'btn-secondary'}
              >
                {Icon && <Icon width={16} height={16} className="inline mr-1.5 -mt-0.5" />}
                {a.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
