import { useEffect, useState } from 'react'
import { Warehouse, Plus, Package } from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { PageHeader, Modal, FormField, EmptyState, Spinner, ExportButton } from '../components/ui'
import { exportToExcel } from '../utils/exportExcel'

export default function Warehouses() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [detail,  setDetail]  = useState(null)
  const [form,    setForm]    = useState({ name:'', location:'', region:'', capacity_kg:'', manager_name:'', phone:'' })
  const [saving,  setSaving]  = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/warehouses').then(r => setRows(r.data.data)).finally(() => setLoading(false))
  }

  const loadDetail = (id) => {
    api.get(`/warehouses/${id}`).then(r => setDetail(r.data.data))
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm({ name:'', location:'', region:'', capacity_kg:'', manager_name:'', phone:'' }); setModal(true) }
  const openEdit = (row) => { setEditing(row.id); setForm({ ...row }); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/warehouses/${editing}`, form)
      else         await api.post('/warehouses', form)
      setModal(false); load()
    } finally { setSaving(false) }
  }

  const f = v => setForm(p => ({ ...p, ...v }))

  const utilPct = (row) => {
    if (!row.capacity_kg || !row.total_stock_kg) return 0
    return Math.min(100, ((row.total_stock_kg / row.capacity_kg) * 100)).toFixed(1)
  }

  const handleExport = () => {
    exportToExcel(rows, [
      { header: 'Name',           key: 'name' },
      { header: 'Location',       key: 'location' },
      { header: 'Region',         key: 'region' },
      { header: 'Capacity (bags)',    key: 'capacity_kg',    format: v => Number((v || 0) / 50) },
      { header: 'Total Stock (bags)', key: 'total_stock_kg', format: v => Number((v || 0) / 50) },
      { header: 'Grain Types',    key: 'grain_types',     format: v => Number(v || 0) },
      { header: 'Utilization %',  key: 'capacity_kg',     format: (_, row) => Number(utilPct(row)) },
      { header: 'Manager',        key: 'manager_name' },
      { header: 'Phone',          key: 'phone' },
    ], 'Warehouses')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Warehouses"
        subtitle="Storage locations and stock"
        action={
          <div className="flex items-center gap-2">
            <ExportButton onClick={handleExport} disabled={!rows.length} />
            <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15}/>Add Warehouse</button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Warehouse} message="No warehouses yet" />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {rows.map(row => {
            const pct = utilPct(row)
            return (
              <div key={row.id} className="card-hover p-5 cursor-pointer" onClick={() => loadDetail(detail?.id === row.id ? null : row.id)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-grain-900/50 border border-grain-700/40 flex items-center justify-center">
                      <Warehouse size={18} className="text-grain-400" />
                    </div>
                    <div>
                      <div className="font-display font-semibold text-earth-100">{row.name}</div>
                      <div className="text-xs text-grain-500">{row.location} · {row.region}</div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(row) }} className="btn-ghost text-xs">Edit</button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-dark-700 rounded-xl p-3 text-center">
                    <div className="text-lg font-display font-semibold text-earth-200">{fmt.kg(row.total_stock_kg)}</div>
                    <div className="text-xs text-grain-500">Total Stock</div>
                  </div>
                  <div className="bg-dark-700 rounded-xl p-3 text-center">
                    <div className="text-lg font-display font-semibold text-earth-200">{row.grain_types}</div>
                    <div className="text-xs text-grain-500">Grain Types</div>
                  </div>
                  <div className="bg-dark-700 rounded-xl p-3 text-center">
                    <div className="text-lg font-display font-semibold text-earth-200">{fmt.kg(row.capacity_kg)}</div>
                    <div className="text-xs text-grain-500">Capacity</div>
                  </div>
                </div>

                {/* Capacity bar */}
                {row.capacity_kg > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-grain-500 mb-1.5">
                      <span>Utilization</span><span>{pct}%</span>
                    </div>
                    <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-earth-500' : 'bg-grain-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Expanded stock breakdown */}
                {detail?.id === row.id && detail.stock?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-dark-600">
                    <p className="text-xs font-medium text-grain-500 uppercase tracking-wider mb-3">Stock Breakdown</p>
                    <div className="space-y-2">
                      {detail.stock.map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-dark-700 last:border-0">
                          <div className="flex items-center gap-2">
                            <Package size={12} className="text-grain-600" />
                            <span className="text-sm text-earth-200">{s.grain}</span>
                            {s.variety && <span className="text-xs text-grain-500">({s.variety})</span>}
                          </div>
                          <span className="font-mono text-sm text-earth-300">{fmt.kg(s.quantity_kg)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Warehouse' : 'Add Warehouse'}>
        <form onSubmit={save} className="space-y-4">
          <FormField label="Warehouse Name" required>
            <input className="input" value={form.name} onChange={e => f({ name: e.target.value })} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Location">
              <input className="input" value={form.location} onChange={e => f({ location: e.target.value })} />
            </FormField>
            <FormField label="Region">
              <input className="input" value={form.region} onChange={e => f({ region: e.target.value })} />
            </FormField>
            <FormField label="Capacity (bags)">
              <input type="number" min="0" className="input" value={form.capacity_kg} onChange={e => f({ capacity_kg: e.target.value })} />
            </FormField>
            <FormField label="Manager Name">
              <input className="input" value={form.manager_name} onChange={e => f({ manager_name: e.target.value })} />
            </FormField>
            <FormField label="Phone">
              <input className="input" value={form.phone} onChange={e => f({ phone: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Warehouse'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
