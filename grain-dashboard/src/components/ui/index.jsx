import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Download } from 'lucide-react'

export function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-grain-500 ${className}`} />
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8 pt-2 lg:pt-0">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-earth-100">{title}</h1>
        {subtitle && <p className="text-sm text-grain-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, icon: Icon, color = 'earth', delay = 0 }) {
  const colors = {
    earth: 'text-earth-400 bg-earth-900/30 border-earth-800/40',
    grain: 'text-grain-400 bg-grain-900/30 border-grain-800/40',
    red:   'text-red-400 bg-red-950/30 border-red-900/40',
    blue:  'text-blue-400 bg-blue-950/30 border-blue-900/40',
  }
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-grain-500 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors[color]}`}>
            <Icon size={15} />
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-display font-semibold text-earth-100">{value}</div>
        {sub && <div className="text-xs text-grain-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={36} className="text-grain-700 mb-3" />}
      <p className="text-grain-400 font-medium">{message}</p>
      {sub && <p className="text-grain-600 text-sm mt-1">{sub}</p>}
    </div>
  )
}

export function ErrorMsg({ message }) {
  return (
    <div className="flex items-center gap-2 p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-400 text-sm">
      <AlertCircle size={16} />
      {message}
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-dark-800 border border-dark-500 rounded-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-slide-up`}>
        <div className="flex items-center justify-between p-5 border-b border-dark-600">
          <h2 className="font-display font-semibold text-earth-100">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Badge({ status }) {
  const { label, cls } = status
  return <span className={cls}>{label}</span>
}

export function Table({ columns, data, loading, empty }) {
  if (loading) return (
    <div className="flex justify-center py-12"><Spinner /></div>
  )
  if (!data?.length) return empty || <EmptyState message="No records found." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-600">
            {columns.map(c => (
              <th key={c.key} className={`table-header text-left ${c.className || ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} className="table-row">
              {columns.map(c => (
                <td key={c.key} className={`table-cell ${c.className || ''}`}>
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FormField({ label, children, required }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="input appearance-none cursor-pointer"
    >
      {children}
    </select>
  )
}

export function ExportButton({ onClick, label = 'Export', disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-secondary flex items-center gap-2 text-sm"
      title="Export to Excel"
    >
      <Download size={15} />
      {label}
    </button>
  )
}

