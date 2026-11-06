import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderOpen, Package } from 'lucide-react';
import AdminPageHeader from '../common/AdminPageHeader';
import HubTabs from '../common/HubTabs';
import MaterialManagement from './MaterialManagement';
import CategoriaMaterialManagement from './CategoriaMaterialManagement';

type TabId = 'materiales' | 'categorias';

const CatalogoHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial =
    searchParams.get('tab') === 'categorias' ? 'categorias' : ('materiales' as TabId);
  const [tab, setTab] = useState<TabId>(initial);

  useEffect(() => {
    const q = searchParams.get('tab');
    if (q === 'categorias' || q === 'materiales') setTab(q);
  }, [searchParams]);

  const selectTab = (id: string) => {
    const next = id as TabId;
    setTab(next);
    setSearchParams(next === 'materiales' ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Catálogo"
        description="Materiales y categorías en un solo lugar"
        eyebrow="Administración"
        icon={<Package className="h-5 w-5" />}
      />
      <HubTabs
        tabs={[
          { id: 'materiales', label: 'Materiales', icon: Package },
          { id: 'categorias', label: 'Categorías', icon: FolderOpen },
        ]}
        active={tab}
        onChange={selectTab}
      />
      {tab === 'materiales' ? (
        <MaterialManagement embedded />
      ) : (
        <CategoriaMaterialManagement embedded />
      )}
    </div>
  );
};

export default CatalogoHub;
