import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { groupByCategory, groupByMonth, CATEGORY_COLORS } from '../utils/calculations'
import { formatCurrency } from '../utils/formatters'

export default function Reports() {
  const { transactions, totalIncome, totalExpenses, balance } = useTransactions()

  const expenseByCategory = groupByCategory(transactions, 'expense')
  const incomeByCategory = groupByCategory(transactions, 'income')
  const monthlyData = groupByMonth(transactions)

  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total ingresos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total gastos</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Tasa de ahorro</p>
          <p className={`text-2xl font-bold mt-1 ${Number(savingsRate) >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
            {savingsRate}%
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Evolución mensual</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Legend />
            <Line type="monotone" dataKey="income" name="Ingresos" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f87171" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Gastos por categoría</h2>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={expenseByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" name="Monto" radius={[0, 4, 4, 0]}>
                  {expenseByCategory.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Distribución de ingresos</h2>
          {incomeByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={incomeByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {incomeByCategory.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
          )}
        </div>
      </div>
    </div>
  )
}
