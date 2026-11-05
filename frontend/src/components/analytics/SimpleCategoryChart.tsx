import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../hooks/useTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Item {
  label: string;
  count: number;
}

interface Props {
  items: Item[];
  color?: string;
  datasetLabel?: string;
  formatValue?: (value: number) => string;
  onBarClick?: (label: string, count: number) => void;
}

const SimpleCategoryChart: React.FC<Props> = ({
  items,
  color = '#00a4eb',
  datasetLabel = 'Cantidad',
  formatValue,
  onBarClick,
}) => {
  const { isDarkMode } = useTheme();
  const top = useMemo(() => items.slice(0, 8), [items]);

  if (top.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Sin datos para mostrar
      </div>
    );
  }

  const labels = top.map((i) =>
    i.label.length > 18 ? `${i.label.slice(0, 17)}…` : i.label
  );

  const data = {
    labels,
    datasets: [
      {
        label: datasetLabel,
        data: top.map((i) => i.count),
        backgroundColor: color + '99',
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    onHover: (event: any, els: unknown[]) => {
      const t = event?.native?.target as HTMLElement | undefined;
      if (t) t.style.cursor = onBarClick && els?.length ? 'pointer' : 'default';
    },
    onClick: (_: unknown, els: { index: number }[]) => {
      if (!onBarClick || !els?.length) return;
      const idx = els[0].index;
      onBarClick(top[idx].label, top[idx].count);
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => top[items[0]?.dataIndex]?.label || '',
          label: (ctx: any) => {
            const raw = Number(ctx.raw) || 0;
            const formatted = formatValue ? formatValue(raw) : String(raw);
            return `${datasetLabel}: ${formatted}`;
          },
          afterBody: () => (onBarClick ? ['', 'Clic para ver tareas'] : []),
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          callback: (value: string | number) =>
            formatValue ? formatValue(Number(value)) : value,
        },
        grid: {
          color: isDarkMode ? 'rgba(75,85,99,0.25)' : 'rgba(209,213,219,0.45)',
        },
      },
      y: {
        ticks: {
          color: isDarkMode ? '#D1D5DB' : '#4B5563',
          font: { size: 11 },
        },
        grid: { display: false },
      },
    },
  };

  return <Bar data={data} options={options as any} />;
};

export default SimpleCategoryChart;
