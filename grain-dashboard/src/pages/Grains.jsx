import { useEffect, useState } from 'react'
import { Wheat, Plus } from 'lucide-react'
import api from '../utils/api'
import { PageHeader, Table, Modal, FormField, Select, EmptyState, ExportButton } from '../components/ui'
import { exportToExcel } from '../utils/exportExcel'

const UNITS = ['kg', 'tonnes', 'bags', 'crates']
const EMPTY = { name: '', variety: '', default_unit: 'bags', description: '' }

export default function Grains() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/grains').then(r => setRows(r.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (row) => { setEditing(row.id); setForm({ ...EMPTY, ...row }); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/grains/${editing}`, form)
      else         await api.post('/grains', form)
      setModal(false); load()
    } finally { setSaving(false) }
  }

  const deactivate = async (id) => {
    if (!confirm('Deactivate this grain?')) return
    await api.delete(`/grains/${id}`)
    load()
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  const columns = [
    { key: 'name',         label: 'Grain Name', render: v => <span className="font-medium text-earth-200">{v}</span> },
    { key: 'variety',      label: 'Variety',    render: v => v || '—' },
    { key: 'default_unit', label: 'Unit' },
    { key: 'description',  label: 'Description', render: v => <span className="text-grain-500 text-xs">{v || '—'}</span> },
    { key: 'is_active',    label: 'Status', render: v => (
      <span className={v ? 'badge-green' : 'badge-gray'}>{v ? 'Active' : 'Inactive'}</span>
    )},
    { key: 'id', label: '', render: (v, r) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="btn-ghost text-xs">Edit</button>
        {r.is_active && (
          <button onClick={() => deactivate(v)} className="btn-ghost text-xs text-red-400 hover:text-red-300">Deactivate</button>
        )}
      </div>
    )},
  ]

  const handleExport = () => {
    exportToExcel(rows, [
      { header: 'Name',        key: 'name' },
      { header: 'Variety',     key: 'variety' },
      { header: 'Default Unit', key: 'default_unit' },
      { header: 'Description', key: 'description' },
      { header: 'Status',      key: 'is_active', format: v => v ? 'Active' : 'Inactive' },
    ], 'Grains')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Grains"
        subtitle="Manage grain commodities"
        action={
          <div className="flex items-center gap-2">
            <ExportButton onClick={handleExport} disabled={!rows.length} />
            <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15}/>Add Grain</button>
          </div>
        }
      />

      <div className="card">
        <Table
          columns={columns}
          data={rows}
          loading={loading}
          empty={<EmptyState icon={Wheat} message="No grains configured" />}
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Grain' : 'Add Grain'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Grain Name" required>
              <input className="input" value={form.name} onChange={e => f({ name: e.target.value })} required />
            </FormField>
            <FormField label="Variety">
              <input className="input" value={form.variety} placeholder="e.g. Local, Imported, Grade A" onChange={e => f({ variety: e.target.value })} />
            </FormField>
            <FormField label="Default Unit">
              <Select value={form.default_unit} onChange={e => f({ default_unit: e.target.value })}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Description">
            <textarea className="input" rows={2} value={form.description} onChange={e => f({ description: e.target.value })} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editing ? 'Update Grain' : 'Add Grain'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
