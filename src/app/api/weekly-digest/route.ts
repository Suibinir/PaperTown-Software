import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CONTENT_TYPES = ['Static','Video','Motion Video','Reel','Cover Photo','Story','Carousel']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function pad(n: number) { return String(n).padStart(2, '0') }

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const now        = new Date()
  const year       = now.getFullYear()
  const month      = now.getMonth()
  const monthName  = MONTHS[month]
  const startDate  = `${year}-${pad(month+1)}-01`
  const today      = now.toISOString().split('T')[0]
  const daysLeft   = new Date(year, month+1, 0).getDate() - now.getDate()

  // Get all clients
  const { data: clients } = await supabase.from('clients').select('id, company')

  // Get all content calendar entries for this month so far
  const { data: entries } = await supabase
    .from('content_calendar')
    .select('client_id, content_type, status, date')
    .gte('date', startDate)
    .lte('date', today)

  if (!entries || entries.length === 0) {
    return NextResponse.json({ message: 'No content calendar entries found for this month.' })
  }

  // Build per-client breakdown
  const clientBreakdowns: {
    clientId: string
    clientName: string
    typeCounts: Record<string, number>
    total: number
    done: number
    planned: number
  }[] = []

  for (const client of (clients ?? [])) {
    const clientEntries = entries.filter(e => e.client_id === client.id)
    if (clientEntries.length === 0) continue

    const typeCounts: Record<string, number> = {}
    CONTENT_TYPES.forEach(t => {
      const count = clientEntries.filter(e => e.content_type === t).length
      if (count > 0) typeCounts[t] = count
    })

    clientBreakdowns.push({
      clientId:   client.id,
      clientName: client.company,
      typeCounts,
      total:   clientEntries.length,
      done:    clientEntries.filter(e => e.status === 'done').length,
      planned: clientEntries.filter(e => e.status === 'planned').length,
    })
  }

  if (clientBreakdowns.length === 0) {
    return NextResponse.json({ message: 'No content entries with client assignments found.' })
  }

  // Build digest body text
  const buildBody = (role: 'admin' | 'designer') => {
    let text = `📅 Content update for ${monthName} ${year} (${daysLeft} days remaining)\n\n`
    for (const b of clientBreakdowns) {
      text += `▸ ${b.clientName}\n`
      text += `  Total posts so far: ${b.total} | Done: ${b.done} | Planned: ${b.planned}\n`
      const typeLines = Object.entries(b.typeCounts).map(([t, c]) => `${t}: ${c}`).join(' · ')
      if (typeLines) text += `  Types: ${typeLines}\n`
      text += '\n'
    }
    if (role === 'designer') {
      text += `💡 Reminder: Make sure all assets for planned posts are ready before the end of the month.`
    } else {
      text += `💡 Admin note: Review any posts still in "planned" status and ensure team is on track.`
    }
    return text
  }

  // Create notifications for admin and designer roles
  const notifications = [
    {
      type:           'weekly_digest',
      title:          `📊 ${monthName} content digest — ${clientBreakdowns.reduce((s, b) => s + b.total, 0)} posts tracked`,
      body:           buildBody('admin'),
      data:           { month, year, clientBreakdowns, daysLeft },
      recipient_role: 'admin',
      read:           false,
    },
    {
      type:           'weekly_digest',
      title:          `🎨 ${monthName} content digest — asset checklist`,
      body:           buildBody('designer'),
      data:           { month, year, clientBreakdowns, daysLeft },
      recipient_role: 'designer',
      read:           false,
    },
  ]

  const { data: inserted, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    created: inserted?.length,
    month:   monthName,
    year,
    daysLeft,
    clients: clientBreakdowns.map(b => ({
      name:       b.clientName,
      total:      b.total,
      done:       b.done,
      typeCounts: b.typeCounts,
    })),
  })
}
