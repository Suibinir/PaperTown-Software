import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Client, Campaign, Deliverable } from '@/types'

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function healthLabel(score: number) {
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Needs attention'
  return 'At risk'
}

export async function generateClientReport(
  client: Client,
  campaigns: Campaign[],
  deliverables: Deliverable[],
  month: string // e.g. "June 2024"
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const INDIGO: [number, number, number] = [99, 102, 241]
  const STONE: [number, number, number]  = [120, 113, 108]
  const WHITE: [number, number, number]  = [255, 255, 255]
  const LIGHT: [number, number, number]  = [250, 250, 249]

  // ── Cover header ──────────────────────────────────────────────────────────
  doc.setFillColor(...INDIGO)
  doc.rect(0, 0, W, 50, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('PaperTown', 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Performance Report', 14, 27)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(client.company, 14, 40)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(month, W - 14, 40, { align: 'right' })

  // ── Client info block ─────────────────────────────────────────────────────
  let y = 62

  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, W - 28, 22, 3, 3, 'F')

  doc.setTextColor(...STONE)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('CONTACT', 20, y + 7)
  doc.setTextColor(28, 25, 23)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(client.contact_name, 20, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...STONE)
  doc.text(client.contact_email, 20, y + 19)

  // Health score
  const scoreColor: [number, number, number] = client.health_score >= 75
    ? [16, 185, 129] : client.health_score >= 50 ? [245, 158, 11] : [239, 68, 68]
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...scoreColor)
  doc.text(String(client.health_score), W - 30, y + 16, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...STONE)
  doc.text('HEALTH SCORE', W - 30, y + 21, { align: 'right' })

  y += 32

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalBudget = campaigns.reduce((s, c) => s + c.budget_monthly, 0)
  const totalSpend  = campaigns.reduce((s, c) => s + c.spend_to_date, 0)
  const doneDel     = deliverables.filter(d => d.status === 'done').length
  const fmt = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

  const stats = [
    { label: 'CAMPAIGNS', value: String(campaigns.length) },
    { label: 'MONTHLY BUDGET', value: fmt(totalBudget) },
    { label: 'SPEND TO DATE', value: fmt(totalSpend) },
    { label: 'DELIVERABLES', value: `${doneDel}/${deliverables.length}` },
  ]

  const boxW = (W - 28 - 9) / 4
  stats.forEach((stat, i) => {
    const x = 14 + i * (boxW + 3)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, y, boxW, 20, 2, 2, 'F')
    doc.setTextColor(...STONE)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(stat.label, x + boxW / 2, y + 7, { align: 'center' })
    doc.setTextColor(28, 25, 23)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(stat.value, x + boxW / 2, y + 15, { align: 'center' })
  })

  y += 30

  // ── Campaigns table ───────────────────────────────────────────────────────
  doc.setTextColor(28, 25, 23)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Campaigns', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Campaign', 'Service', 'Budget', 'Spent', 'KPI Target', 'Current', 'Status']],
    body: campaigns.map(c => [
      c.name,
      c.service,
      fmt(c.budget_monthly),
      fmt(c.spend_to_date),
      c.kpi_target ?? '—',
      c.kpi_current ?? '—',
      c.status,
    ]),
    headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [28, 25, 23] },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { cellWidth: 38 }, 6: { cellWidth: 18 } },
    margin: { left: 14, right: 14 },
    tableLineColor: [229, 225, 221],
    tableLineWidth: 0.1,
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Deliverables table ────────────────────────────────────────────────────
  doc.setTextColor(28, 25, 23)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Deliverables', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Deliverable', 'Type', 'Due Date', 'Status']],
    body: deliverables.map(d => [
      d.title,
      d.type,
      d.due_date,
      d.status.replace('_', ' '),
    ]),
    headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [28, 25, 23] },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
    tableLineColor: [229, 225, 221],
    tableLineWidth: 0.1,
    didDrawCell: (data) => {
      if (data.column.index === 3 && data.section === 'body') {
        const status = data.cell.raw as string
        const colors: Record<string, [number, number, number]> = {
          'done': [16, 185, 129],
          'in progress': [99, 102, 241],
          'review': [139, 92, 246],
          'not started': [120, 113, 108],
        }
        const col = colors[status] ?? [120, 113, 108]
        doc.setTextColor(...col)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(status, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1)
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(...INDIGO)
  doc.rect(0, pageH - 15, W, 15, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated by PaperTown · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, W / 2, pageH - 6, { align: 'center' })

  // ── Save ──────────────────────────────────────────────────────────────────
  const filename = `${client.company.replace(/\s+/g, '_')}_${month.replace(' ', '_')}_Report.pdf`
  doc.save(filename)
}
