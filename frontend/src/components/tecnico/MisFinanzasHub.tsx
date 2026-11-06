import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DollarSign, FileText, Wallet } from 'lucide-react';
import AdminPageHeader from '../common/AdminPageHeader';
import HubTabs from '../common/HubTabs';
import TecnicoLiquidaciones from '../user/TecnicoLiquidaciones';
import MisPagosManuales from './MisPagosManuales';
import MisRecibos from '../recibos/tecnico/MisRecibos';

type TabId = 'liquidaciones' | 'pagos' | 'recibos';

const MisFinanzasHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('tab');
  const initial: TabId =
    q === 'pagos' || q === 'recibos' || q === 'liquidaciones' ? q : 'liquidaciones';
  const [tab, setTab] = useState<TabId>(initial);

  useEffect(() => {
    const next = searchParams.get('tab');
    if (next === 'pagos' || next === 'recibos' || next === 'liquidaciones') setTab(next);
  }, [searchParams]);

  const selectTab = (id: string) => {
    const next = id as TabId;
    setTab(next);
    setSearchParams(next === 'liquidaciones' ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Mis finanzas"
        description="Liquidaciones, pagos adicionales y recibos"
        eyebrow="Técnico"
        icon={<DollarSign className="h-5 w-5" />}
      />
      <HubTabs
        tabs={[
          { id: 'liquidaciones', label: 'Liquidaciones', icon: DollarSign },
          { id: 'pagos', label: 'Pagos', icon: Wallet },
          { id: 'recibos', label: 'Recibos', icon: FileText },
        ]}
        active={tab}
        onChange={selectTab}
      />
      {tab === 'liquidaciones' && <TecnicoLiquidaciones embedded />}
      {tab === 'pagos' && <MisPagosManuales embedded />}
      {tab === 'recibos' && <MisRecibos embedded />}
    </div>
  );
};

export default MisFinanzasHub;
