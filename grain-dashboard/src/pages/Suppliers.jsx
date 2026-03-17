import { useEffect, useState } from 'react'
import { UserCheck, Plus, Search, Phone, MapPin, Trash2 } from 'lucide-react'
import api from '../utils/api'
import { PageHeader, Table, Modal, FormField, EmptyState, Spinner, ExportButton } from '../components/ui'
import { exportToExcel } from '../utils/exportExcel'

const EMPTY = {
  full_name:'', company_name:'', phone:'', alt_phone:'', email:'',
  region:'', address:'', bank_name:'', bank_account:'', momo_number:'', notes:''
}

export default function Suppliers() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [editing, setEditing] = useState(null)

  const load = (q = '') => {
    setLoading(true)
    api.get(`/suppliers?search=${q}`)
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
      if (editing) await api.put(`/suppliers/${editing}`, form)
      else         await api.post('/suppliers', form)
      setModal(false)
      load(search)
    } finally { setSaving(false) }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${row.full_name}"?`)) return
    try {
      await api.delete(`/suppliers/${row.id}`)
      load(search)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete supplier')
    }
  }

  const columns = [
    { key: 'code',         label: 'Code',     className: 'w-24' },
    { key: 'full_name',    label: 'Name',     render: (v, r) => (
      <div>
        <div className="font-medium text-earth-200">{v}</div>
        {r.company_name && <div className="text-xs text-grain-500">{r.company_name}</div>}
      </div>
    )},
    { key: 'phone',  label: 'Phone', render: v => (
      <span className="flex items-center gap-1 text-grain-300"><Phone size={12}/>{v}</span>
    )},
    { key: 'region', label: 'Region', render: v => v ? (
      <span className="flex items-center gap-1 text-grain-400"><MapPin size={12}/>{v}</span>
    ) : '—' },
    { key: 'rating', label: 'Rating', render: v => v ? '⭐'.repeat(v) : '—' },
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
      { header: 'Bank Name',    key: 'bank_name' },
      { header: 'Bank Account', key: 'bank_account' },
      { header: 'MoMo Number',  key: 'momo_number' },
      { header: 'Rating',       key: 'rating', format: v => Number(v || 0) },
    ], 'Suppliers')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Suppliers"
        subtitle="Manage grain suppliers"
        action={
          <div className="flex items-center gap-2">
            <ExportButton onClick={handleExport} disabled={!rows.length} />
            <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15}/>Add Supplier</button>
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
        <Table
          columns={columns}
          data={rows}
          loading={loading}
          empty={<EmptyState icon={UserCheck} message="No suppliers yet" sub="Click 'Add Supplier' to get started" />}
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'} size="lg">
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
            <FormField label="Bank Name">
              <input className="input" value={form.bank_name} onChange={e => f({ bank_name: e.target.value })} />
            </FormField>
            <FormField label="Bank Account">
              <input className="input" value={form.bank_account} onChange={e => f({ bank_account: e.target.value })} />
            </FormField>
            <FormField label="MoMo Number">
              <input className="input" value={form.momo_number} onChange={e => f({ momo_number: e.target.value })} />
            </FormField>
            <FormField label="Rating (1-5)">
              <input type="number" min="1" max="5" className="input" value={form.rating || ''} onChange={e => f({ rating: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Address">
            <textarea className="input" rows={2} value={form.address} onChange={e => f({ address: e.target.value })} />
          </FormField>
          <FormField label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={e => f({ notes: e.target.value })} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editing ? 'Update Supplier' : 'Add Supplier'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
