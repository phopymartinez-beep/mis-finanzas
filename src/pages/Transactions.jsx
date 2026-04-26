import { useState, useMemo } from 'react'
import { Plus, X, Search } from 'lucide-react'
import { useTransactions } from '../hooks/useTransactions'
import TransactionList from '../components/TransactionList'
import TransactionForm from '../components/TransactionForm'
import { CATEGORIES } from '../utils/calculations'

const ALL_CATEGORIES = ['Todos', ...CATEGORIES.expense, ...CATEGORIES.income]

export default function Transactions() {
  const { transactions, addTransaction, deleteTransaction } = useTransactions()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('Todos')

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase())
      const matchesType = filterType === 'all' || t.type === filterType
      const matchesCategory = filterCategory === 'Todos' || t.category === filterCategory
      return matchesSearch && matchesType && matchesCategory
    })
  }, [transactions, search, filterType, filterCategory])

  const handleAdd = (tx) => {
    addTransaction(tx)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar transacción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-field sm:w-40"
        >
          <option value="all">Todos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field sm:w-44"
        >
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cerrar' : 'Nueva transacción'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Nueva transacción</h2>
          <TransactionForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            {filtered.length} transacciones
          </h2>
        </div>
        <TransactionList transactions={filtered} onDelete={deleteTransaction} />
      </div>
    </div>
  )
}
