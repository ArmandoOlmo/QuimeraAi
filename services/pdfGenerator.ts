/**
 * PDFReportGenerator
 * Generate PDF reports with custom branding
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AggregatedReportData, ReportTemplate } from '../types/reports';
import type { TenantBranding } from '../types/multiTenant';

export class PDFReportGenerator {
    /**
     * Generate PDF report
     */
    async generateReport(
        reportData: AggregatedReportData,
        branding: TenantBranding,
        template: ReportTemplate
    ): Promise<Blob> {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        // Add header
        await this.addHeader(doc, branding);

        // Add content based on template
        switch (template) {
            case 'executive':
                this.addExecutiveSummary(doc, reportData);
                break;
            case 'detailed':
                this.addDetailedReport(doc, reportData);
                break;
            case 'comparison':
                this.addComparisonReport(doc, reportData);
                break;
        }

        // Add footer
        this.addFooter(doc, branding);

        return doc.output('blob');
    }

    /**
     * Add header with branding
     */
    private async addHeader(doc: jsPDF, branding: TenantBranding) {
        const pageWidth = doc.internal.pageSize.getWidth();

        // Background color header
        const primaryColor = this.hexToRgb(branding.primaryColor || '#3B82F6');
        doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(branding.companyName, 20, 20);

        // Report title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('Reporte Consolidado de Clientes', 20, 30);

        // Reset text color
        doc.setTextColor(0, 0, 0);
    }

    /**
     * Add executive summary
     */
    private addExecutiveSummary(doc: jsPDF, reportData: AggregatedReportData) {
        let yPosition = 50;

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen Ejecutivo', 20, yPosition);
        yPosition += 10;

        // Date range
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(
            `Período: ${this.formatDate(reportData.dateRange.start)} - ${this.formatDate(
                reportData.dateRange.end
            )}`,
            20,
            yPosition
        );
        yPosition += 15;
        doc.setTextColor(0, 0, 0);

        // Summary metrics
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');

        const metrics = [
            {
                label: 'Clientes Totales',
                value: reportData.summary.totalClients.toString(),
            },
            {
                label: 'Leads Generados',
                value: reportData.summary.totalLeads.toLocaleString(),
            },
            {
                label: 'Ingresos Totales',
                value: this.formatCurrency(reportData.summary.totalRevenue),
            },
            {
                label: 'Visitas al Sitio',
                value: reportData.summary.totalVisits.toLocaleString(),
            },
            {
                label: 'Emails Enviados',
                value: reportData.summary.totalEmailsSent.toLocaleString(),
            },
            {
                label: 'Tasa de Conversión Promedio',
                value: `${reportData.summary.avgConversionRate.toFixed(1)}%`,
            },
        ];

        // Display metrics in a grid
        const cols = 2;
        const colWidth = 85;
        const rowHeight = 20;

        metrics.forEach((metric, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = 20 + col * colWidth;
            const y = yPosition + row * rowHeight;

            // Box
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(249, 250, 251);
            doc.rect(x, y, colWidth - 5, 15, 'FD');

            // Label
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(metric.label, x + 3, y + 5);

            // Value
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(metric.value, x + 3, y + 12);
        });

        yPosition += Math.ceil(metrics.length / cols) * rowHeight + 15;

        // Trends section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Tendencias', 20, yPosition);
        yPosition += 10;

        const trends = reportData.trends.periodOverPeriodComparison;
        const trendItems = [
            { label: 'Crecimiento de Leads', value: trends.leadsGrowth },
            { label: 'Crecimiento de Ingresos', value: trends.revenueGrowth },
            { label: 'Crecimiento de Tráfico', value: trends.trafficGrowth },
        ];

        trendItems.forEach((item) => {
            const arrow = item.value >= 0 ? '↑' : '↓';
            const color = item.value >= 0 ? [34, 197, 94] : [239, 68, 68]; // green or red

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(item.label, 20, yPosition);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(
                `${arrow} ${Math.abs(item.value).toFixed(1)}%`,
                100,
                yPosition
            );

            yPosition += 7;
        });

        yPosition += 10;

        // Top performing clients
        if (reportData.trends.topPerformingClients.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Top 5 Clientes', 20, yPosition);
            yPosition += 10;

            autoTable(doc, {
                startY: yPosition,
                head: [['Cliente', 'Métrica', 'Valor']],
                body: reportData.trends.topPerformingClients.map((c) => [
                    c.clientName,
                    c.metric,
                    c.metric.includes('Ingreso')
                        ? this.formatCurrency(c.value)
                        : c.value.toLocaleString(),
                ]),
                theme: 'grid',
                headStyles: {
                    fillColor: [59, 130, 246],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                },
                styles: { fontSize: 10 },
            });

            yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        // Recommendations
        if (reportData.recommendations.length > 0) {
            // Check if we need a new page
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Recomendaciones', 20, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            reportData.recommendations.forEach((rec, index) => {
                const lines = doc.splitTextToSize(
                    `${index + 1}. ${rec}`,
                    doc.internal.pageSize.getWidth() - 40
                );
                doc.text(lines, 20, yPosition);
                yPosition += lines.length * 6 + 3;
            });
        }
    }

    /**
     * Add detailed report
     */
    private addDetailedReport(doc: jsPDF, reportData: AggregatedReportData) {
        let yPosition = 50;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte Detallado por Cliente', 20, yPosition);
        yPosition += 15;

        // Client table
        const tableData = reportData.byClient.map((client) => [
            client.clientName,
            client.totalLeads.toLocaleString(),
            client.totalVisits.toLocaleString(),
            this.formatCurrency(client.totalRevenue),
            `${client.conversionRate.toFixed(1)}%`,
            `${client.openRate.toFixed(1)}%`,
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [['Cliente', 'Leads', 'Visitas', 'Ingresos', 'Conv. %', 'Email Open %']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 25, halign: 'right' },
                2: { cellWidth: 25, halign: 'right' },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 20, halign: 'right' },
                5: { cellWidth: 25, halign: 'right' },
            },
        });
    }

    /**
     * Add comparison report
     */
    private addComparisonReport(doc: jsPDF, reportData: AggregatedReportData) {
        let yPosition = 50;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Comparativa de Rendimiento', 20, yPosition);
        yPosition += 15;

        // Sort clients by total revenue
        const sortedClients = [...reportData.byClient].sort(
            (a, b) => b.totalRevenue - a.totalRevenue
        );

        // Create comparison table
        const tableData = sortedClients.map((client, index) => {
            const leadsArrow = client.trends.leadsChange >= 0 ? '↑' : '↓';
            const revenueArrow = client.trends.revenueChange >= 0 ? '↑' : '↓';

            return [
                (index + 1).toString(),
                client.clientName,
                this.formatCurrency(client.totalRevenue),
                `${revenueArrow} ${Math.abs(client.trends.revenueChange).toFixed(1)}%`,
                client.totalLeads.toLocaleString(),
                `${leadsArrow} ${Math.abs(client.trends.leadsChange).toFixed(1)}%`,
                `${client.conversionRate.toFixed(1)}%`,
            ];
        });

        autoTable(doc, {
            startY: yPosition,
            head: [['#', 'Cliente', 'Ingresos', 'Δ', 'Leads', 'Δ', 'Conv.']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 25, halign: 'center' },
                6: { cellWidth: 20, halign: 'center' },
            },
        });
    }

    /**
     * Add footer
     */
    private addFooter(doc: jsPDF, branding: TenantBranding) {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            // Footer line
            doc.setDrawColor(200, 200, 200);
            doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

            // Footer text
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `Generado por ${branding.companyName}`,
                20,
                pageHeight - 15
            );
            doc.text(
                `Página ${i} de ${pageCount}`,
                pageWidth - 40,
                pageHeight - 15
            );
            doc.text(
                new Date().toLocaleDateString('es-MX'),
                pageWidth / 2 - 15,
                pageHeight - 15
            );
        }
    }

    /**
     * Helper functions
     */
    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : { r: 59, g: 130, b: 246 }; // Default blue
    }
}

// Singleton instance
export const pdfReportGenerator = new PDFReportGenerator();
