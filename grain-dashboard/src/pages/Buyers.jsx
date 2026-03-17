import { useEffect, useState } from 'react'
import { Users, Plus, Search, Phone, MapPin, Trash2 } from 'lucide-react'
import api from '../utils/api'
import { PageHeader, Table, Modal, FormField, EmptyState, ExportButton } from '../components/ui'
import { fmt } from '../utils/format'
import { exportToExcel } from '../utils/exportExcel'

const EMPTY = {
  full_name:'', company_name:'', phone:'', alt_phone:'', email:'',
  region:'', address:'', bank_name:'', bank_account:'', momo_number:'',
  credit_limit: 0, notes:''
}

export default function Buyers() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [editing, setEditing] = useState(null)

  const load = (q = '') => {
    setLoading(true)
    api.get(`/buyers?search=${q}`)
      .then(r => setRows(r.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (row) => { setEditing(row.id); setForm({ ...EMPTY, ...row }); setModal(true) }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await api.put(`/buyers/${editing}`, form)
      else         await api.post('/buyers', form)
      setModal(false)
      load(search)
    } finally { setSaving(false) }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete buyer "${row.full_name}"?`)) return
    try {
      await api.delete(`/buyers/${row.id}`)
      load(search)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete buyer')
    }
  }

  const columns = [
    { key: 'code',         label: 'Code',   className: 'w-24' },
    { key: 'full_name',    label: 'Name',   render: (v, r) => (
      <div>
        <div className="font-medium text-earth-200">{v}</div>
        {r.company_name && <div className="text-xs text-grain-500">{r.company_name}</div>}
      </div>
    )},
    { key: 'phone', label: 'Phone', render: v => (
      <span className="flex items-center gap-1 text-grain-300"><Phone size={12}/>{v}</span>
    )},
    { key: 'region', label: 'Region', render: v => v ? (
      <span className="flex items-center gap-1 text-grain-400"><MapPin size={12}/>{v}</span>
    ) : '—' },
    { key: 'credit_limit',   label: 'Credit Limit',  render: v => fmt.currency(v) },
    { key: 'credit_balance', label: 'Outstanding',   render: v => (
      <span className={Number(v) > 0 ? 'text-red-400' : 'text-grain-400'}>{fmt.currency(v)}</span>
    )},
    { key: 'id', label: '', render: (_, r) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(r)} className="btn-ghost text-xs">Edit</button>
        <button onClick={() => handleDelete(r)} className="btn-ghost text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
          <Trash2 size={12}/>Delete
        </button>
      </div>
    )},
  ]

  const handleExport = () => {
    exportToExcel(rows, [
      { header: 'Code',         key: 'code' },
      { header: 'Full Name',    key: 'full_name' },
      { header: 'Company',      key: 'company_name' },
      { header: 'Phone',        key: 'phone' },
      { header: 'Alt Phone',    key: 'alt_phone' },
      { header: 'Email',        key: 'email' },
      { header: 'Region',       key: 'region' },
      { header: 'Address',      key: 'address' },
      { header: 'Credit Limit (GHS)', key: 'credit_limit', format: v => Number(v || 0) },
      { header: 'Outstanding (GHS)',   key: 'credit_balance', format: v => Number(v || 0) },
      { header: 'MoMo Number',  key: 'momo_number' },
    ], 'Buyers')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Buyers"
        subtitle="Manage grain buyers"
        action={
          <div className="flex items-center gap-2">
            <ExportButton onClick={handleExport} disabled={!rows.length} />
            <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15}/>Add Buyer</button>
          </div>
        }
      />

      <div className="card">
        <div className="p-4 border-b border-dark-600 flex items-center gap-3">
          <Search size={16} className="text-grain-500 shrink-0" />
          <input
            className="input border-0 bg-transparent p-0 focus:ring-0"
            placeholder="Search by name, company or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); load(e.target.value) }}
          />
        </div>
        <Table columns={columns} data={rows} loading={loading}
          empty={<EmptyState icon={Users} message="No buyers yet" sub="Click 'Add Buyer' to get started" />}
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Buyer' : 'Add Buyer'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <input className="input" value={form.full_name} onChange={e => f({ full_name: e.target.value })} required />
            </FormField>
            <FormField label="Company Name">
              <input className="input" value={form.company_name} onChange={e => f({ company_name: e.target.value })} />
            </FormField>
            <FormField label="Phone" required>
              <input className="input" value={form.phone} onChange={e => f({ phone: e.target.value })} required />
            </FormField>
            <FormField label="Alt Phone">
              <input className="input" value={form.alt_phone} onChange={e => f({ alt_phone: e.target.value })} />
            </FormField>
            <FormField label="Email">
              <input type="email" className="input" value={form.email} onChange={e => f({ email: e.target.value })} />
            </FormField>
            <FormField label="Region">
              <input className="input" value={form.region} onChange={e => f({ region: e.target.value })} />
            </FormField>
            <FormField label="Credit Limit (GHS)">
              <input type="number" min="0" className="input" value={form.credit_limit} onChange={e => f({ credit_limit: e.target.value })} />
            </FormField>
            <FormField label="MoMo Number">
              <input className="input" value={form.momo_number} onChange={e => f({ momo_number: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Address">
            <textarea className="input" rows={2} value={form.address} onChange={e => f({ address: e.target.value })} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editing ? 'Update Buyer' : 'Add Buyer'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
