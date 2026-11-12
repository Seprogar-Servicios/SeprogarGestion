import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Percent,
  ShieldAlert,
  Users,
  Wallet,
  Building2,
  Briefcase,
  Clock,
} from 'lucide-react';
import SimpleCategoryChart from './SimpleCategoryChart';
import type { MonthlyCloseSummary, QualitySummary } from '../../utils/analyticsHelpers';
import { formatMoney } from '../../utils/analyticsHelpers';

const ChartCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
      {icon}
      {title}
    </h2>
    <div className="h-72">{children}</div>
  </div>
);

const Kpi: React.FC<{
  title: string;
  value: string | number;
  hint?: string;
  color: string;
  icon: React.ElementType;
}> = ({ title, value, hint, color, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-slate-500">{title}</span>
      <div className={`${color} rounded-lg p-2`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  </div>
);

type Props = {
  close: MonthlyCloseSummary;
  quality: QualitySummary;
};

const QualityAnalyticsPanel: React.FC<Props> = ({ close, quality }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
          Cierre del período
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi
            title="Servicios"
            value={close.servicios}
            icon={ClipboardList}
            color="bg-blue-500"
          />
          <Kpi
            title="Cierre"
            value={`${close.cierreRate}%`}
            hint={`${close.completadas} ok`}
            icon={CheckCircle}
            color="bg-emerald-500"
          />
          <Kpi
            title="Ingresos"
            value={formatMoney(close.ingresos)}
            icon={Wallet}
            color="bg-indigo-500"
          />
          <Kpi
            title="Margen real"
            value={formatMoney(close.margenOperativo)}
            hint={`${close.margenPct}% · ganancia/futurgas`}
            icon={Percent}
            color="bg-teal-500"
          />
          <Kpi
            title="Ticket prom."
            value={formatMoney(close.ticketPromedio)}
            hint="s/ completadas"
            icon={Wallet}
            color="bg-sky-500"
          />
          <Kpi
            title="Top-2 cuentas"
            value={`${close.top2ConcentracionPct}%`}
            hint="concentración"
            icon={Building2}
            color="bg-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Mano de obra (precio)</p>
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
            {formatMoney(close.costoManoObra)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Materiales (precio liq.)</p>
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
            {formatMoney(close.costoMateriales)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Costo real (pago + mat. real)</p>
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
            {formatMoney(close.costoReal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Pago a técnicos</p>
          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
            {formatMoney(close.pagoTecnico)}
          </p>
        </div>
      </div>

      {close.gapsRegistro.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 p-4">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" />
            Brechas de registro (no bloquean la operación)
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-amber-900/90 dark:text-amber-100/90">
            {close.gapsRegistro.map((g) => (
              <li key={g.label}>
                {g.label}: <strong>{g.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Servicios por cuenta" icon={<Building2 className="h-4 w-4 text-teal-500" />}>
          <SimpleCategoryChart
            items={close.byCuenta.map((c) => ({ label: c.label, count: c.count }))}
            color="#14b8a6"
            datasetLabel="Servicios"
          />
        </ChartCard>
        <ChartCard title="Por especialidad" icon={<Briefcase className="h-4 w-4 text-indigo-500" />}>
          <SimpleCategoryChart items={close.byEspecialidad} color="#6366f1" />
        </ChartCard>
        <ChartCard title="Carga por técnico" icon={<Users className="h-4 w-4 text-orange-500" />}>
          <SimpleCategoryChart items={close.byTecnico} color="#f97316" />
        </ChartCard>
        <ChartCard
          title="Ingresos por cuenta"
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
        >
          <SimpleCategoryChart
            items={close.byCuenta.map((c) => ({
              label: c.label,
              count: Math.round(c.ingresos),
            }))}
            color="#10b981"
            datasetLabel="Ingresos"
            formatValue={(v) => formatMoney(v)}
          />
        </ChartCard>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
          Calidad y reclamos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <Kpi
            title="Reclamos"
            value={quality.reclamos}
            icon={ShieldAlert}
            color="bg-rose-500"
          />
          <Kpi
            title="Tasa s/ servicios"
            value={`${quality.tasaReclamo}%`}
            hint="todos los estados"
            icon={Percent}
            color="bg-red-500"
          />
          <Kpi
            title="Tasa s/ completadas"
            value={`${quality.tasaReclamoSobreCompletadas}%`}
            hint="cohorte útil"
            icon={Percent}
            color="bg-orange-500"
          />
          <Kpi
            title="Resueltos"
            value={quality.resueltos}
            hint={`${quality.tasaResolucion}%`}
            icon={CheckCircle}
            color="bg-green-500"
          />
          <Kpi title="Abiertos" value={quality.abiertos} icon={AlertTriangle} color="bg-amber-500" />
          <Kpi
            title="MTTR"
            value={quality.mttrHoras > 0 ? `${quality.mttrHoras}h` : '—'}
            hint="tiempo resolución"
            icon={Clock}
            color="bg-purple-500"
          />
        </div>

        {quality.alertas.length > 0 && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/70 dark:bg-rose-950/20 p-4 mb-4">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-200 mb-2">
              Alertas automáticas
            </p>
            <ul className="space-y-1 text-sm text-rose-900/90 dark:text-rose-100/90">
              {quality.alertas.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          </div>
        )}

        {quality.reclamos === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-6 text-center text-sm text-slate-500">
            Todavía no hay reclamos en el período. Registralos en{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">Reclamos</span> del menú
            para activar tasas por cuenta/técnico/motivo.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Reclamos por cuenta"
              icon={<Building2 className="h-4 w-4 text-rose-500" />}
            >
              <SimpleCategoryChart
                items={quality.byCuenta.map((c) => ({ label: c.label, count: c.count }))}
                color="#f43f5e"
              />
            </ChartCard>
            <ChartCard
              title="Reclamos por motivo"
              icon={<ClipboardList className="h-4 w-4 text-violet-500" />}
            >
              <SimpleCategoryChart items={quality.byMotivo} color="#8b5cf6" />
            </ChartCard>
            <ChartCard
              title="Tasa de reclamo por técnico (%)"
              icon={<Users className="h-4 w-4 text-orange-500" />}
            >
              <SimpleCategoryChart
                items={quality.byTecnico.map((t) => ({ label: t.label, count: t.tasa }))}
                color="#ea580c"
                datasetLabel="Tasa %"
              />
            </ChartCard>
            <ChartCard
              title="Volumen de reclamos por técnico"
              icon={<Users className="h-4 w-4 text-slate-500" />}
            >
              <SimpleCategoryChart
                items={quality.byTecnico.map((t) => ({ label: t.label, count: t.count }))}
                color="#64748b"
              />
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityAnalyticsPanel;
