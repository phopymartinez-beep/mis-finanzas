import { Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/formatters'
import { CATEGORY_COLORS } from '../utils/calculations'

export default function TransactionList({ transactions, onDelete, limit }) {
  const displayed = limit ? transactions.slice(0, limit) : transactions

  if (displayed.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">No hay transacciones registradas.</p>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {displayed.map((t) => (
        <div key={t.id} className="flex items-center justify-between py-3 group">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[t.category] ?? '#94a3b8' }}
            />
            <div>
              <p className="text-sm font-medium text-gray-800">{t.description}</p>
              <p className="text-xs text-gray-400">
                {t.category} · {formatDate(t.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-semibold ${
                t.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {t.type === 'income' ? '+' : '-'}
              {formatCurrency(t.amount)}
            </span>
            {onDelete && (
              <button
                onClick={() => onDelete(t.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                aria-label="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
