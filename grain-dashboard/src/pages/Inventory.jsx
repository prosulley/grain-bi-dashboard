import { useEffect, useState } from 'react'
import { Package, AlertTriangle, ArrowUpDown, Pencil, Trash2 } from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { PageHeader, Table, EmptyState, Spinner, ExportButton, Modal, FormField } from '../components/ui'
import { exportToExcel } from '../utils/exportExcel'

export default function Inventory() {
  const [stock,     setStock]     = useState([])
  const [movements, setMovements] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('stock')
  const [lowOnly,   setLowOnly]   = useState(false)

  // Edit modal state
  const [editModal, setEditModal] = useState(false)
  const [editRow,   setEditRow]   = useState(null)
  const [editForm,  setEditForm]  = useState({ quantity_bags: '', reorder_bags: '' })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const loadStock = () => {
    setLoading(true)
    api.get(`/inventory${lowOnly ? '?low_stock=true' : ''}`)
      .then(r => setStock(r.data.data))
      .finally(() => setLoading(false))
  }

  const loadMovements = () => {
    setLoading(true)
    api.get('/inventory/movements?limit=50')
      .then(r => setMovements(r.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { tab === 'stock' ? loadStock() : loadMovements() }, [tab, lowOnly])

  // ── Edit ──
  const openEdit = (row) => {
    setEditRow(row)
    setEditForm({
      quantity_bags: (Number(row.quantity_kg) / 50).toFixed(1),
      reorder_bags:  (Number(row.reorder_level || 0) / 50).toFixed(1),
    })
    setError('')
    setEditModal(true)
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put(`/inventory/${editRow.id}`, {
        quantity_kg:   parseFloat(editForm.quantity_bags || 0) * 50,
        reorder_level: parseFloat(editForm.reorder_bags || 0) * 50,
      })
      setEditModal(false)
      loadStock()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update inventory')
    } finally { setSaving(false) }
  }

  // ── Delete ──
  const handleDelete = async (row) => {
    if (!confirm(`Delete stock record for "${row.grain}" at "${row.warehouse}"? This cannot be undone.`)) return
    try {
      await api.delete(`/inventory/${row.id}`)
      loadStock()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete')
    }
  }

  const stockColumns = [
    { key: 'grain',     label: 'Grain',     render: (v, r) => (
      <div>
        <span className="font-medium text-earth-200">{v}</span>
        {r.variety && <span className="text-xs text-grain-500 ml-2">({r.variety})</span>}
      </div>
    )},
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'region',    label: 'Region' },
    { key: 'quantity_kg', label: 'Stock (bags)', render: v => (
      <span className="font-mono font-medium text-earth-200">{fmt.kg(v)}</span>
    )},
    { key: 'reorder_level', label: 'Reorder Level', render: v => fmt.kg(v) },
    { key: 'low_stock_alert', label: 'Alert', render: v => v ? (
      <span className="badge-red flex items-center gap-1 w-fit"><AlertTriangle size={11}/>Low Stock</span>
    ) : (
      <span className="badge-green">OK</span>
    )},
    { key: 'last_updated', label: 'Last Updated', render: v => fmt.date(v) },
    { key: 'id', label: '', render: (_, r) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="btn-ghost text-xs flex items-center gap-1">
          <Pencil size={12}/>Edit
        </button>
        <button onClick={() => handleDelete(r)} className="btn-ghost text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
          <Trash2 size={12}/>Delete
        </button>
      </div>
    )},
  ]

  const movementColumns = [
    { key: 'grain',         label: 'Grain',     render: v => <span className="font-medium text-earth-200">{v}</span> },
    { key: 'warehouse',     label: 'Warehouse' },
    { key: 'movement_type', label: 'Type',  render: v => {
      const map = { purchase: 'badge-green', sale: 'badge-amber', adjustment: 'badge-gray', loss: 'badge-red' }
      return <span className={map[v] || 'badge-gray'}>{v}</span>
    }},
    { key: 'reference_no',  label: 'Reference', render: v => <span className="font-mono text-xs text-earth-400">{v || '—'}</span> },
    { key: 'quantity_kg',   label: 'Qty (bags)',  render: v => (
      <span className={`font-mono ${Number(v) >= 0 ? 'text-grain-300' : 'text-red-400'}`}>
        {Number(v) >= 0 ? '+' : ''}{fmt.kg(v)}
      </span>
    )},
    { key: 'balance_after', label: 'Balance (bags)', render: v => <span className="font-mono text-earth-300">{fmt.kg(v)}</span> },
    { key: 'created_at',    label: 'Date',    render: v => fmt.date(v) },
  ]

  const handleExport = () => {
    if (tab === 'stock') {
      exportToExcel(stock, [
        { header: 'Grain',        key: 'grain' },
        { header: 'Variety',      key: 'variety' },
        { header: 'Warehouse',    key: 'warehouse' },
        { header: 'Region',       key: 'region' },
        { header: 'Stock (bags)', key: 'quantity_kg', format: v => Number((v || 0) / 50) },
        { header: 'Reorder Level (bags)', key: 'reorder_level', format: v => Number((v || 0) / 50) },
        { header: 'Low Stock Alert',    key: 'low_stock_alert', format: v => v ? 'Yes' : 'No' },
        { header: 'Last Updated', key: 'last_updated', format: v => fmt.date(v) },
      ], 'Inventory_Stock')
    } else {
      exportToExcel(movements, [
        { header: 'Grain',      key: 'grain' },
        { header: 'Warehouse',  key: 'warehouse' },
        { header: 'Type',       key: 'movement_type' },
        { header: 'Reference',  key: 'reference_no' },
        { header: 'Qty (bags)', key: 'quantity_kg', format: v => Number((v || 0) / 50) },
        { header: 'Balance After (bags)', key: 'balance_after', format: v => Number((v || 0) / 50) },
        { header: 'Date',       key: 'created_at', format: v => fmt.date(v) },
      ], 'Inventory_Movements')
    }
  }

  const lowStockCount = stock.filter(s => s.low_stock_alert).length

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle="Stock levels and movement history"
        action={
          <div className="flex items-center gap-2">
            <ExportButton onClick={handleExport} disabled={tab === 'stock' ? !stock.length : !movements.length} />
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-950/50 border border-red-800 rounded-xl text-red-400 text-sm">
                <AlertTriangle size={14} />
                {lowStockCount} low stock alert{lowStockCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${tab === 'stock' ? 'bg-dark-700 text-earth-200 border border-dark-500' : 'text-grain-500 hover:text-grain-300'}`}
        >
          <Package size={14} /> Stock Levels
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${tab === 'movements' ? 'bg-dark-700 text-earth-200 border border-dark-500' : 'text-grain-500 hover:text-grain-300'}`}
        >
          <ArrowUpDown size={14} /> Stock Movements
        </button>
      </div>

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-grain-400 cursor-pointer">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={e => setLowOnly(e.target.checked)}
                className="rounded border-dark-500 bg-dark-700 text-earth-500"
              />
              Show low stock only
            </label>
          </div>
          <div className="card">
            <Table
              columns={stockColumns}
              data={stock}
              loading={loading}
              empty={<EmptyState icon={Package} message="No stock data" sub="Stock is updated automatically when purchases and sales are recorded" />}
            />
          </div>
        </div>
      )}

      {tab === 'movements' && (
        <div className="card">
          <Table
            columns={movementColumns}
            data={movements}
            loading={loading}
            empty={<EmptyState icon={ArrowUpDown} message="No stock movements yet" />}
          />
        </div>
      )}

      {/* Edit Inventory Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Inventory">
        {editRow && (
          <form onSubmit={saveEdit} className="space-y-4">
            {error && <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-400 text-sm">{error}</div>}
            <div className="p-3 bg-dark-700 rounded-xl text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-grain-500">Grain</span>
                <span className="text-earth-200">{editRow.grain}{editRow.variety ? ` (${editRow.variety})` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-grain-500">Warehouse</span>
                <span className="text-earth-200">{editRow.warehouse}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Stock Quantity (bags)" required>
                <input type="number" min="0" step="0.1" className="input"
                  value={editForm.quantity_bags}
                  onChange={e => setEditForm(p => ({ ...p, quantity_bags: e.target.value }))}
                  required />
              </FormField>
              <FormField label="Reorder Level (bags)">
                <input type="number" min="0" step="0.1" className="input"
                  value={editForm.reorder_bags}
                  onChange={e => setEditForm(p => ({ ...p, reorder_bags: e.target.value }))}
                />
              </FormField>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Update Inventory'}
              </button>
              <button type="button" onClick={() => setEditModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
