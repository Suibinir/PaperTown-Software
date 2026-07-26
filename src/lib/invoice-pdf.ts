import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Invoice, Client, FinanceSettings } from '@/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(d: string) {
  const dt = new Date(d)
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
}

function fmtMoney(n: number, currency: string) {
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export async function generateInvoicePDF(
  invoice: Invoice,
  client: Client | null,
  settings: FinanceSettings,
  agencyName: string,
  logoUrl?: string | null
): Promise<void> {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W    = doc.internal.pageSize.getWidth()
  const H    = doc.internal.pageSize.getHeight()
  const cur  = settings.currency ?? 'USD'

  // ── Load logo if available ────────────────────────────────────────────────
  let logoDataUrl: string | null = null
  if (logoUrl) {
    try {
      const res  = await fetch(logoUrl)
      const blob = await res.blob()
      logoDataUrl = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch {}
  }

  // ── HEADER ────────────────────────────────────────────────────────────────
  // Logo top left
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 14, 14, 28, 14)
  } else {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 17, 17)
    doc.text(agencyName, 14, 24)
  }

  // Big "Invoice." title top right
  doc.setFontSize(36)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 17, 17)
  doc.text('Invoice.', W - 14, 28, { align: 'right' })

  // Invoice type badge
  const balancePct = 100 - invoice.advance_pct
  const badgeText = invoice.pay_type === 'advance'
    ? `Advance (${invoice.advance_pct}%)`
    : invoice.pay_type === 'balance'
    ? `Balance (${balancePct}% remaining)`
    : 'Final Invoice'
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(badgeText, W - 14, 34, { align: 'right' })

  // Divider
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(14, 38, W - 14, 38)

  // ── META GRID ─────────────────────────────────────────────────────────────
  const metaY = 44
  const col1x = 14, col2x = 70, col3x = 130, col4x = 170

  const meta = [
    ['Invoice No.', invoice.id],
    ['Issue Date', fmtDate(invoice.issue_date)],
    ['Due Date', invoice.due_date ? fmtDate(invoice.due_date) : '—'],
    ['Status', invoice.status.toUpperCase()],
  ]

  meta.forEach((row, i) => {
    const x = i < 2 ? col1x : col3x
    const y = metaY + (i % 2) * 12
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(140, 140, 140)
    doc.text(row[0].toUpperCase(), x, y)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 17, 17)
    doc.text(row[1], x, y + 5)
  })

  // ── BILLED TO / FROM ──────────────────────────────────────────────────────
  const billY = metaY + 30

  // From
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140, 140, 140)
  doc.text('FROM', col1x, billY)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 17, 17)
  doc.text(agencyName, col1x, billY + 6)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const fromLines = [
    settings.agency_address,
    settings.agency_email,
    settings.agency_phone,
    settings.agency_website,
  ].filter(Boolean) as string[]
  fromLines.forEach((line, i) => doc.text(line, col1x, billY + 12 + i * 5))

  // To
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140, 140, 140)
  doc.text('BILLED TO', col3x, billY)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 17, 17)
  doc.text(client?.company ?? 'Client', col3x, billY + 6)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const toLines = [
    client?.contact_name,
    client?.contact_email,
    client?.contact_phone,
  ].filter(Boolean) as string[]
  toLines.forEach((line, i) => doc.text(line, col3x, billY + 12 + i * 5))

  // Divider
  const divY = billY + 38
  doc.setDrawColor(220, 220, 220)
  doc.line(14, divY, W - 14, divY)

  // ── LINE ITEMS TABLE ──────────────────────────────────────────────────────
  const tableY = divY + 4

  autoTable(doc, {
    startY: tableY,
    head: [['#', 'DESCRIPTION', 'QTY', 'RATE', 'AMOUNT']],
    body: invoice.lines.map((line, i) => [
      String(i + 1),
      line.description,
      String(line.qty),
      fmtMoney(line.rate, cur),
      fmtMoney(line.amount, cur),
    ]),
    headStyles: {
      fillColor: [17, 17, 17],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 30, 30],
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.1,
  })

  // ── TOTALS ────────────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 6
  const totalsX = W - 14
  const labelX  = W - 70

  const totalsRows = [
    ['Subtotal', fmtMoney(invoice.subtotal, cur)],
    [`VAT (${settings.vat_rate}%)`, fmtMoney(invoice.vat, cur)],
    [invoice.pay_type === 'balance' ? 'Project Total' : 'Total', fmtMoney(invoice.total, cur)],
  ]

  if (invoice.pay_type === 'balance') {
    totalsRows.push([
      `Already Paid (${invoice.advance_pct}% advance)`,
      fmtMoney(invoice.total * (invoice.advance_pct / 100), cur)
    ])
  }

  totalsRows.forEach((row, i) => {
    const y = finalY + i * 8
    const isFinalRow = i === 2 && invoice.pay_type !== 'balance' // bold "Total" row only for non-balance
    if (isFinalRow) {
      doc.setFillColor(17, 17, 17)
      doc.rect(labelX - 4, y - 5, W - 14 - labelX + 8, 9, 'F')
      doc.setTextColor(255, 255, 255)
    } else {
      doc.setTextColor(80, 80, 80)
    }
    doc.setFontSize(isFinalRow ? 10 : 9)
    doc.setFont('helvetica', isFinalRow ? 'bold' : 'normal')
    doc.text(row[0], labelX, y)
    doc.text(row[1], totalsX, y, { align: 'right' })
  })

  // Amount Due box
  const amtY = finalY + totalsRows.length * 8 + 6
  if ((invoice.pay_type === 'advance' || invoice.pay_type === 'balance')) {
    doc.setFillColor(17, 17, 17)
    doc.roundedRect(labelX - 4, amtY, W - 14 - labelX + 8, 14, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`AMOUNT DUE (${invoice.pay_type === 'advance' ? `${invoice.advance_pct}% Advance` : `${balancePct}% Balance`})`, labelX, amtY + 5)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(fmtMoney(invoice.amount_due, cur), totalsX, amtY + 10, { align: 'right' })
  }

  // ── NOTES ─────────────────────────────────────────────────────────────────
  const notesY = amtY + 22
  if (invoice.notes) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 17, 17)
    doc.text('NOTES', 14, notesY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8.5)
    const noteLines = doc.splitTextToSize(invoice.notes, W - 80)
    doc.text(noteLines, 14, notesY + 5)
  }

  // ── SIGNATURE LINES ───────────────────────────────────────────────────────
  const sigY = H - 40
  doc.setDrawColor(17, 17, 17)
  doc.setLineWidth(0.5)
  doc.line(14, sigY, 70, sigY)
  doc.line(W - 80, sigY, W - 14, sigY)
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Authorised Signature', 14, sigY + 5)
  doc.text("Client's Signature", W - 80, sigY + 5)

  // ── FOOTER ────────────────────────────────────────────────────────────────
  doc.setFillColor(17, 17, 17)
  doc.rect(0, H - 18, W, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(agencyName, 14, H - 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const footerParts = [
    settings.agency_phone,
    settings.agency_email,
    settings.agency_website,
  ].filter(Boolean).join('  |  ')
  if (footerParts) doc.text(footerParts, W / 2, H - 10, { align: 'center' })
  if (invoice.txn_id) {
    doc.setTextColor(180, 180, 180)
    doc.text(`TXN: ${invoice.txn_id}`, W - 14, H - 10, { align: 'right' })
  }

  doc.save(`${invoice.id}_${client?.company?.replace(/\s+/g, '_') ?? 'Invoice'}.pdf`)
}

// ── RECEIPT PDF ──────────────────────────────────────────────────────────────
export async function generateReceiptPDF(
  invoice: Invoice,
  client: Client | null,
  settings: FinanceSettings,
  agencyName: string,
  logoUrl?: string | null
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  const H   = doc.internal.pageSize.getHeight()
  const cur = settings.currency ?? 'USD'

  let logoDataUrl: string | null = null
  if (logoUrl) {
    try {
      const res  = await fetch(logoUrl)
      const blob = await res.blob()
      logoDataUrl = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch {}
  }

  // Header
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', W/2 - 20, 14, 40, 18)
  } else {
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 17, 17)
    doc.text(agencyName, W/2, 26, { align: 'center' })
  }

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  const headerLines = [
    settings.agency_address,
    [settings.agency_phone, settings.agency_email].filter(Boolean).join('  |  '),
    settings.agency_website,
  ].filter(Boolean) as string[]
  headerLines.forEach((line, i) => doc.text(line, W/2, 36 + i*5, { align: 'center' }))

  // PAYMENT RECEIPT title
  doc.setFillColor(17, 17, 17)
  doc.rect(14, 52, W - 28, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT RECEIPT', W/2, 60, { align: 'center' })

  // Big amount box
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(14, 70, W - 28, 28, 3, 3, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(14, 70, W - 28, 28, 3, 3, 'S')
  doc.setTextColor(17, 17, 17)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('AMOUNT RECEIVED', W/2, 79, { align: 'center' })
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text(fmtMoney(invoice.amount_due, cur), W/2, 92, { align: 'center' })

  // Receipt details table
  const detailsY = 106
  const labelX = 20, valueX = W - 20
  const balancePct = 100 - invoice.advance_pct

  const details = [
    ['Receipt No.', invoice.id],
    ['Receipt Date', fmtDate(invoice.issue_date)],
    ['Received From', client?.company ?? '—'],
    ['Payment Type', invoice.pay_type === 'advance' ? `Advance (${invoice.advance_pct}%)` : invoice.pay_type === 'balance' ? `Balance (${balancePct}%)` : 'Final Payment'],
    ['Invoice Ref.', invoice.id],
  ]

  details.forEach((row, i) => {
    const y = detailsY + i * 10
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248)
      doc.rect(14, y - 4, W - 28, 9, 'F')
    }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 17, 17)
    doc.text(row[0], labelX, y + 2)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.text(row[1], valueX, y + 2, { align: 'right' })
  })

  // Payment for
  const forY = detailsY + details.length * 10 + 8
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 17, 17)
  doc.text('PAYMENT FOR:', 14, forY)

  autoTable(doc, {
    startY: forY + 4,
    head: [['Description', 'Amount']],
    body: invoice.lines.map(line => [line.description, fmtMoney(line.amount, cur)]),
    headStyles: { fillColor: [17,17,17], textColor: [255,255,255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: [30,30,30] },
    alternateRowStyles: { fillColor: [248,248,248] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.1,
  })

  // Thank you note
  const thanksY = (doc as any).lastAutoTable.finalY + 12
  doc.setFillColor(17, 17, 17)
  doc.roundedRect(14, thanksY, W - 28, 14, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Thank you for your business!', W/2, thanksY + 9, { align: 'center' })

  // Footer
  doc.setFillColor(17, 17, 17)
  doc.rect(0, H - 14, W, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`${agencyName}  |  This is a computer generated receipt`, W/2, H - 6, { align: 'center' })

  doc.save(`Receipt_${invoice.id}_${client?.company?.replace(/\s+/g, '_') ?? ''}.pdf`)
}
