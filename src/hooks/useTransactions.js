import { useLocalStorage } from './useLocalStorage'
import { calculateTotals } from '../utils/calculations'

const SAMPLE_TRANSACTIONS = [
  { id: '1', description: 'Salario', amount: 85000, type: 'income', category: 'Trabajo', date: '2026-04-01' },
  { id: '2', description: 'Alquiler', amount: 25000, type: 'expense', category: 'Vivienda', date: '2026-04-05' },
  { id: '3', description: 'Supermercado', amount: 8500, type: 'expense', category: 'Alimentación', date: '2026-04-10' },
  { id: '4', description: 'Transporte', amount: 3200, type: 'expense', category: 'Transporte', date: '2026-04-12' },
  { id: '5', description: 'Freelance', amount: 15000, type: 'income', category: 'Trabajo', date: '2026-04-15' },
  { id: '6', description: 'Restaurante', amount: 2800, type: 'expense', category: 'Alimentación', date: '2026-04-18' },
  { id: '7', description: 'Netflix', amount: 1600, type: 'expense', category: 'Entretenimiento', date: '2026-04-20' },
  { id: '8', description: 'Gimnasio', amount: 3500, type: 'expense', category: 'Salud', date: '2026-04-22' },
]

export function useTransactions() {
  const [transactions, setTransactions] = useLocalStorage('transactions', SAMPLE_TRANSACTIONS)

  const addTransaction = (transaction) => {
    const newTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
    }
    setTransactions((prev) => [newTransaction, ...prev])
  }

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const updateTransaction = (id, updates) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    )
  }

  const totals = calculateTotals(transactions)

  return {
    transactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    ...totals,
  }
}
