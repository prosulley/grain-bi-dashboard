import { useEffect, useState } from 'react'
import { ShoppingCart, Plus, Trash2, CreditCard, Pencil } from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { PageHeader, Table, Modal, FormField, Select, EmptyState, ExportButton } from '../components/ui'
import { exportToExcel } from '../utils/exportExcel'

export default function Purchases() {
  const [rows,       setRows]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [payModal,   setPayModal]   = useState(false)
  const [selPurch,   setSelPurch]   = useState(null)
  const [suppliers,  setSuppliers]  = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [grains,     setGrains]     = useState([])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [payForm,    setPayForm]    = useState({ amount: '', method: 'cash', notes: '' })
  const [editing,    setEditing]    = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const [form, setForm] = useState({
    supplier_id: '', warehouse_id: '', purchase_date: new Date().toISOString().slice(0,10), notes: '',
    tt_fee: '', misc_fee: '',
    items: [{ grain_id: '', quantity: '', unit: 'bags', price_per_bag: '', quality_grade: '' }]
  })

  const load = () => {
    setLoading(true)
    api.get('/purchases').then(r => setRows(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/suppliers').then(r => setSuppliers(r.data.data))
    api.get('/warehouses').then(r => setWarehouses(r.data.data))
    api.get('/grains').then(r => setGrains(r.data.data))
  }, [])

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { grain_id:'', quantity:'', unit:'bags', price_per_bag:'', quality_grade:'' }] }))
  const delItem = i => setForm(p => ({ ...p, items: p.items.filter((_,idx) => idx !== i) }))
  const setItem = (i, k, v) => setForm(p => {
    const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items }
  })

  const defaultForm = () => ({
    supplier_id: '', warehouse_id: '', purchase_date: new Date().toISOString().slice(0,10), notes: '',
    tt_fee: '', misc_fee: '',
    items: [{ grain_id: '', quantity: '', unit: 'bags', price_per_bag: '', quality_grade: '' }]
  })

  const openAdd = () => {
    setEditing(null)
    setForm(defaultForm())
    setError('')
    setModal(true)
  }

  const openEdit = async (row) => {
    setEditing(row.id)
    setError('')
    try {
      const res = await api.get(`/purchases/${row.id}`)
      const p = res.data.data
      setForm({
        supplier_id: p.supplier_id || '',
        warehouse_id: p.warehouse_id || '',
        purchase_date: (p.purchase_date || '').slice(0, 10),
        notes: p.notes || '',
        tt_fee: '',
        misc_fee: '',
        items: (p.items || []).map(it => ({
          grain_id: it.grain_id,
          quantity: it.quantity,
          unit: it.unit || 'bags',
          price_per_bag: parseFloat(it.price_per_kg || 0) * (unitToKg[it.unit] || 1),
          quality_grade: it.quality_grade || '',
        }))
      })
      setModal(true)
    } catch {
      setError('Failed to load purchase details')
    }
  }

  const deletePurchase = async () => {
    if (!confirmDel) return
    try {
      await api.delete(`/purchases/${confirmDel.id}`)
      setConfirmDel(null)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete purchase')
      setConfirmDel(null)
    }
  }

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
          quality_grade: it.quality_grade,
        }))
      }
      if (editing) await api.put(`/purchases/${editing}`, payload)
      else         await api.post('/purchases', payload)
      setModal(false)
      load()
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to save purchase')
    } finally { setSaving(false) }
  }

  const recordPayment = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/purchases/${selPurch.id}/payment`, payForm)
      setPayModal(false)
      load()
    } finally { setSaving(false) }
  }

  const columns = [
    { key: 'reference',     label: 'Reference', render: v => <span className="font-mono text-earth-300 text-xs">{v}</span> },
    { key: 'supplier',      label: 'Supplier',  render: v => <span className="font-medium text-earth-200">{v}</span> },
    { key: 'warehouse',     label: 'Warehouse' },
    { key: 'purchase_date', label: 'Date',      render: v => fmt.date(v) },
    { key: 'total_amount',  label: 'Total',     render: v => <span className="font-mono">{fmt.currency(v)}</span> },
    { key: 'balance_due',   label: 'Balance',   render: v => <span className={`font-mono ${Number(v)>0?'text-red-400':'text-grain-500'}`}>{fmt.currency(v)}</span> },
    { key: 'status', label: 'Status', render: v => { const s=fmt.status(v); return <span className={s.cls}>{s.label}</span> }},
    { key: 'id', label: '', render: (_, r) => (
      <div className="flex items-center gap-1">
        {Number(r.balance_due) > 0 && (
          <button onClick={() => { setSelPurch(r); setPayForm({ amount: r.balance_due, method:'cash', notes:'' }); setPayModal(true) }}
            className="btn-ghost text-xs flex items-center gap-1"><CreditCard size={12}/>Pay</button>
        )}
        {r.status !== 'completed' && (
          <button onClick={() => openEdit(r)} className="btn-ghost text-xs flex items-center gap-1">
            <Pencil size={12}/>Edit
          </button>
        )}
        {Number(r.amount_paid || 0) === 0 && (
          <button onClick={() => setConfirmDel(r)} className="btn-ghost text-xs flex items-center gap-1 text-red-400 hover:text-red-300">
            <Trash2 size={12}/>Delete
          </button>
        )}
      </div>
    )},
  ]

  const handleExport = () => {
    exportToExcel(rows, [
      { header: 'Reference',    key: 'reference' },
      { header: 'Supplier',     key: 'supplier' },
      { header: 'Warehouse',    key: 'warehouse' },
      { header: 'Date',         key: 'purchase_date', format: v => fmt.date(v) },
      { header: 'Total (GHS)',  key: 'total_amount',  format: v => Number(v || 0) },
      { header: 'Balance (GHS)', key: 'balance_due',  format: v => Number(v || 0) },
      { header: 'Status',       key: 'status',        format: v => fmt.status(v).label },
      { header: 'Notes',        key: 'notes' },
    ], 'Purchases')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Purchases"
        subtitle="Grain purchases from suppliers"
        action={
          <div className="flex items-center gap-2">
            <ExportButton onClick={handleExport} disabled={!rows.length} />
            <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15}/>New Purchase</button>
          </div>
        }
      />

      <div className="card">
        <Table columns={columns} data={rows} loading={loading}
          empty={<EmptyState icon={ShoppingCart} message="No purchases yet" />}
        />
      </div>

      {/* New / Edit Purchase Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Purchase' : 'New Purchase'} size="xl">
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-400 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Supplier" required>
              <Select value={form.supplier_id} onChange={e => setForm(p => ({...p, supplier_id: e.target.value}))} required>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </Select>
            </FormField>
            <FormField label="Warehouse" required>
              <Select value={form.warehouse_id} onChange={e => setForm(p => ({...p, warehouse_id: e.target.value}))} required>
                <option value="">Select warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Purchase Date">
              <input type="date" className="input" value={form.purchase_date} onChange={e => setForm(p=>({...p, purchase_date: e.target.value}))} />
            </FormField>
            <FormField label="Notes">
              <input className="input" value={form.notes} placeholder="Optional notes..." onChange={e => setForm(p=>({...p, notes: e.target.value}))} />
            </FormField>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Line Items</label>
              <button type="button" onClick={addItem} className="btn-ghost text-xs flex items-center gap-1"><Plus size={12}/>Add item</button>
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
                    <input type="number" min="0" step="0.01" className="input" value={it.quantity} onChange={e => setItem(i,'quantity',e.target.value)} required />
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
                    <input type="number" min="0" step="0.01" className="input" value={it.price_per_bag} onChange={e => setItem(i,'price_per_bag',e.target.value)} required />
                  </div>
                  <div className="col-span-1 flex justify-end pb-0.5">
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => delItem(i)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300">
                        <Trash2 size={14} />
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
              {saving ? 'Saving...' : editing ? 'Update Purchase' : 'Create Purchase'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title={`Record Payment — ${selPurch?.reference}`}>
        <form onSubmit={recordPayment} className="space-y-4">
          <div className="p-3 bg-dark-700 rounded-xl text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-grain-500">Total Amount</span>
              <span className="text-earth-200">{fmt.currency(selPurch?.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grain-500">Balance Due</span>
              <span className="text-red-400 font-medium">{fmt.currency(selPurch?.balance_due)}</span>
            </div>
          </div>
          <FormField label="Amount (GHS)" required>
            <input type="number" min="0" step="0.01" max={selPurch?.balance_due} className="input"
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

      {/* Delete Confirmation Modal */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete Purchase">
        <div className="space-y-4">
          <p className="text-grain-300 text-sm">
            Are you sure you want to delete purchase <span className="font-mono text-earth-300">{confirmDel?.reference}</span>?
            This action cannot be undone.
          </p>
          <div className="p-3 bg-red-950/40 border border-red-900 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <Trash2 size={14} />
            All line items associated with this purchase will also be deleted.
          </div>
          <div className="flex gap-3">
            <button onClick={deletePurchase} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-500">Delete Purchase</button>
            <button onClick={() => setConfirmDel(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
