import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tag, Wallet } from 'lucide-react';
import AdminPageHeader from '../common/AdminPageHeader';
import HubTabs from '../common/HubTabs';
import PagoManualManagement from './PagoManualManagement';
import MotivoPagoManagement from './MotivoPagoManagement';

type TabId = 'pagos' | 'motivos';

const PagosHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('tab') === 'motivos' ? 'motivos' : ('pagos' as TabId);
  const [tab, setTab] = useState<TabId>(initial);

  useEffect(() => {
    const q = searchParams.get('tab');
    if (q === 'motivos' || q === 'pagos') setTab(q);
  }, [searchParams]);

  const selectTab = (id: string) => {
    const next = id as TabId;
    setTab(next);
    setSearchParams(next === 'pagos' ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Pagos manuales"
        description="Pagos adicionales y catálogo de motivos"
        eyebrow="Finanzas"
        icon={<Wallet className="h-5 w-5" />}
      />
      <HubTabs
        tabs={[
          { id: 'pagos', label: 'Pagos', icon: Wallet },
          { id: 'motivos', label: 'Motivos', icon: Tag },
        ]}
        active={tab}
        onChange={selectTab}
      />
      {tab === 'pagos' ? <PagoManualManagement embedded /> : <MotivoPagoManagement embedded />}
    </div>
  );
};

export default PagosHub;
