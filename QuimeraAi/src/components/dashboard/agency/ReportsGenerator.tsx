/**
 * ReportsGenerator
 * Tool for generating performance reports for sub-clients
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { toast } from 'react-hot-toast';
import { Loader2, FileText, Download, Calendar, Users, BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubClient {
  id: string;
  name: string;
  status: string;
}

export function ReportsGenerator() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const functions = getFunctions();

  const [loading, setLoading] = useState(false);
  const [subClients, setSubClients] = useState<SubClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'leads',
    'visits',
    'sales',
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('executive');
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  useEffect(() => {
    loadSubClients();
  }, [currentTenant]);

  const loadSubClients = async () => {
    if (!currentTenant) return;

    try {
      // TODO: Replace with actual query from Firestore
      // Mock data for now
      setSubClients([]);
    } catch (error: any) {
      console.error('Error loading sub-clients:', error);
      toast.error('Error al cargar clientes');
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const generateReport = httpsCallable(functions, 'reports-generateConsolidated');
      const result = await generateReport({
        clientIds: selectAll ? subClients.map(c => c.id) : selectedClients,
        dateRange,
        metrics: selectedMetrics,
        template: selectedTemplate
      });

      setGeneratedReport(result.data);
      toast.success('Reporte generado exitosamente');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Selección de Clientes
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <label className="flex items-center gap-2 p-2 hover:bg-muted rounded">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => setSelectAll(e.target.checked)}
              />
              <span>Todos los clientes</span>
            </label>
            {subClients.map(client => (
              <label key={client.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded ml-4">
                <input
                  type="checkbox"
                  checked={selectAll || selectedClients.includes(client.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClients(prev => [...prev, client.id]);
                    } else {
                      setSelectedClients(prev => prev.filter(id => id !== client.id));
                      setSelectAll(false);
                    }
                  }}
                  disabled={selectAll}
                />
                <span>{client.name}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Configuración del Periodo
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Fecha Inicio</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Fecha Fin</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="px-12"
          onClick={handleGenerateReport}
          disabled={loading || (!selectAll && selectedClients.length === 0)}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <FileText className="w-5 h-5 mr-2" />
          )}
          Generar Reporte Consolidado
        </Button>
      </div>

      {generatedReport && (
        <Card className="p-6 border-green-200 bg-green-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900">Reporte Listo</h4>
                <p className="text-sm text-green-700">El reporte consolidado se ha generado correctamente.</p>
              </div>
            </div>
            <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
              Descargar PDF
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
