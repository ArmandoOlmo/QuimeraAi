import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Bot,
  CheckCircle2,
  DollarSign,
  Globe2,
  LayoutTemplate,
  Link,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
} from 'lucide-react';
import AdminViewLayout from './AdminViewLayout';

interface AdminRealtyEngineControlProps {
  onBack: () => void;
}

const appControlItems = [
  { key: 'availability', icon: Settings },
  { key: 'prompts', icon: Bot },
  { key: 'templates', icon: LayoutTemplate },
  { key: 'integrations', icon: Link },
  { key: 'payments', icon: DollarSign },
  { key: 'analytics', icon: BarChart3 },
] as const;

const projectControlItems = [
  { key: 'engine', icon: Workflow },
  { key: 'imports', icon: Globe2 },
  { key: 'sync', icon: Link },
  { key: 'settings', icon: Settings },
] as const;

const userWorkspaceItems = [
  { key: 'listings', icon: Globe2 },
  { key: 'leads', icon: Users },
  { key: 'openHouses', icon: CheckCircle2 },
  { key: 'campaigns', icon: Bot },
] as const;

const AdminRealtyEngineControl: React.FC<AdminRealtyEngineControlProps> = ({ onBack }) => {
  const { t } = useTranslation();

  const renderControlGrid = (
    area: 'appControls' | 'projectControls' | 'userWorkspace',
    items: readonly { key: string; icon: React.ComponentType<{ size?: number; className?: string }> }[]
  ) => (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="rounded-lg border border-q-border bg-q-bg p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-q-border bg-q-surface text-q-accent">
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-q-text">{t(`superadmin.realtyEngine.${area}.items.${item.key}.title`)}</h3>
                <p className="mt-1 text-sm leading-6 text-q-text-secondary">{t(`superadmin.realtyEngine.${area}.items.${item.key}.description`)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <AdminViewLayout title={t('superadmin.realtyEngine.title')} onBack={onBack} icon={<Workflow size={20} />}>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-lg border border-q-border bg-q-bg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-q-text-secondary">
                <ShieldCheck size={14} className="text-q-accent" />
                {t('superadmin.realtyEngine.badge')}
              </div>
              <h1 className="mt-4 text-2xl font-bold text-q-text">{t('superadmin.realtyEngine.heading')}</h1>
              <p className="mt-2 text-sm leading-6 text-q-text-secondary">{t('superadmin.realtyEngine.subtitle')}</p>
            </div>
            <div className="rounded-lg border border-q-warning/30 bg-q-warning/10 p-4 text-sm leading-6 text-q-text-secondary lg:max-w-sm">
              <p className="font-semibold text-q-text">{t('superadmin.realtyEngine.ruleTitle')}</p>
              <p className="mt-1">{t('superadmin.realtyEngine.ruleDescription')}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('superadmin.realtyEngine.appControls.label')}</p>
            <h2 className="mt-1 text-lg font-bold text-q-text">{t('superadmin.realtyEngine.appControls.title')}</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-q-text-secondary">{t('superadmin.realtyEngine.appControls.description')}</p>
          </div>
          {renderControlGrid('appControls', appControlItems)}
        </section>

        <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('superadmin.realtyEngine.projectControls.label')}</p>
            <h2 className="mt-1 text-lg font-bold text-q-text">{t('superadmin.realtyEngine.projectControls.title')}</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-q-text-secondary">{t('superadmin.realtyEngine.projectControls.description')}</p>
          </div>
          {renderControlGrid('projectControls', projectControlItems)}
        </section>

        <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('superadmin.realtyEngine.userWorkspace.label')}</p>
            <h2 className="mt-1 text-lg font-bold text-q-text">{t('superadmin.realtyEngine.userWorkspace.title')}</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-q-text-secondary">{t('superadmin.realtyEngine.userWorkspace.description')}</p>
          </div>
          {renderControlGrid('userWorkspace', userWorkspaceItems)}
        </section>
      </div>
    </AdminViewLayout>
  );
};

export default AdminRealtyEngineControl;
