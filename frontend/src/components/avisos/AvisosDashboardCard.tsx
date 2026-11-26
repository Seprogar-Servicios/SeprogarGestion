import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ArrowRight } from 'lucide-react';
import api from '../../config/api';
import { type Aviso, estaVigente, formatVencimiento } from './avisosUtils';

/** Sección llamativa de avisos vigentes (solo admin / super admin). No renderiza si no hay avisos. */
const AvisosDashboardCard: React.FC = () => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ success: boolean; data: Aviso[] }>('/avisos/activos')
      .then((res) => {
        if (!cancelled) setAvisos((res.data.data || []).filter((a) => estaVigente(a)));
      })
      .catch(() => {
        if (!cancelled) setAvisos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (avisos.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-300 dark:border-amber-600 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-rose-900/20 shadow-md p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-amber-500 text-white shadow-sm">
            <Bell className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Avisos importantes
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500 text-white">
            {avisos.length}
          </span>
        </div>
        <Link
          to="/admin/avisos"
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
        >
          Gestionar
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {avisos.map((aviso) => (
          <article
            key={aviso._id}
            className="rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-200 dark:border-amber-700/60 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">{aviso.titulo}</h3>
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                {formatVencimiento(aviso.venceAt)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {aviso.mensaje}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AvisosDashboardCard;
