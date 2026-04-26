import { useState } from 'react'
import { CATEGORIES } from '../utils/calculations'

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  date: new Date().toISOString().slice(0, 10),
}

export default function TransactionForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const categories = CATEGORIES[form.type]

  const validate = () => {
    const newErrors = {}
    if (!form.description.trim()) newErrors.description = 'Requerido'
    if (!form.amount || Number(form.amount) <= 0) newErrors.amount = 'Debe ser mayor a 0'
    if (!form.category) newErrors.category = 'Requerido'
    if (!form.date) newErrors.date = 'Requerido'
    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({ ...form, amount: Number(form.amount) })
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const handleChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'type') updated.category = ''
      return updated
    })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {['expense', 'income'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleChange('type', t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              form.type === t
                ? t === 'expense'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-gray-100 text-gray-500 border-2 border-transparent'
            }`}
          >
            {t === 'expense' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="input-field"
          placeholder="Ej: Supermercado"
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          className="input-field"
          placeholder="0"
          min="0"
          step="0.01"
        />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          value={form.category}
          onChange={(e) => handleChange('category', e.target.value)}
          className="input-field"
        >
          <option value="">Seleccionar...</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => handleChange('date', e.target.value)}
          className="input-field"
        />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1">
          Agregar
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
