import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Header unificado Seprogar para pantallas de la app.
 */
const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  eyebrow = 'Administración',
  icon,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-2">
            {eyebrow}
          </p>
        )}

        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50/80 dark:bg-blue-900/25 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {icon}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate leading-tight">
            {title}
          </h1>
        </div>

        {description && (
          <p className={`mt-1.5 text-sm text-slate-500 dark:text-slate-400 ${icon ? 'sm:pl-[3.25rem]' : ''}`}>
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

export default AdminPageHeader;
