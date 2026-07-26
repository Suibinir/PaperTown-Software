import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Client, ContentEntry } from '@/types'

const INDIGO: [number, number, number] = [99, 102, 241]
const WHITE:  [number, number, number] = [255, 255, 255]
const LIGHT:  [number, number, number] = [250, 250, 249]
const DARK:   [number, number, number] = [28, 25, 23]
const STONE:  [number, number, number] = [120, 113, 108]

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const contentTypeColor: Record<string, [number, number, number]> = {
  'Static':       [99, 102, 241],
  'Video':        [14, 165, 233],
  'Motion Video': [168, 85, 247],
  'Reel':         [236, 72, 153],
  'Cover Photo':  [245, 158, 11],
  'Story':        [16, 185, 129],
  'Carousel':     [249, 115, 22],
}

const statusColors: Record<string, [number, number, number]> = {
  done:        [16, 185, 129],
  in_progress: [99, 102, 241],
  planned:     [120, 113, 108],
  cancelled:   [239, 68, 68],
}

// Column definitions — key maps to ContentEntry field
const COLUMN_DEFS: { key: string; label: string; width: number }[] = [
  { key: 'content_type',      label: 'Content Type',      width: 26 },
  { key: 'content_title',     label: 'Content Title',      width: 45 },
  { key: 'purpose',           label: 'Purpose',            width: 25 },
  { key: 'content_direction', label: 'Content Direction',  width: 80 },
  { key: 'platform',          label: 'Platform',           width: 24 },
  { key: 'status',            label: 'Status',             width: 20 },
]

export async function generateContentCalendarPDF(
  client: Client,
  entries: ContentEntry[],
  month: number,
  year: number,
  agencyName: string,
  logoUrl: string | null | undefined,
  exportCols: string[] = COLUMN_DEFS.map(c => c.key)
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  const H   = doc.internal.pageSize.getHeight()

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...INDIGO)
  doc.rect(0, 0, W, 28, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(agencyName, 12, 12)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Content Calendar', 12, 19)

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(client.company, W / 2, 12, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${MONTHS[month]} ${year}`, W / 2, 20, { align: 'center' })

  // Stats top-right
  const totalDays   = entries.length
  const withContent = entries.filter(e => e.content_title).length
  const done        = entries.filter(e => e.status === 'done').length
  doc.setFontSize(7.5)
  doc.text(`${totalDays} days planned`, W - 12, 10, { align: 'right' })
  doc.text(`${withContent} with content`, W - 12, 16, { align: 'right' })
  doc.text(`${done} completed`, W - 12, 22, { align: 'right' })

  // ── Post type summary bar ────────────────────────────────────────────────
  const CONTENT_TYPES = ['Static','Video','Motion Video','Reel','Cover Photo','Story','Carousel']
  const typeCounts    = CONTENT_TYPES.reduce((acc, t) => {
    acc[t] = entries.filter(e => e.content_type === t).length
    return acc
  }, {} as Record<string, number>)

  let sx = 12
  const sy = 32
  CONTENT_TYPES.forEach(type => {
    const count = typeCounts[type]
    if (count === 0) return
    const col = contentTypeColor[type] ?? INDIGO
    doc.setFillColor(...col)
    doc.roundedRect(sx, sy, 28, 10, 1.5, 1.5, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(type, sx + 14, sy + 4, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(String(count), sx + 14, sy + 8.5, { align: 'center' })
    sx += 31
  })

  // ── Table ─────────────────────────────────────────────────────────────────
  // Build columns based on exportCols selection
  const activeCols = COLUMN_DEFS.filter(c => exportCols.includes(c.key))
  const dateCol    = { key: 'date', label: 'Date', width: 22 }
  const allActiveCols = [dateCol, ...activeCols]

  const head = [allActiveCols.map(c => c.label)]
  const body = entries.map(entry => {
    return allActiveCols.map(col => {
      if (col.key === 'date') {
        return new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
      }
      return (entry as any)[col.key] ?? ''
    })
  })

  // Build columnStyles from active cols
  const columnStyles: Record<number, any> = {}
  allActiveCols.forEach((col, i) => {
    columnStyles[i] = { cellWidth: col.width }
    if (i === 0) columnStyles[i].fontStyle = 'bold'
  })

  // Content direction col index (for wider width)
  const dirIdx = allActiveCols.findIndex(c => c.key === 'content_direction')
  if (dirIdx >= 0) {
    // Give content direction remaining space
    const usedWidth = allActiveCols.reduce((s, c, i) => i === dirIdx ? s : s + c.width, 0)
    const remaining = W - 20 - usedWidth
    columnStyles[dirIdx] = { cellWidth: Math.max(remaining, 40) }
  }

  autoTable(doc, {
    startY: 46,
    head,
    body,
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: DARK,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 2 },
      minCellHeight: 7.5,
    },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles,
    margin: { left: 10, right: 10 },
    tableLineColor: [229, 225, 221],
    tableLineWidth: 0.1,
    didDrawCell: (data) => {
      // Colour-code content type pill
      const typeColIdx = allActiveCols.findIndex(c => c.key === 'content_type')
      if (data.column.index === typeColIdx && data.section === 'body' && typeColIdx >= 0) {
        const type = data.cell.raw as string
        const col  = contentTypeColor[type]
        if (col && type) {
          doc.setFillColor(...col)
          doc.roundedRect(
            data.cell.x + 1.5, data.cell.y + 1.5,
            data.cell.width - 3, data.cell.height - 3,
            1.5, 1.5, 'F'
          )
          doc.setTextColor(...WHITE)
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')
          doc.text(
            type,
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2 + 0.8,
            { align: 'center' }
          )
        }
      }

      // Colour-code status
      const statusColIdx = allActiveCols.findIndex(c => c.key === 'status')
      if (data.column.index === statusColIdx && data.section === 'body' && statusColIdx >= 0) {
        const status = (data.cell.raw as string).toLowerCase()
        const col    = statusColors[status] ?? statusColors.planned
        doc.setTextColor(...col)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(
          status.replace('_', ' '),
          data.cell.x + 2,
          data.cell.y + data.cell.height / 2 + 0.8
        )
      }
    },
  })

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...INDIGO)
  doc.rect(0, H - 10, W, 10, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${agencyName} · ${client.company} · ${MONTHS[month]} ${year} · Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    W / 2, H - 3.5,
    { align: 'center' }
  )

  // ── Save ───────────────────────────────────────────────────────────────────
  doc.save(`${client.company.replace(/\s+/g, '_')}_Content_Calendar_${MONTHS[month]}_${year}.pdf`)
}
