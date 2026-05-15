import React from 'react';
import { ServerCog } from 'lucide-react';
import { ApiKeysManager } from '../developer/ApiKeysManager';
import AdminViewLayout from './AdminViewLayout';

interface AdminMcpManagerProps {
  onBack: () => void;
}

const AdminMcpManager: React.FC<AdminMcpManagerProps> = ({ onBack }) => {
  return (
    <AdminViewLayout
      title="MCP / API Keys"
      icon={<ServerCog size={22} />}
      onBack={onBack}
    >
      <div className="mb-6 rounded-xl border border-q-border bg-q-surface/80 px-4 py-3 shadow-sm backdrop-blur-md">
        <p className="max-w-3xl font-body text-sm font-medium leading-6 text-q-text">
          Administra las llaves que usan los agentes para conectarse al MCP de Quimera.
        </p>
      </div>
      <ApiKeysManager />
    </AdminViewLayout>
  );
};

export default AdminMcpManager;
