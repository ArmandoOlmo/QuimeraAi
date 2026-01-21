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
    toast.info('Descarga de PDF no implementada aún');
  };

  const handleExportCSV = () => {
    if (!generatedReport) return;

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
        <h2 className="text-2xl font-bold text-foreground">
          Generador de Reportes
        </h2>
        <p className="text-muted-foreground mt-1">
          Genera reportes consolidados de tus sub-clientes
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column: Configuration (Sidebar) */}
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <div className="p-4 space-y-6">

              {/* Date Range Section */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center uppercase tracking-wider">
                  <Calendar className="w-4 h-4 mr-2" />
                  Período
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, start: e.target.value })
                      }
                      className="w-full text-sm rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, end: e.target.value })
                      }
                      className="w-full text-sm rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        const end = new Date();
                        const start = new Date(end);
                        start.setDate(end.getDate() - 7);
                        setDateRange({
                          start: start.toISOString().split('T')[0],
                          end: end.toISOString().split('T')[0],
                        });
                      }}
                      className="flex-1 text-xs py-1.5 px-2 bg-muted hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      7 días
                    </button>
                    <button
                      onClick={() => {
                        const end = new Date();
                        const start = new Date(end);
                        start.setMonth(end.getMonth() - 1);
                        setDateRange({
                          start: start.toISOString().split('T')[0],
                          end: end.toISOString().split('T')[0],
                        });
                      }}
                      className="flex-1 text-xs py-1.5 px-2 bg-muted hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      30 días
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Template Selection Section */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
                  Plantilla
                </h3>
                <div className="space-y-2">
                  {REPORT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full text-left p-3 rounded-md border transition-all ${selectedTemplate === template.id
                          ? 'border-ring bg-accent text-accent-foreground ring-1 ring-ring'
                          : 'border-border hover:border-input text-foreground hover:bg-muted'
                        }`}
                    >
                      <div className="text-sm font-medium">
                        {template.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Metrics Section */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
                  Métricas
                </h3>
                <div className="space-y-2">
                  {AVAILABLE_METRICS.map((metric) => (
                    <label
                      key={metric.id}
                      className="flex items-start p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => handleToggleMetric(metric.id)}
                        className="mt-1 rounded border-input text-primary focus:ring-ring"
                      />
                      <div className="ml-3">
                        <div className="flex items-center text-sm font-medium text-foreground">
                          <span className="mr-2 text-muted-foreground">{metric.icon}</span>
                          {metric.label}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Client Selection Section */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
                  Clientes
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center p-2 rounded hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleToggleSelectAll}
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    <span className="ml-2 text-sm text-foreground font-medium">
                      Todos ({subClients.length})
                    </span>
                  </label>

                  {!selectAll && (
                    <div className="pl-4 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                      {subClients.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic p-2">
                          No hay clientes disponibles
                        </p>
                      ) : (
                        subClients.map((client) => (
                          <label key={client.id} className="flex items-center p-1.5 rounded hover:bg-accent cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedClients.includes(client.id)}
                              onChange={() => handleToggleClient(client.id)}
                              className="rounded border-input text-primary focus:ring-ring"
                            />
                            <span className="ml-2 text-sm text-muted-foreground">
                              {client.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </Card>
        </div>

        {/* Right Column: Content & Preview */}
        <div className="xl:col-span-3 space-y-6">

          {/* Main Action Bar */}
          <Card className="border-border bg-card/50">
            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Listo para generar?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Se generará un reporte {REPORT_TEMPLATES.find(t => t.id === selectedTemplate)?.name.toLowerCase()} para {selectAll ? 'todos los clientes' : `${selectedClients.length} clientes`}.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button
                  onClick={handleGenerateReport}
                  disabled={loading || selectedMetrics.length === 0}
                  className="w-full md:w-auto shadow-lg"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      Generar Reporte
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Report Display Area */}
          {generatedReport ? (
            <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">

              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-foreground">
                  Resultados del Reporte
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>

              <Card>
                <div className="p-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-accent/20 border border-border">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Clientes</p>
                      <p className="text-2xl font-bold text-foreground">
                        {generatedReport.reportData?.summary?.totalClients || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/20 border border-border">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Leads</p>
                      <p className="text-2xl font-bold text-primary">
                        {generatedReport.reportData?.summary?.totalLeads || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/20 border border-border">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Visitas</p>
                      <p className="text-2xl font-bold text-foreground">
                        {generatedReport.reportData?.summary?.totalVisits || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/20 border border-border">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Ingresos</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                        ${generatedReport.reportData?.summary?.totalRevenue?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {generatedReport.reportData?.recommendations?.length > 0 && (
                    <div className="bg-accent/30 border border-border rounded-lg p-6">
                      <h4 className="font-semibold text-foreground mb-3 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                        Insights & Recomendaciones
                      </h4>
                      <ul className="space-y-2">
                        {generatedReport.reportData.recommendations.map(
                          (rec: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-start text-sm text-foreground"
                            >
                              <span className="mr-2 text-primary">•</span>
                              {rec}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed border-border transition-colors hover:bg-muted/30">
              <FileText className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Configura los parámetros y genera tu reporte</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
