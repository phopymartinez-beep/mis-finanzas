import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useTransactions } from '../hooks/useTransactions'
import { formatCurrency } from '../utils/formatters'
import { CATEGORIES } from '../utils/calculations'

const SAMPLE_BUDGETS = [
  { id: '1', category: 'Alimentación', limit: 15000 },
  { id: '2', category: 'Vivienda', limit: 30000 },
  { id: '3', category: 'Transporte', limit: 5000 },
  { id: '4', category: 'Entretenimiento', limit: 5000 },
]

export default function Budget() {
  const [budgets, setBudgets] = useLocalStorage('budgets', SAMPLE_BUDGETS)
  const { transactions } = useTransactions()
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')

  const currentMonth = new Date().toISOString().slice(0, 7)

  const spentByCategory = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount
      return acc
    }, {})

  const addBudget = () => {
    if (!newCategory || !newLimit || Number(newLimit) <= 0) return
    if (budgets.find((b) => b.category === newCategory)) return
    setBudgets((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category: newCategory, limit: Number(newLimit) },
    ])
    setNewCategory('')
    setNewLimit('')
  }

  const deleteBudget = (id) => setBudgets((prev) => prev.filter((b) => b.id !== id))

  const availableCategories = CATEGORIES.expense.filter(
    (c) => !budgets.find((b) => b.category === c)
  )

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Agregar presupuesto</h2>
        <div className="flex gap-3 flex-wrap">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="input-field flex-1 min-w-40"
          >
            <option value="">Categoría...</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Límite mensual"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            className="input-field flex-1 min-w-40"
            min="0"
          />
          <button onClick={addBudget} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((budget) => {
          const spent = spentByCategory[budget.category] ?? 0
          const pct = Math.min((spent / budget.limit) * 100, 100)
          const isOver = spent > budget.limit
          const remaining = budget.limit - spent

          return (
            <div key={budget.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-800">{budget.category}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatCurrency(spent)} de {formatCurrency(budget.limit)}
                  </p>
                </div>
                <button
                  onClick={() => deleteBudget(budget.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isOver ? 'bg-red-500' : pct > 75 ? 'bg-yellow-400' : 'bg-green-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className={`text-xs font-medium ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
                {isOver
                  ? `Excedido en ${formatCurrency(Math.abs(remaining))}`
                  : `Disponible: ${formatCurrency(remaining)}`}
              </p>
            </div>
          )
        })}
      </div>

      {budgets.length === 0 && (
        <p className="text-center text-gray-400 py-12">
          No hay presupuestos configurados. Agregá uno arriba.
        </p>
      )}
    </div>
  )
}
