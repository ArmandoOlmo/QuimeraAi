/**
 * Agency Reports Generator
 * Generate consolidated reports across multiple sub-clients
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { toast } from 'react-hot-toast';
import {
  Loader2,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
} from 'lucide-react';

interface ReportMetric {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface SubClient {
  id: string;
  name: string;
  status: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
}

const AVAILABLE_METRICS: ReportMetric[] = [
  {
    id: 'leads',
    label: 'Leads',
    description: 'Leads capturados, convertidos y por fuente',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'visits',
    label: 'Visitas Web',
    description: 'Tráfico, páginas vistas y bounce rate',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: 'sales',
    label: 'Ventas',
    description: 'Órdenes, ingresos y ticket promedio',
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    id: 'emails',
    label: 'Email Marketing',
    description: 'Campañas enviadas, aperturas y clicks',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'ai_usage',
    label: 'Uso de AI',
    description: 'Créditos consumidos y storage utilizado',
    icon: <Eye className="w-4 h-4" />,
  },
];

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'executive',
    name: 'Resumen Ejecutivo',
    description: 'Vista general con KPIs principales y tendencias',
  },
  {
    id: 'detailed',
    name: 'Reporte Detallado',
    description: 'Análisis completo con gráficos y tablas por cliente',
  },
  {
    id: 'comparison',
    name: 'Comparativa de Clientes',
    description: 'Comparación side-by-side entre todos los clientes',
  },
];

export function ReportsGenerator() {
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
      // const clientsQuery = query(
      //   collection(db, 'tenants'),
      //   where('ownerTenantId', '==', currentTenant.id),
      //   where('status', 'in', ['active', 'trial'])
      // );
      // const clientsSnapshot = await getDocs(clientsQuery);
      // setSubClients(clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Mock data for now
      setSubClients([]);
    } catch (error: any) {
      console.error('Error loading sub-clients:', error);
      toast.error('Error al cargar clientes');
    }
  };

  const handleToggleClient = (clientId: string) => {
    setSelectAll(false);
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleToggleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedClients([]);
    }
  };

  const handleToggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleGenerateReport = async () => {
    if (selectedMetrics.length === 0) {
      toast.error('Selecciona al menos una métrica');
      return;
    }

    try {
      setLoading(true);
      const generate = httpsCallable(functions, 'agencyReports-generate');
      const result = await generate({
        agencyTenantId: currentTenant?.id,
        clientIds: selectAll ? [] : selectedClients,
        dateRange,
        metrics: selectedMetrics,
        template: selectedTemplate,
      }) as any;

      setGeneratedReport(result.data);
      toast.success('Reporte generado exitosamente');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Error al generar reporte: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedReport) return;

    // TODO: Implement PDF download
    // This would typically call a separate function to generate PDF from the report data
    toast.info('Descarga de PDF no implementada aún');
  };

  const handleExportCSV = () => {
    if (!generatedReport) return;

    // Convert report data to CSV
    const csvContent = convertReportToCSV(generatedReport.reportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `reporte-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV exportado exitosamente');
  };

  const convertReportToCSV = (reportData: any): string => {
    if (!reportData || !reportData.byClient) return '';

    const headers = ['Cliente', 'Leads', 'Visitas', 'Ventas', 'Conversión %'];
    const rows = reportData.byClient.map((client: any) => [
      client.name,
      client.leads || 0,
      client.visits || 0,
      client.sales || 0,
      client.leads > 0
        ? ((client.leadsConverted / client.leads) * 100).toFixed(2)
        : '0',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Generador de Reportes
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Genera reportes consolidados de tus sub-clientes
        </p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Selection */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Clientes
            </h3>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleToggleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Todos los clientes ({subClients.length})
                </span>
              </label>

              {!selectAll && (
                <div className="pl-6 space-y-2 max-h-64 overflow-y-auto">
                  {subClients.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No hay sub-clientes disponibles
                    </p>
                  ) : (
                    subClients.map((client) => (
                      <label key={client.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => handleToggleClient(client.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {client.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Date Range */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Período
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Quick select buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date(end);
                    start.setDate(end.getDate() - 7);
                    setDateRange({
                      start: start.toISOString().split('T')[0],
                      end: end.toISOString().split('T')[0],
                    });
                  }}
                >
                  Última semana
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date(end);
                    start.setMonth(end.getMonth() - 1);
                    setDateRange({
                      start: start.toISOString().split('T')[0],
                      end: end.toISOString().split('T')[0],
                    });
                  }}
                >
                  Último mes
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Metrics Selection */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Métricas
            </h3>

            <div className="space-y-3">
              {AVAILABLE_METRICS.map((metric) => (
                <label
                  key={metric.id}
                  className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={() => handleToggleMetric(metric.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      {metric.icon}
                      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {metric.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {metric.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Template Selection */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Plantilla de Reporte
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REPORT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {template.name}
                  </h4>
                  {selectedTemplate === template.id && (
                    <Badge variant="primary">Seleccionado</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Generate Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleGenerateReport}
          disabled={loading || selectedMetrics.length === 0}
          className="flex-1 md:flex-initial"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generar Reporte
            </>
          )}
        </Button>

        {generatedReport && (
          <>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </>
        )}
      </div>

      {/* Report Preview */}
      {generatedReport && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Vista Previa del Reporte
            </h3>

            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                    Total Clientes
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {generatedReport.reportData?.summary?.totalClients || 0}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                    Total Leads
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {generatedReport.reportData?.summary?.totalLeads || 0}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                    Total Visitas
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {generatedReport.reportData?.summary?.totalVisits || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
                    Total Ingresos
                  </p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                    ${generatedReport.reportData?.summary?.totalRevenue?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {generatedReport.reportData?.recommendations?.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Recomendaciones
                  </h4>
                  <ul className="space-y-2">
                    {generatedReport.reportData.recommendations.map(
                      (rec: string, index: number) => (
                        <li
                          key={index}
                          className="text-sm text-amber-800 dark:text-amber-200"
                        >
                          • {rec}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
