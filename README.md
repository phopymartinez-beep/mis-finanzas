# Mis Finanzas

App de finanzas personales construida con React + Vite + Tailwind CSS.

## Funcionalidades

- **Dashboard**: resumen de balance, ingresos, gastos y gráficos
- **Transacciones**: listado con filtros por tipo y categoría
- **Presupuesto**: límites mensuales por categoría con barra de progreso
- **Reportes**: gráficos de evolución mensual y distribución por categoría

## Stack

- React 18 + Vite
- Tailwind CSS
- React Router v6
- Recharts (gráficos)
- date-fns
- lucide-react (iconos)
- localStorage (persistencia)

## Desarrollo local

```bash
npm install
npm run dev
```

## Deploy en Vercel

Conectar el repositorio en [vercel.com](https://vercel.com). El archivo `vercel.json` ya configura el redirect para SPA.

- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`
