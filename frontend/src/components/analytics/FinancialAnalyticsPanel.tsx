import React from 'react';
import {
  DollarSign,
  Wallet,
  TrendingUp,
  FileSignature,
  Coins,
  Building2,
} from 'lucide-react';
import type { FinancialSummary } from '../../utils/analyticsHelpers';
import { formatMoney } from '../../utils/analyticsHelpers';

interface Props {
  summary: FinancialSummary;
}

const Kpi: React.FC<{
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = ({ title, value, sub, icon: Icon, accent }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4">
    <div className="flex items-start justify-between gap-2 mb-2">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <div className={`p-2 rounded-lg ${accent}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
    {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
  </div>
);

const BarRow: React.FC<{ label: string; value: number; max: number; suffix?: string }> = ({
  label,
  value,
  max,
  suffix,
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 gap-2">
      <span className="truncate">{label}</span>
      <span className="tabular-nums flex-shrink-0">
        {suffix === 'money' ? formatMoney(value) : value}
      </span>
    </div>
    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
      <div
        className="h-full rounded-full bg-blue-500/80"
        style={{ width: `${max > 0 ? Math.max(4, (value / max) * 100) : 0}%` }}
      />
    </div>
  </div>
);

const FinancialAnalyticsPanel: React.FC<Props> = ({ summary }) => {
  const maxMotivo = Math.max(...summary.pagosPorMotivo.map((m) => m.amount), 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi
          title="Presupuesto liquidado"
          value={formatMoney(summary.totalPresupuesto)}
          sub={`${summary.liquidacionesCount} liquidaciones`}
          icon={DollarSign}
          accent="bg-blue-600"
        />
        <Kpi
          title="Ganancia total"
          value={formatMoney(summary.gananciaTotal)}
          sub="Según liquidaciones"
          icon={TrendingUp}
          accent="bg-emerald-600"
        />
        <Kpi
          title="Pago a técnicos"
          value={formatMoney(summary.pagoTecnico)}
          sub="Desde liquidaciones"
          icon={Coins}
          accent="bg-orange-500"
        />
        <Kpi
          title="Futurgas"
          value={formatMoney(summary.futurgas)}
          sub="Margen empresa"
          icon={Building2}
          accent="bg-indigo-600"
        />
        <Kpi
          title="Mano de obra"
          value={formatMoney(summary.manoObra)}
          icon={Wallet}
          accent="bg-sky-600"
        />
        <Kpi
          title="Materiales (liq.)"
          value={formatMoney(summary.materiales)}
          sub={`Real: ${formatMoney(summary.materialReal)}`}
          icon={Wallet}
          accent="bg-teal-600"
        />
        <Kpi
          title="Pagos manuales"
          value={formatMoney(summary.pagosManualesTotal)}
          sub={`${summary.pagosManualesCount} egresos`}
          icon={Coins}
          accent="bg-rose-600"
        />
        <Kpi
          title="Recibos firmados"
          value={`${summary.firmaRate}%`}
          sub={`${summary.recibosFirmados}/${summary.recibosTotal} · pend. ${summary.recibosPendientes}`}
          icon={FileSignature}
          accent="bg-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
            Desglose liquidaciones
          </h3>
          <div className="space-y-2">
            <BarRow label="Cobertura" value={summary.cobertura} max={Math.max(summary.cobertura, summary.excedente, summary.materialReal, 1)} suffix="money" />
            <BarRow label="Excedente" value={summary.excedente} max={Math.max(summary.cobertura, summary.excedente, summary.materialReal, 1)} suffix="money" />
            <BarRow label="Material real" value={summary.materialReal} max={Math.max(summary.cobertura, summary.excedente, summary.materialReal, 1)} suffix="money" />
            <BarRow label="Mano de obra" value={summary.manoObra} max={Math.max(summary.manoObra, summary.materiales, 1)} suffix="money" />
            <BarRow label="Materiales" value={summary.materiales} max={Math.max(summary.manoObra, summary.materiales, 1)} suffix="money" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
            Pagos manuales por motivo
          </h3>
          {summary.pagosPorMotivo.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Sin pagos en el período</p>
          ) : (
            <div className="space-y-2">
              {summary.pagosPorMotivo.slice(0, 5).map((m) => (
                <BarRow
                  key={m.label}
                  label={`${m.label} (${m.count})`}
                  value={m.amount}
                  max={maxMotivo}
                  suffix="money"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalyticsPanel;
