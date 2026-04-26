import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Wallet, Plus, X } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import StatCard from '../components/StatCard'
import TransactionList from '../components/TransactionList'
import TransactionForm from '../components/TransactionForm'
import { formatCurrency } from '../utils/formatters'
import { groupByCategory, groupByMonth, CATEGORY_COLORS } from '../utils/calculations'

export default function Dashboard() {
  const { transactions, totalIncome, totalExpenses, balance, addTransaction, deleteTransaction } =
    useTransactions()
  const [showForm, setShowForm] = useState(false)

  const expenseByCategory = groupByCategory(transactions, 'expense')
  const monthlyData = groupByMonth(transactions).slice(-6)

  const handleAdd = (tx) => {
    addTransaction(tx)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Balance" value={formatCurrency(balance)} icon={Wallet} color="blue" />
        <StatCard title="Ingresos del mes" value={formatCurrency(totalIncome)} icon={TrendingUp} color="green" />
        <StatCard title="Gastos del mes" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Ingresos vs Gastos</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Gastos por categoría</h2>
          {expenseByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {expenseByCategory.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1.5">
                {expenseByCategory.slice(0, 5).map((item) => (
                  <li key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[item.name] ?? '#94a3b8' }}
                      />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">{formatCurrency(item.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Últimas transacciones</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-1.5 text-sm py-1.5">
              {showForm ? <X size={15} /> : <Plus size={15} />}
              {showForm ? 'Cerrar' : 'Nueva'}
            </button>
            <Link to="/transactions" className="btn-secondary text-sm py-1.5">
              Ver todas
            </Link>
          </div>
        </div>

        {showForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <TransactionForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
          </div>
        )}

        <TransactionList transactions={transactions} onDelete={deleteTransaction} limit={5} />
      </div>
    </div>
  )
}
