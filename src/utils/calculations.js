export function calculateTotals(transactions) {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpenses

  return { totalIncome, totalExpenses, balance }
}

export function groupByCategory(transactions, type = 'expense') {
  const filtered = transactions.filter((t) => t.type === type)
  const groups = {}

  filtered.forEach((t) => {
    if (!groups[t.category]) {
      groups[t.category] = 0
    }
    groups[t.category] += t.amount
  })

  return Object.entries(groups)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function groupByMonth(transactions) {
  const groups = {}

  transactions.forEach((t) => {
    const month = t.date.slice(0, 7)
    if (!groups[month]) {
      groups[month] = { month, income: 0, expenses: 0 }
    }
    if (t.type === 'income') {
      groups[month].income += t.amount
    } else {
      groups[month].expenses += t.amount
    }
  })

  return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month))
}

export const CATEGORIES = {
  expense: [
    'Alimentación',
    'Vivienda',
    'Transporte',
    'Salud',
    'Entretenimiento',
    'Educación',
    'Ropa',
    'Servicios',
    'Otros',
  ],
  income: ['Trabajo', 'Freelance', 'Inversiones', 'Alquiler', 'Otros'],
}

export const CATEGORY_COLORS = {
  Alimentación: '#f97316',
  Vivienda: '#8b5cf6',
  Transporte: '#06b6d4',
  Salud: '#10b981',
  Entretenimiento: '#f43f5e',
  Educación: '#3b82f6',
  Ropa: '#ec4899',
  Servicios: '#84cc16',
  Otros: '#94a3b8',
  Trabajo: '#2563eb',
  Freelance: '#7c3aed',
  Inversiones: '#059669',
  Alquiler: '#d97706',
}
