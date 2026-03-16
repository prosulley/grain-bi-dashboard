export const fmt = {
  currency: (n, symbol = 'GHS') =>
    `${symbol} ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

  number: (n) => Number(n || 0).toLocaleString(),

  kg: (n) => {
    const v = Number(n || 0)
    const bags = v / 50
    return `${bags.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} bags`
  },

  date: (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',

  pct: (n) => `${Number(n || 0).toFixed(1)}%`,

  status: (s) => {
    const map = {
      pending:   { label: 'Pending',   cls: 'badge-amber' },
      partial:   { label: 'Partial',   cls: 'badge-amber' },
      completed: { label: 'Completed', cls: 'badge-green' },
      cancelled: { label: 'Cancelled', cls: 'badge-red'   },
    }
    return map[s] || { label: s, cls: 'badge-gray' }
  }
}
