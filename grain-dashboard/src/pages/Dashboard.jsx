import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import {
  TrendingUp, ShoppingCart, Package, Wallet,
  AlertTriangle, Users, UserCheck, ArrowRight
} from 'lucide-react'
import api from '../utils/api'
import { fmt } from '../utils/format'
import { StatCard, Spinner, PageHeader, Badge } from '../components/ui'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e2414', border: '1px solid #28301b', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#b5c29d' },
  itemStyle: { color: '#e8bf7a' },
}

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [trend,   setTrend]   = useState([])
  const [profit,  setProfit]  = useState([])
  const [period,  setPeriod]  = useState('30')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/dashboard/overview?period=${period}`),
      api.get(`/dashboard/sales-trend?period=${period}`),
      api.get('/dashboard/profit-by-grain'),
    ]).then(([ov, tr, pr]) => {
      setData(ov.data.data)
      setTrend(tr.data.data.map(d => ({ ...d, revenue: Number(d.revenue) })))
      setProfit(pr.data.data.map(d => ({
        grain: d.grain,
        cost:  Number(d.total_buy_cost),
        revenue: Number(d.total_sell_revenue),
        profit:  Number(d.gross_profit),
      })))
    }).finally(() => setLoading(false))
  }, [period])

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size={28} /></div>
  )

  const k = data?.kpis || {}

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`Overview for the last ${period} days`}
        action={
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="input w-36"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue"    value={fmt.currency(k.total_revenue)}    sub={`${k.total_sales} sales`}          icon={TrendingUp}  color="earth" delay={0}   />
        <StatCard label="Purchase Cost"    value={fmt.currency(k.total_purchase_cost)} sub={`${k.total_purchases} orders`}   icon={ShoppingCart} color="grain" delay={75}  />
        <StatCard label="Gross Profit"     value={fmt.currency(k.gross_profit)}     sub={`${fmt.pct(k.profit_margin_pct)} margin`} icon={Wallet} color={k.gross_profit >= 0 ? 'earth' : 'red'} delay={150} />
        <StatCard label="Stock"            value={fmt.kg(k.total_stock_kg)}         sub={`${k.grain_types_in_stock} grain types`} icon={Package} color="grain" delay={225} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Receivables"   value={fmt.currency(k.outstanding_receivables)} sub="from buyers"     icon={Users}      color="blue" delay={0}   />
        <StatCard label="Payables"      value={fmt.currency(k.outstanding_payables)}    sub="to suppliers"    icon={UserCheck}  color="red"  delay={75}  />
        <StatCard label="Low Stock"     value={k.low_stock_alerts}                      sub="alerts active"   icon={AlertTriangle} color={k.low_stock_alerts > 0 ? 'red' : 'grain'} delay={150} />
        <StatCard label="Collected"     value={fmt.currency(k.total_collected)}         sub="cash received"   icon={Wallet}     color="grain" delay={225} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Revenue Trend */}
        <div className="card p-5">
          <h3 className="section-title mb-5">Revenue Trend</h3>
          {trend.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-grain-600 text-sm">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d4852a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4852a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#28301b" />
                <XAxis dataKey="date" stroke="#4a5935" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                <YAxis stroke="#4a5935" tick={{ fontSize: 11 }} tickFormatter={v => `₵${(v/1000).toFixed(0)}k`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmt.currency(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#d4852a" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit by Grain */}
        <div className="card p-5">
          <h3 className="section-title mb-5">Profit by Grain</h3>
          {profit.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-grain-600 text-sm">No transaction data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={profit} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#28301b" />
                <XAxis type="number" stroke="#4a5935" tick={{ fontSize: 11 }} tickFormatter={v => `₵${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="grain" stroke="#4a5935" tick={{ fontSize: 11 }} width={70} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmt.currency(v)]} />
                <Bar dataKey="cost"    fill="#4a5935" name="Cost"    radius={[0,2,2,0]} />
                <Bar dataKey="revenue" fill="#d4852a" name="Revenue" radius={[0,2,2,0]} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#798d58' }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Recent Sales</h3>
            <Link to="/sales" className="text-xs text-grain-500 hover:text-earth-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {!data?.recent_sales?.length ? (
            <p className="text-grain-600 text-sm text-center py-8">No sales yet</p>
          ) : (
            <div className="space-y-2">
              {data.recent_sales.map(s => {
                const st = fmt.status(s.status)
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-earth-200">{s.buyer}</div>
                      <div className="text-xs text-grain-500">{s.reference} · {fmt.date(s.sale_date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-earth-300">{fmt.currency(s.total_amount)}</div>
                      <span className={st.cls}>{st.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Recent Purchases</h3>
            <Link to="/purchases" className="text-xs text-grain-500 hover:text-earth-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {!data?.recent_purchases?.length ? (
            <p className="text-grain-600 text-sm text-center py-8">No purchases yet</p>
          ) : (
            <div className="space-y-2">
              {data.recent_purchases.map(p => {
                const st = fmt.status(p.status)
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-earth-200">{p.supplier}</div>
                      <div className="text-xs text-grain-500">{p.reference} · {fmt.date(p.purchase_date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-earth-300">{fmt.currency(p.total_amount)}</div>
                      <span className={st.cls}>{st.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
