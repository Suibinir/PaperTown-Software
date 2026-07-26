'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Invoice, Client, InvoiceLine, FinanceSettings, Expense, Vendor, Staff } from '@/types'
import { generateInvoicePDF, generateReceiptPDF } from '@/lib/invoice-pdf'
import {
  Plus, Download, Trash2, Loader2, FileText, Receipt,
  DollarSign, TrendingUp, TrendingDown, Users, Package, BarChart3,
  ChevronRight, X, Check, Edit2
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────
const TABS = ['Invoices', 'Expenses', 'Vendors', 'Payroll', 'Cash Flow', 'Settings'] as const
type Tab = typeof TABS[number]

const EXPENSE_CATS = ['Software','Marketing','Office','Travel','Freelance','Utilities','Equipment','Other']
const VENDOR_CATS  = ['Software','Freelancer','Agency','Supplier','Utility','Other']

function fmt(n: number, cur = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const statusStyle: Record<string, string> = {
  draft:     'bg-neutral-100 text-neutral-500',
  pending:   'bg-yellow-50 text-yellow-600',
  paid:      'bg-emerald-50 text-emerald-600',
  overdue:   'bg-red-50 text-red-500',
  cancelled: 'bg-neutral-100 text-neutral-400',
}

const field = 'w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white'

// ── Invoice Modal ─────────────────────────────────────────────────────────────
function InvoiceModal({ clients, settings, agencyName, logoUrl, editInvoice, onClose, onSaved }: {
  clients: Client[]
  settings: FinanceSettings
  agencyName: string
  logoUrl: string | null
  editInvoice?: Invoice
  onClose: () => void
  onSaved: (inv: Invoice) => void
}) {
  const [saving, setSaving]   = useState(false)
  const [exporting, setExporting] = useState<'pdf'|'receipt'|null>(null)
  const [clientId, setClientId]   = useState(editInvoice?.client_id ?? (clients[0]?.id ?? ''))
  const [payType, setPayType]     = useState<'final'|'advance'|'balance'>(editInvoice?.pay_type as any ?? 'final')
  const [advPct, setAdvPct]       = useState(editInvoice?.advance_pct ?? 50)
  const [issueDate, setIssueDate] = useState(editInvoice?.issue_date ?? new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate]     = useState(editInvoice?.due_date ?? '')
  const [notes, setNotes]         = useState(editInvoice?.notes ?? '')
  const [txnId, setTxnId]         = useState(editInvoice?.txn_id ?? '')
  const [status, setStatus]       = useState(editInvoice?.status ?? 'draft')
  const [lines, setLines]         = useState<InvoiceLine[]>(
    editInvoice?.lines ?? [{ description: '', qty: 1, rate: 0, amount: 0 }]
  )

  const updateLine = (i: number, k: keyof InvoiceLine, v: string | number) => {
    setLines(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [k]: v }
      if (k === 'qty' || k === 'rate') {
        next[i].amount = Number(next[i].qty) * Number(next[i].rate)
      }
      return next
    })
  }

  const subtotal    = lines.reduce((s, l) => s + l.amount, 0)
  const vatAmt      = subtotal * (settings.vat_rate / 100)
  const total       = subtotal + vatAmt
  const balancePct = 100 - advPct
  const amountDue   = payType === 'advance' ? total * (advPct / 100) : payType === 'balance' ? total * (balancePct / 100) : total

  const save = async () => {
    setSaving(true)
    const invId = editInvoice?.id ?? `${settings.inv_prefix}-${settings.next_inv_num}`
    const payload = {
      id: invId, client_id: clientId, issue_date: issueDate,
      due_date: dueDate || null, status, pay_type: payType,
      advance_pct: advPct, lines, subtotal, vat: vatAmt,
      total, amount_due: amountDue,
      notes: notes || null, txn_id: txnId || null,
    }
    const { data, error } = editInvoice
      ? await supabase.from('invoices').update(payload).eq('id', editInvoice.id).select().single()
      : await supabase.from('invoices').insert([payload]).select().single()

    if (!editInvoice) {
      await supabase.from('agency_settings').update({ next_inv_num: settings.next_inv_num + 1 }).gt('next_inv_num', 0);

    }
    setSaving(false)
    if (data) { onSaved(data as Invoice); onClose() }
  }

  const buildInvoice = (): Invoice => ({
    id: editInvoice?.id ?? `${settings.inv_prefix}-${settings.next_inv_num}`,
    client_id: clientId, issue_date: issueDate, due_date: dueDate || null,
    status: status as any, pay_type: payType, advance_pct: advPct,
    lines, subtotal, vat: vatAmt, total, amount_due: amountDue,
    notes: notes || null, txn_id: txnId || null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  })

  const exportPDF = async (type: 'pdf' | 'receipt') => {
    setExporting(type)
    const client = clients.find(c => c.id === clientId) ?? null
    const inv    = buildInvoice()
    if (type === 'pdf') await generateInvoicePDF(inv, client, settings, agencyName, logoUrl)
    else await generateReceiptPDF(inv, client, settings, agencyName, logoUrl)
    setExporting(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 z-10 max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-semibold text-neutral-900">
            {editInvoice ? `Edit ${editInvoice.id}` : 'New Invoice'}
          </h2>
          <div className="flex items-center gap-2">
            {editInvoice && (
              <>
                <button onClick={() => exportPDF('pdf')} disabled={!!exporting}
                  className="flex items-center gap-1.5 text-xs font-medium border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 disabled:opacity-60">
                  {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  Invoice PDF
                </button>
                <button onClick={() => exportPDF('receipt')} disabled={!!exporting}
                  className="flex items-center gap-1.5 text-xs font-medium border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 disabled:opacity-60">
                  {exporting === 'receipt' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                  Receipt
                </button>
              </>
            )}
            <button onClick={onClose}><X className="w-4 h-4 text-neutral-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Client + type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Client</label>
              <select className={field} value={clientId} onChange={e => setClientId(e.target.value)}>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Status</label>
              <select className={field} value={status} onChange={e => setStatus(e.target.value as any)}>
                {['draft','pending','paid','overdue','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Issue date</label>
              <input className={field} type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Due date</label>
              <input className={field} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Payment type</label>
              <select className={field} value={payType} onChange={e => setPayType(e.target.value as any)}>
                <option value="final">Final Invoice</option>
                <option value="advance">Advance (collect deposit)</option>
                <option value="balance">Balance (collect remaining)</option>
              </select>
            </div>
          </div>

          {(payType === 'advance' || payType === 'balance') && (
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Advance % ({advPct}%) — Balance {balancePct}%</label>
              <input type="range" min={10} max={90} step={5} value={advPct}
                onChange={e => setAdvPct(Number(e.target.value))}
                className="w-full accent-black" />
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-neutral-500">Line items</label>
              <button onClick={() => setLines(prev => [...prev, { description: '', qty: 1, rate: 0, amount: 0 }])}
                className="text-xs text-black font-medium hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add line
              </button>
            </div>
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-900 text-white">
                    <th className="text-left px-3 py-2 text-xs font-medium">Description</th>
                    <th className="px-3 py-2 text-xs font-medium w-16">Qty</th>
                    <th className="px-3 py-2 text-xs font-medium w-24">Rate</th>
                    <th className="px-3 py-2 text-xs font-medium w-24 text-right">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5">
                        <input className="w-full text-xs border-0 focus:outline-none bg-transparent" placeholder="Service description"
                          value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" className="w-full text-xs border-0 focus:outline-none bg-transparent text-center"
                          value={line.qty} onChange={e => updateLine(i, 'qty', Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" className="w-full text-xs border-0 focus:outline-none bg-transparent text-right"
                          value={line.rate} onChange={e => updateLine(i, 'rate', Number(e.target.value))} />
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs font-medium">{fmt(line.amount, settings.currency)}</td>
                      <td className="px-1 py-1.5 text-center">
                        <button onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                          className="text-neutral-300 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-medium">{fmt(subtotal, settings.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">VAT ({settings.vat_rate}%)</span>
              <span className="font-medium">{fmt(vatAmt, settings.currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-neutral-200 pt-2">
              <span>Project Total</span>
              <span>{fmt(total, settings.currency)}</span>
            </div>
            {payType === 'balance' && (
              <div className="flex justify-between text-sm text-neutral-500">
                <span>Already paid ({advPct}% advance)</span>
                <span>{fmt(total * (advPct / 100), settings.currency)}</span>
              </div>
            )}
            {(payType === 'advance' || payType === 'balance') && (
              <div className="flex justify-between text-sm font-bold text-black bg-neutral-200 rounded-lg px-3 py-2">
                <span>Amount Due ({payType === 'advance' ? `${advPct}% Advance` : `${balancePct}% Balance`})</span>
                <span>{fmt(amountDue, settings.currency)}</span>
              </div>
            )}
          </div>

          {/* Notes + TXN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes</label>
              <textarea className={`${field} resize-none`} rows={2} placeholder="Payment terms, bank details…"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Transaction ID</label>
              <input className={field} placeholder="TXN-123456" value={txnId} onChange={e => setTxnId(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 text-sm text-neutral-500 border border-neutral-200 rounded-lg py-2.5 hover:bg-neutral-50">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-neutral-900 text-white rounded-lg py-2.5 hover:bg-black disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : editInvoice ? 'Update invoice' : 'Create invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Finance Page ─────────────────────────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab]               = useState<Tab>('Invoices')
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [vendors, setVendors]       = useState<Vendor[]>([])
  const [staff, setStaff]           = useState<Staff[]>([])
  const [clients, setClients]       = useState<Client[]>([])
  const [settings, setSettings]     = useState<FinanceSettings>({
    currency: 'USD', tax_rate: 25, vat_rate: 15, pay_terms: 30,
    inv_prefix: 'INV', next_inv_num: 1001, inv_note: null, late_fee: 1.5,
    agency_phone: null, agency_email: null, agency_website: null, agency_address: null,
  })
  const [agencyName, setAgencyName] = useState('PaperTown')
  const [logoUrl, setLogoUrl]       = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showInvModal, setShowInvModal] = useState(false)
  const [editInvoice, setEditInvoice]   = useState<Invoice | undefined>()

  // Expense form
  const [expForm, setExpForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', category: '', amount: '', notes: '' })
  const [savingExp, setSavingExp] = useState(false)

  // Vendor form
  const [vendForm, setVendForm] = useState({ name: '', category: '', email: '', phone: '', terms: 'Net 30' })
  const [savingVend, setSavingVend] = useState(false)

  // Settings save
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved]   = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('vendors').select('*').order('name'),
      supabase.from('staff').select('*').order('name'),
      supabase.from('clients').select('*').order('company'),
      supabase.from('agency_settings').select('*').single(),
    ]).then(([inv, exp, vend, st, cls, ag]) => {
      setInvoices((inv.data ?? []) as Invoice[])
      setExpenses((exp.data ?? []) as Expense[])
      setVendors((vend.data ?? []) as Vendor[])
      setStaff((st.data ?? []) as Staff[])
      setClients((cls.data ?? []) as Client[])
      if (ag.data) {
        setAgencyName(ag.data.agency_name ?? 'PaperTown')
        setLogoUrl(ag.data.logo_url ?? null)
        setSettings({
          currency:      ag.data.currency      ?? 'USD',
          tax_rate:      ag.data.tax_rate       ?? 25,
          vat_rate:      ag.data.vat_rate       ?? 15,
          pay_terms:     ag.data.pay_terms      ?? 30,
          inv_prefix:    ag.data.inv_prefix     ?? 'INV',
          next_inv_num:  ag.data.next_inv_num   ?? 1001,
          inv_note:      ag.data.inv_note       ?? null,
          late_fee:      ag.data.late_fee       ?? 1.5,
          agency_phone:  ag.data.agency_phone   ?? null,
          agency_email:  ag.data.agency_email   ?? null,
          agency_website: ag.data.agency_website ?? null,
          agency_address: ag.data.agency_address ?? null,
        })
      }
      setLoading(false)
    })
  }, [])

  const deleteInvoice = async (id: string) => {
    await supabase.from('invoices').delete().eq('id', id)
    setInvoices(prev => prev.filter(i => i.id !== id))
  }

  const markPaid = async (inv: Invoice) => {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', inv.id)
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'paid' } : i))
  }

  const addExpense = async () => {
    if (!expForm.description || !expForm.amount) return
    setSavingExp(true)
    const { data } = await supabase.from('expenses').insert([{
      date: expForm.date, description: expForm.description,
      category: expForm.category || null, amount: parseFloat(expForm.amount),
      notes: expForm.notes || null,
    }]).select().single()
    if (data) setExpenses(prev => [data as Expense, ...prev])
    setExpForm({ date: new Date().toISOString().split('T')[0], description: '', category: '', amount: '', notes: '' })
    setSavingExp(false)
  }

  const addVendor = async () => {
    if (!vendForm.name) return
    setSavingVend(true)
    const { data } = await supabase.from('vendors').insert([vendForm]).select().single()
    if (data) setVendors(prev => [...prev, data as Vendor])
    setVendForm({ name: '', category: '', email: '', phone: '', terms: 'Net 30' })
    setSavingVend(false)
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    await supabase.from('agency_settings').update(settings).gt('next_inv_num', 0)
    setSavingSettings(false)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  // Cash flow data
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_due, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = totalRevenue - totalExpenses
  const outstanding = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amount_due, 0)
  const totalPayroll = staff.filter(s => s.active).reduce((s, m) => s + m.salary, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {(showInvModal || editInvoice) && (
        <InvoiceModal
          clients={clients} settings={settings} agencyName={agencyName} logoUrl={logoUrl}
          editInvoice={editInvoice}
          onClose={() => { setShowInvModal(false); setEditInvoice(undefined) }}
          onSaved={inv => {
            setInvoices(prev => editInvoice
              ? prev.map(i => i.id === inv.id ? inv : i)
              : [inv, ...prev]
            )
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Finance</h1>
          <p className="text-neutral-400 text-sm mt-0.5">{invoices.length} invoices · {fmt(totalRevenue, settings.currency)} collected</p>
        </div>
        {tab === 'Invoices' && (
          <button onClick={() => setShowInvModal(true)}
            className="flex items-center gap-1.5 bg-neutral-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-black transition-colors">
            <Plus className="w-4 h-4" /> New invoice
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total collected', value: fmt(totalRevenue, settings.currency), icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Outstanding', value: fmt(outstanding, settings.currency), icon: DollarSign, color: 'text-yellow-600' },
          { label: 'Total expenses', value: fmt(totalExpenses, settings.currency), icon: TrendingDown, color: 'text-red-500' },
          { label: 'Net profit', value: fmt(netProfit, settings.currency), icon: BarChart3, color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-xl p-5">
            <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
            <div className="text-xl font-bold text-neutral-900">{s.value}</div>
            <div className="text-xs text-neutral-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${tab === t ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── INVOICES TAB ─────────────────────────────────────────────────────── */}
      {tab === 'Invoices' && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-400 font-medium">
                <th className="text-left px-5 py-3">Invoice</th>
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Due</th>
                <th className="text-left px-5 py-3">Amount</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-neutral-400 text-sm">No invoices yet.</td></tr>
              )}
              {invoices.map(inv => {
                const client = clients.find(c => c.id === inv.client_id)
                return (
                  <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-neutral-900">{inv.id}</td>
                    <td className="px-5 py-3.5 text-neutral-600">{client?.company ?? '—'}</td>
                    <td className="px-5 py-3.5 text-neutral-500 text-xs">{fmtDate(inv.issue_date)}</td>
                    <td className="px-5 py-3.5 text-neutral-500 text-xs">{inv.due_date ? fmtDate(inv.due_date) : '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-neutral-900">{fmt(inv.amount_due, settings.currency)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyle[inv.status]}`}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditInvoice(inv)} className="text-neutral-400 hover:text-black transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {inv.status !== 'paid' && (
                          <button onClick={() => markPaid(inv)} className="text-neutral-400 hover:text-emerald-500 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => deleteInvoice(inv.id)} className="text-neutral-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── EXPENSES TAB ─────────────────────────────────────────────────────── */}
      {tab === 'Expenses' && (
        <div className="space-y-4">
          {/* Add expense form */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4">Log expense</h2>
            <div className="grid grid-cols-5 gap-3">
              <input className={field} type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
              <input className={`${field} col-span-2`} placeholder="Description *" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} />
              <select className={field} value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Category</option>
                {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
              <input className={field} type="number" placeholder="Amount *" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="flex gap-3 mt-3">
              <input className={`${field} flex-1`} placeholder="Notes (optional)" value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} />
              <button onClick={addExpense} disabled={savingExp}
                className="flex items-center gap-1.5 bg-neutral-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-black disabled:opacity-60">
                {savingExp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
          </div>

          {/* Expenses list */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-400 font-medium">
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Description</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-right px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {expenses.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-neutral-400 text-sm">No expenses logged.</td></tr>
                )}
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 text-xs text-neutral-500">{fmtDate(exp.date)}</td>
                    <td className="px-5 py-3 text-neutral-800">{exp.description}</td>
                    <td className="px-5 py-3">
                      {exp.category && <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">{exp.category}</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900">{fmt(exp.amount, settings.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VENDORS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'Vendors' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4">Add vendor</h2>
            <div className="grid grid-cols-5 gap-3">
              <input className={`${field} col-span-2`} placeholder="Vendor name *" value={vendForm.name} onChange={e => setVendForm(f => ({ ...f, name: e.target.value }))} />
              <select className={field} value={vendForm.category} onChange={e => setVendForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Category</option>
                {VENDOR_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
              <input className={field} placeholder="Email" value={vendForm.email} onChange={e => setVendForm(f => ({ ...f, email: e.target.value }))} />
              <input className={field} placeholder="Phone" value={vendForm.phone} onChange={e => setVendForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={addVendor} disabled={savingVend}
                className="flex items-center gap-1.5 bg-neutral-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-black disabled:opacity-60">
                {savingVend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add vendor
              </button>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-400 font-medium">
                  <th className="text-left px-5 py-3">Vendor</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {vendors.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-neutral-400 text-sm">No vendors yet.</td></tr>}
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-900">{v.name}</td>
                    <td className="px-5 py-3">{v.category && <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">{v.category}</span>}</td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">{v.email ?? '—'}</td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">{v.terms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAYROLL TAB ──────────────────────────────────────────────────────── */}
      {tab === 'Payroll' && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">Staff payroll</h2>
            <div className="text-sm font-bold text-neutral-900">
              Monthly total: {fmt(totalPayroll, settings.currency)}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-400 font-medium">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-right px-5 py-3">Monthly Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {staff.filter(s => s.active).length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-neutral-400 text-sm">No staff. Add team members in the Team section.</td></tr>
              )}
              {staff.filter(s => s.active).map(m => (
                <tr key={m.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium text-neutral-900">{m.name}</td>
                  <td className="px-5 py-3 text-neutral-500">{m.role ?? '—'}</td>
                  <td className="px-5 py-3 text-neutral-500 text-xs">{m.email ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold">{fmt(m.salary, settings.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CASH FLOW TAB ────────────────────────────────────────────────────── */}
      {tab === 'Cash Flow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total revenue', value: fmt(totalRevenue, settings.currency), desc: 'From paid invoices', color: 'bg-emerald-50 border-emerald-200' },
              { label: 'Total expenses', value: fmt(totalExpenses, settings.currency), desc: 'All logged expenses', color: 'bg-red-50 border-red-200' },
              { label: 'Net profit', value: fmt(netProfit, settings.currency), desc: 'Revenue minus expenses', color: netProfit >= 0 ? 'bg-neutral-50 border-neutral-200' : 'bg-red-50 border-red-200' },
            ].map(s => (
              <div key={s.label} className={`border rounded-2xl p-6 ${s.color}`}>
                <p className="text-xs text-neutral-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
                <p className="text-xs text-neutral-400 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Expense breakdown by category */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4">Expenses by category</h2>
            {EXPENSE_CATS.map(cat => {
              const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
              if (total === 0) return null
              const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
              return (
                <div key={cat} className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-neutral-500 w-24">{cat}</span>
                  <div className="flex-1 bg-neutral-100 rounded-full h-2">
                    <div className="h-2 bg-neutral-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-neutral-900 w-24 text-right">{fmt(total, settings.currency)}</span>
                </div>
              )
            })}
          </div>

          {/* Outstanding invoices */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-700 mb-3">Outstanding invoices</h2>
            {invoices.filter(i => i.status === 'pending' || i.status === 'overdue').length === 0
              ? <p className="text-sm text-neutral-400">No outstanding invoices.</p>
              : invoices.filter(i => i.status === 'pending' || i.status === 'overdue').map(inv => {
                const client = clients.find(c => c.id === inv.client_id)
                return (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{inv.id} · {client?.company}</p>
                      <p className="text-xs text-neutral-400">{inv.due_date ? `Due ${fmtDate(inv.due_date)}` : 'No due date'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">{fmt(inv.amount_due, settings.currency)}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[inv.status]}`}>{inv.status}</span>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'Settings' && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 max-w-2xl">
          <h2 className="text-sm font-semibold text-neutral-700">Finance settings</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Currency', key: 'currency', placeholder: 'USD' },
              { label: 'Invoice prefix', key: 'inv_prefix', placeholder: 'INV' },
              { label: 'VAT rate (%)', key: 'vat_rate', placeholder: '15', type: 'number' },
              { label: 'Tax rate (%)', key: 'tax_rate', placeholder: '25', type: 'number' },
              { label: 'Payment terms (days)', key: 'pay_terms', placeholder: '30', type: 'number' },
              { label: 'Late fee (%/month)', key: 'late_fee', placeholder: '1.5', type: 'number' },
              { label: 'Agency phone', key: 'agency_phone', placeholder: '+1 234 567 8900' },
              { label: 'Agency email', key: 'agency_email', placeholder: 'billing@agency.com' },
              { label: 'Agency website', key: 'agency_website', placeholder: 'https://agency.com' },
              { label: 'Agency address', key: 'agency_address', placeholder: '123 Main St, City' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">{f.label}</label>
                <input
                  className={field}
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  value={(settings as any)[f.key] ?? ''}
                  onChange={e => setSettings(s => ({ ...s, [f.key]: f.type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Default invoice notes</label>
            <textarea className={`${field} resize-none`} rows={3}
              placeholder="e.g. Payment due within 30 days. Bank: ..."
              value={settings.inv_note ?? ''}
              onChange={e => setSettings(s => ({ ...s, inv_note: e.target.value }))}
            />
          </div>
          <button onClick={saveSettings} disabled={savingSettings}
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-black disabled:opacity-60">
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : settingsSaved ? <Check className="w-4 h-4" /> : null}
            {savingSettings ? 'Saving…' : settingsSaved ? 'Saved!' : 'Save settings'}
          </button>
        </div>
      )}
    </div>
  )
}
