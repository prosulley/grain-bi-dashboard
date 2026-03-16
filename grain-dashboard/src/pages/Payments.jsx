import { useEffect, useState } from 'react'
import { Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { PageHeader, Table, StatCard, EmptyState, ExportButton } from '../components/ui'
import { exportToExcel } from '../utils/exportExcel'

export default function Payments() {
  const [payments,     setPayments]     = useState([])
  const [receivables,  setReceivables]  = useState([])
  const [payables,     setPayables]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('all')
  const [filter,       setFilter]       = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/payments'),
      api.get('/payments/receivables'),
      api.get('/payments/payables'),
    ]).then(([p, r, pa]) => {
      setPayments(p.data.data)
      setReceivables(r.data.data)
      setPayables(pa.data.data)
    }).finally(() => setLoading(false))
  }, [])

  const totalReceivable = receivables.reduce((a, r) => a + Number(r.total_outstanding), 0)
  const totalPayable    = payables.reduce((a, r) => a + Number(r.total_outstanding), 0)
  const totalInflow     = payments.filter(p => p.direction === 'inflow').reduce((a,p) => a + Number(p.amount), 0)
  const totalOutflow    = payments.filter(p => p.direction === 'outflow').reduce((a,p) => a + Number(p.amount), 0)

  const filtered = payments.filter(p => {
    if (filter === 'inflow')  return p.direction === 'inflow'
    if (filter === 'outflow') return p.direction === 'outflow'
    return true
  })

  const paymentColumns = [
    { key: 'reference',    label: 'Reference', render: v => <span className="font-mono text-xs text-earth-300">{v}</span> },
    { key: 'party_name',   label: 'Party',     render: (v, r) => (
      <div>
        <div className="font-medium text-earth-200">{v || '—'}</div>
        <div className="text-xs text-grain-500 capitalize">{r.party_type}</div>
      </div>
    )},
    { key: 'direction', label: 'Type', render: v => v === 'inflow' ? (
      <span className="badge-green flex items-center gap-1 w-fit"><ArrowDownLeft size={11}/>Inflow</span>
    ) : (
      <span className="badge-red flex items-center gap-1 w-fit"><ArrowUpRight size={11}/>Outflow</span>
    )},
    { key: 'amount',       label: 'Amount',    render: (v, r) => (
      <span className={`font-mono font-medium ${r.direction === 'inflow' ? 'text-grain-300' : 'text-red-400'}`}>
        {r.direction === 'inflow' ? '+' : '-'}{fmt.currency(v)}
      </span>
    )},
    { key: 'method',       label: 'Method',    render: v => <span className="capitalize badge-gray">{v?.replace('_',' ')}</span> },
    { key: 'transaction_ref', label: 'Transaction', render: v => <span className="font-mono text-xs text-grain-500">{v || '—'}</span> },
    { key: 'payment_date', label: 'Date',      render: v => fmt.date(v) },
  ]

  const receivablesColumns = [
    { key: 'buyer',            label: 'Buyer',       render: v => <span className="font-medium text-earth-200">{v}</span> },
    { key: 'phone',            label: 'Phone' },
    { key: 'open_orders',      label: 'Open Orders' },
    { key: 'total_outstanding', label: 'Outstanding', render: v => (
      <span className="font-mono font-medium text-red-400">{fmt.currency(v)}</span>
    )},
  ]

  const payablesColumns = [
    { key: 'supplier',         label: 'Supplier',    render: v => <span className="font-medium text-earth-200">{v}</span> },
    { key: 'phone',            label: 'Phone' },
    { key: 'open_orders',      label: 'Open Orders' },
    { key: 'total_outstanding', label: 'Outstanding', render: v => (
      <span className="font-mono font-medium text-red-400">{fmt.currency(v)}</span>
    )},
  ]

  const tabs = [
    { key: 'all',          label: 'All Payments' },
    { key: 'receivables',  label: `Receivables (${receivables.length})` },
    { key: 'payables',     label: `Payables (${payables.length})` },
  ]

  const handleExport = () => {
    if (tab === 'all') {
      exportToExcel(filtered, [
        { header: 'Reference',      key: 'reference' },
        { header: 'Party',          key: 'party_name' },
        { header: 'Party Type',     key: 'party_type' },
        { header: 'Direction',      key: 'direction',      format: v => v === 'inflow' ? 'Inflow' : 'Outflow' },
        { header: 'Amount (GHS)',   key: 'amount',         format: v => Number(v || 0) },
        { header: 'Method',         key: 'method',         format: v => v?.replace('_', ' ') },
        { header: 'Transaction Ref', key: 'transaction_ref' },
        { header: 'Date',           key: 'payment_date',   format: v => fmt.date(v) },
      ], 'Payments')
    } else if (tab === 'receivables') {
      exportToExcel(receivables, [
        { header: 'Buyer',            key: 'buyer' },
        { header: 'Phone',            key: 'phone' },
        { header: 'Open Orders',      key: 'open_orders',      format: v => Number(v || 0) },
        { header: 'Outstanding (GHS)', key: 'total_outstanding', format: v => Number(v || 0) },
      ], 'Receivables')
    } else {
      exportToExcel(payables, [
        { header: 'Supplier',          key: 'supplier' },
        { header: 'Phone',             key: 'phone' },
        { header: 'Open Orders',       key: 'open_orders',      format: v => Number(v || 0) },
        { header: 'Outstanding (GHS)', key: 'total_outstanding', format: v => Number(v || 0) },
      ], 'Payables')
    }
  }

  const currentData = tab === 'all' ? filtered : tab === 'receivables' ? receivables : payables

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payments"
        subtitle="Track all inflows and outflows"
        action={<ExportButton onClick={handleExport} disabled={!currentData.length} />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Received"    value={fmt.currency(totalInflow)}     icon={ArrowDownLeft} color="grain" />
        <StatCard label="Total Paid Out"    value={fmt.currency(totalOutflow)}    icon={ArrowUpRight}  color="red"   />
        <StatCard label="Receivables Due"   value={fmt.currency(totalReceivable)} icon={Wallet}        color="blue"  />
        <StatCard label="Payables Due"      value={fmt.currency(totalPayable)}    icon={Wallet}        color="red"   />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === t.key ? 'bg-dark-700 text-earth-200 border border-dark-500' : 'text-grain-500 hover:text-grain-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['', 'inflow', 'outflow'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${filter === f ? 'bg-earth-500/20 text-earth-300 border border-earth-700/50' : 'text-grain-500 hover:text-grain-300'}`}
              >
                {f === '' ? 'All' : f === 'inflow' ? '↓ Inflows' : '↑ Outflows'}
              </button>
            ))}
          </div>
          <div className="card">
            <Table
              columns={paymentColumns}
              data={filtered}
              loading={loading}
              empty={<EmptyState icon={Wallet} message="No payments recorded yet" />}
            />
          </div>
        </div>
      )}

      {tab === 'receivables' && (
        <div className="card">
          <div className="p-4 border-b border-dark-600">
            <p className="text-sm text-grain-400">Buyers with outstanding balances</p>
          </div>
          <Table
            columns={receivablesColumns}
            data={receivables}
            loading={loading}
            empty={<EmptyState icon={Wallet} message="No outstanding receivables" sub="All buyers are up to date!" />}
          />
        </div>
      )}

      {tab === 'payables' && (
        <div className="card">
          <div className="p-4 border-b border-dark-600">
            <p className="text-sm text-grain-400">Suppliers you owe money to</p>
          </div>
          <Table
            columns={payablesColumns}
            data={payables}
            loading={loading}
            empty={<EmptyState icon={Wallet} message="No outstanding payables" sub="All suppliers are paid up!" />}
          />
        </div>
      )}
    </div>
  )
}
