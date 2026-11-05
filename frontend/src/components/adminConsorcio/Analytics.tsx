import React from 'react';
import ConsorcioAnalytics from '../analytics/ConsorcioAnalytics';

/** Vista de análisis para el rol adminConsorcio (sin filtro de administradores). */
const AdminConsorcioAnalytics: React.FC = () => (
  <ConsorcioAnalytics
    hideAdminFilter
    title="Análisis financiero"
    description="Resumen operativo y financiero de tus tareas de consorcio"
  />
);

export default AdminConsorcioAnalytics;
