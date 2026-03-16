import { useEffect, useState } from 'react'
import { TrendingUp, Plus, Trash2, CreditCard } from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { PageHeader, Table, Modal, FormField, Select, EmptyState, ExportButton } from '../components/ui'
import { exportToExcel } from '../utils/exportExcel'

export default function Sales() {
  const [rows,       setRows]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [payModal,   setPayModal]   = useState(false)
  const [selSale,    setSelSale]    = useState(null)
  const [buyers,     setBuyers]     = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [grains,     setGrains]     = useState([])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [payForm,    setPayForm]    = useState({ amount: '', method: 'cash', notes: '' })

  const [form, setForm] = useState({
    buyer_id: '', warehouse_id: '', sale_date: new Date().toISOString().slice(0,10),
    delivery_date: '', notes: '',
    tt_fee: '', misc_fee: '',
    items: [{ grain_id: '', quantity: '', unit: 'bags', price_per_bag: '' }]
  })

  const load = () => {
    setLoading(true)
    api.get('/sales').then(r => setRows(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/buyers').then(r => setBuyers(r.data.data))
    api.get('/warehouses').then(r => setWarehouses(r.data.data))
    api.get('/grains').then(r => setGrains(r.data.data))
  }, [])

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { grain_id:'', quantity:'', unit:'bags', price_per_bag:'' }] }))
  const delItem = i  => setForm(p => ({ ...p, items: p.items.filter((_,idx) => idx !== i) }))
  const setItem = (i, k, v) => setForm(p => {
    const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items }
  })

  // Unit multiplier: how many kg per unit (used for backend conversion)
  const unitToKg = { kg:1, tonnes:1000, bags:50, crates:25 }

  const subtotal = form.items.reduce((acc, it) => {
    const qty = parseFloat(it.quantity || 0)
    return acc + (qty * parseFloat(it.price_per_bag || 0))
  }, 0)

  const ttFee   = parseFloat(form.tt_fee || 0)
  const miscFee = parseFloat(form.misc_fee || 0)
  const total   = subtotal + ttFee + miscFee

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      // Convert price_per_bag to price_per_kg for the backend
      const payload = {
        ...form,
        items: form.items.map(it => ({
          grain_id: it.grain_id,
          quantity: it.quantity,
          unit: it.unit,
          price_per_kg: parseFloat(it.price_per_bag || 0) / (unitToKg[it.unit] || 1),
        }))
      }
      await api.post('/sales', payload)
      setModal(false)
      load()
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to create sale')
    } finally { setSaving(false) }
  }

  const recordPayment = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/sales/${selSale.id}/payment`, payForm)
      setPayModal(false)
      load()
    } catch(err) {
      setError(err.response?.data?.message || 'Payment failed')
    } finally { setSaving(false) }
  }

  const openPay = (r) => {
    setSelSale(r)
    setPayForm({ amount: r.balance_due, method: 'cash', notes: '' })
    setPayModal(true)
  }

  const columns = [
    { key: 'reference',  label: 'Reference', render: v => <span className="font-mono text-earth-300 text-xs">{v}</span> },
    { key: 'buyer',      label: 'Buyer',     render: v => <span className="font-medium text-earth-200">{v}</span> },
    { key: 'warehouse',  label: 'Warehouse' },
    { key: 'sale_date',  label: 'Date',      render: v => fmt.date(v) },
    { key: 'total_amount', label: 'Total',   render: v => <span className="font-mono">{fmt.currency(v)}</span> },
    { key: 'balance_due',  label: 'Balance', render: v => (
      <span className={`font-mono ${Number(v)>0 ? 'text-red-400' : 'text-grain-500'}`}>{fmt.currency(v)}</span>
    )},
    { key: 'status', label: 'Status', render: v => { const s=fmt.status(v); return <span className={s.cls}>{s.label}</span> }},
    { key: 'id', label: '', render: (_, r) => Number(r.balance_due) > 0 && (
      <button onClick={() => openPay(r)} className="btn-ghost text-xs flex items-center gap-1">
        <CreditCard size={12}/>Pay
      </button>
    )},
  ]

  const handleExport = () => {
    exportToExcel(rows, [
      { header: 'Reference',    key: 'reference' },
      { header: 'Buyer',        key: 'buyer' },
      { header: 'Warehouse',    key: 'warehouse' },
      { header: 'Date',         key: 'sale_date',     format: v => fmt.date(v) },
      { header: 'Total (GHS)',  key: 'total_amount',  format: v => Number(v || 0) },
      { header: 'Balance (GHS)', key: 'balance_due',  format: v => Number(v || 0) },
      { header: 'Status',       key: 'status',        format: v => fmt.status(v).label },
    ], 'Sales')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Sales"
        subtitle="Grain sales to buyers"
        action={
          <div className="flex items-center gap-2">
            <ExportButton onClick={handleExport} disabled={!rows.length} />
            <button onClick={() => { setError(''); setModal(true) }} className="btn-primary flex items-center gap-2"><Plus size={15}/>New Sale</button>
          </div>
        }
      />

      <div className="card">
        <Table columns={columns} data={rows} loading={loading}
          empty={<EmptyState icon={TrendingUp} message="No sales yet" sub="Click 'New Sale' to record your first sale" />}
        />
      </div>

      {/* New Sale Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Sale" size="xl">
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-400 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Buyer" required>
              <Select value={form.buyer_id} onChange={e => setForm(p=>({...p,buyer_id:e.target.value}))} required>
                <option value="">Select buyer...</option>
                {buyers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
              </Select>
            </FormField>
            <FormField label="Warehouse" required>
              <Select value={form.warehouse_id} onChange={e => setForm(p=>({...p,warehouse_id:e.target.value}))} required>
                <option value="">Select warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Sale Date">
              <input type="date" className="input" value={form.sale_date}
                onChange={e => setForm(p=>({...p,sale_date:e.target.value}))} />
            </FormField>
            <FormField label="Delivery Date">
              <input type="date" className="input" value={form.delivery_date}
                onChange={e => setForm(p=>({...p,delivery_date:e.target.value}))} />
            </FormField>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Items</label>
              <button type="button" onClick={addItem} className="btn-ghost text-xs flex items-center gap-1">
                <Plus size={12}/>Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end bg-dark-700 rounded-xl p-3">
                  <div className="col-span-4">
                    <label className="label">Grain</label>
                    <Select value={it.grain_id} onChange={e => setItem(i,'grain_id',e.target.value)} required>
                      <option value="">Select grain...</option>
                      {grains.map(g => <option key={g.id} value={g.id}>{g.name} ({g.variety})</option>)}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Quantity</label>
                    <input type="number" min="0" step="0.01" className="input" value={it.quantity}
                      onChange={e => setItem(i,'quantity',e.target.value)} required />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Unit</label>
                    <Select value={it.unit} onChange={e => setItem(i,'unit',e.target.value)}>
                      <option value="bags">Bags</option>
                      <option value="kg">kg</option>
                      <option value="tonnes">Tonnes</option>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <label className="label">Price / {it.unit === 'bags' ? 'bag' : it.unit === 'tonnes' ? 'tonne' : it.unit} (GHS)</label>
                    <input type="number" min="0" step="0.01" className="input" value={it.price_per_bag}
                      onChange={e => setItem(i,'price_per_bag',e.target.value)} required />
                  </div>
                  <div className="col-span-1 flex justify-end pb-0.5">
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => delItem(i)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300">
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Fees */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="T&T Fee (GHS)">
              <input type="number" min="0" step="0.01" className="input" placeholder="0.00"
                value={form.tt_fee} onChange={e => setForm(p=>({...p, tt_fee: e.target.value}))} />
            </FormField>
            <FormField label="Miscellaneous Fee (GHS)">
              <input type="number" min="0" step="0.01" className="input" placeholder="0.00"
                value={form.misc_fee} onChange={e => setForm(p=>({...p, misc_fee: e.target.value}))} />
            </FormField>
          </div>

          <div className="py-3 border-t border-dark-600 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-grain-500">Subtotal</span>
              <span className="text-grain-300 font-mono">{fmt.currency(subtotal)}</span>
            </div>
            {ttFee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-grain-500">T&T Fee</span>
                <span className="text-grain-300 font-mono">{fmt.currency(ttFee)}</span>
              </div>
            )}
            {miscFee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-grain-500">Miscellaneous Fee</span>
                <span className="text-grain-300 font-mono">{fmt.currency(miscFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5 border-t border-dark-600">
              <span className="text-grain-400 text-sm font-medium">Estimated Total</span>
              <span className="font-display text-xl text-earth-300">{fmt.currency(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Create Sale'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title={`Record Payment — ${selSale?.reference}`}>
        <form onSubmit={recordPayment} className="space-y-4">
          {error && <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-400 text-sm">{error}</div>}
          <div className="p-3 bg-dark-700 rounded-xl text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-grain-500">Buyer</span>
              <span className="text-earth-200">{selSale?.buyer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grain-500">Total Amount</span>
              <span className="text-earth-200">{fmt.currency(selSale?.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grain-500">Balance Due</span>
              <span className="text-red-400 font-medium">{fmt.currency(selSale?.balance_due)}</span>
            </div>
          </div>
          <FormField label="Amount (GHS)" required>
            <input type="number" min="0" step="0.01" max={selSale?.balance_due} className="input"
              value={payForm.amount} onChange={e => setPayForm(p=>({...p,amount:e.target.value}))} required />
          </FormField>
          <FormField label="Payment Method">
            <Select value={payForm.method} onChange={e => setPayForm(p=>({...p,method:e.target.value}))}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cheque">Cheque</option>
            </Select>
          </FormField>
          <FormField label="Notes">
            <input className="input" value={payForm.notes} onChange={e => setPayForm(p=>({...p,notes:e.target.value}))} />
          </FormField>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving...':'Record Payment'}</button>
            <button type="button" onClick={() => setPayModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
