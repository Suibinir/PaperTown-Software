'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TeamMember, TeamRole, Client, ClientAssignment } from '@/types'
import { Plus, Loader2, Mail, Shield, Pencil, Check, X, Trash2, Eye, EyeOff } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const roles: TeamRole[] = ['admin', 'account_manager', 'designer', 'copywriter', 'analyst', 'viewer']

const roleStyle: Record<TeamRole, string> = {
  admin:           'bg-indigo-50 text-indigo-700',
  account_manager: 'bg-blue-50 text-blue-600',
  designer:        'bg-pink-50 text-pink-600',
  copywriter:      'bg-amber-50 text-amber-600',
  analyst:         'bg-emerald-50 text-emerald-600',
  viewer:          'bg-stone-100 text-stone-500',
}

const roleLabel: Record<TeamRole, string> = {
  admin:           'Admin',
  account_manager: 'Account Manager',
  designer:        'Designer',
  copywriter:      'Copywriter',
  analyst:         'Analyst',
  viewer:          'Viewer',
}

function Avatar({ member, size = 'md' }: { member: Pick<TeamMember, 'name' | 'avatar_color'>; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: member.avatar_color }}>
      {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
    </div>
  )
}

function AddMemberModal({ onClose, onAdded }: {
  onClose: () => void
  onAdded: (member: TeamMember) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [showPw, setShowPw] = useState(false)
  const colors = ['#6366f1','#0ea5e9','#f59e0b','#10b981','#f43f5e','#8b5cf6','#06b6d4','#84cc16']
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'account_manager' as TeamRole, avatar_color: colors[0]
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  const submit = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSaving(true)

    // 1. Create Supabase auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, role: form.role } }
    })
    if (authErr) { setError(authErr.message); setSaving(false); return }

    // 2. Create team_members record
    const { data, error: dbErr } = await supabase.from('team_members').insert([{
      name: form.name,
      email: form.email,
      role: form.role,
      avatar_color: form.avatar_color,
      auth_user_id: authData.user?.id ?? null,
    }]).select().single()

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onAdded(data as TeamMember)
    onClose()
  }

  return (
    <Modal title="Add team member" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Full name *</label>
            <input className={field} placeholder="Jane Smith" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Email *</label>
            <input className={field} type="email" placeholder="jane@agency.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Password *</label>
          <div className="relative">
            <input
              className={field}
              type={showPw ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={e => set('password', e.target.value)}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-1">They'll use this to log in at /login</p>
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Role</label>
          <select className={field} value={form.role} onChange={e => set('role', e.target.value)}>
            {roles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-2 block">Avatar colour</label>
          <div className="flex gap-2">
            {colors.map(c => (
              <button key={c} onClick={() => set('avatar_color', c)}
                className={`w-7 h-7 rounded-full transition-transform ${form.avatar_color === c ? 'scale-125 ring-2 ring-offset-1 ring-stone-400' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
          <Avatar member={form} />
          <div>
            <p className="text-sm font-medium text-stone-700">{form.name || 'Name'}</p>
            <p className="text-xs text-stone-400">{form.email || 'email@agency.com'}</p>
          </div>
          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${roleStyle[form.role]}`}>{roleLabel[form.role]}</span>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Creating account…' : 'Add member'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteConfirmModal({ member, onClose, onDeleted }: {
  member: TeamMember
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  const confirm = async () => {
    setDeleting(true)
    await supabase.from('team_members').update({ deleted: true, active: false }).eq('id', member.id)
    setDeleting(false)
    onDeleted(member.id)
    onClose()
  }

  return (
    <Modal title="Delete team member" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
          <Avatar member={member} />
          <div>
            <p className="text-sm font-semibold text-stone-800">{member.name}</p>
            <p className="text-xs text-stone-400">{member.email}</p>
          </div>
        </div>
        <p className="text-sm text-stone-600">
          This will remove <span className="font-medium">{member.name}</span> from the team.
          Their account will be deactivated and they won't be able to log in.
        </p>
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <p className="text-xs text-red-600">This action cannot be undone from the UI. To fully delete the auth account, go to Supabase Dashboard → Authentication → Users.</p>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50">Cancel</button>
          <button onClick={confirm} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-red-500 text-white rounded-lg py-2 hover:bg-red-600 disabled:opacity-60 transition-colors">
            {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {deleting ? 'Deleting…' : 'Delete member'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function TeamPage() {
  const [members, setMembers]         = useState<TeamMember[]>([])
  const [clients, setClients]         = useState<Client[]>([])
  const [assignments, setAssignments] = useState<ClientAssignment[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null)
  const [editingRole, setEditingRole]   = useState<string | null>(null)
  const [savingRole, setSavingRole]     = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('team_members').select('*').eq('deleted', false).order('created_at'),
      supabase.from('clients').select('*').order('company'),
      supabase.from('client_assignments').select('*'),
    ]).then(([m, c, a]) => {
      setMembers((m.data ?? []) as TeamMember[])
      setClients((c.data ?? []) as Client[])
      setAssignments((a.data ?? []) as ClientAssignment[])
      setLoading(false)
    })
  }, [])

  const updateRole = async (id: string, role: TeamRole) => {
    setSavingRole(id)
    await supabase.from('team_members').update({ role }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    setSavingRole(null)
    setEditingRole(null)
  }

  const assignClient = async (memberId: string, clientId: string) => {
    const existing = assignments.find(a => a.member_id === memberId && a.client_id === clientId)
    if (existing) {
      await supabase.from('client_assignments').delete().eq('id', existing.id)
      setAssignments(prev => prev.filter(a => a.id !== existing.id))
    } else {
      const { data } = await supabase.from('client_assignments')
        .insert([{ member_id: memberId, client_id: clientId }]).select().single()
      if (data) setAssignments(prev => [...prev, data as ClientAssignment])
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  const activeMembers = members.filter(m => m.active)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {showModal && (
        <AddMemberModal
          onClose={() => setShowModal(false)}
          onAdded={m => setMembers(prev => [...prev, m])}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          member={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={id => setMembers(prev => prev.filter(m => m.id !== id))}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Team</h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {activeMembers.length} members · login at <code className="text-xs bg-stone-100 px-1.5 py-0.5 rounded">/login</code>
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add member
        </button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {(['admin','account_manager','designer'] as TeamRole[]).map(role => {
          const count = activeMembers.filter(m => m.role === role).length
          return (
            <div key={role} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3">
              <div className={`text-xs font-medium px-2 py-1 rounded-lg ${roleStyle[role]}`}>{roleLabel[role]}</div>
              <span className="text-xl font-semibold text-stone-700">{count}</span>
            </div>
          )
        })}
      </div>

      {/* Member cards */}
      <div className="space-y-3">
        {activeMembers.map(member => {
          const isEditingRole = editingRole === member.id
          return (
            <div key={member.id} className="bg-white border border-stone-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <Avatar member={member} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-semibold text-stone-800">{member.name}</h2>
                    {member.role === 'admin' && <Shield className="w-3.5 h-3.5 text-indigo-500" />}
                    {isEditingRole ? (
                      <div className="flex items-center gap-1.5">
                        <select defaultValue={member.role}
                          onChange={e => updateRole(member.id, e.target.value as TeamRole)}
                          className="text-xs border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          {roles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
                        </select>
                        {savingRole === member.id
                          ? <Loader2 className="w-3 h-3 animate-spin text-stone-300" />
                          : <button onClick={() => setEditingRole(null)}><X className="w-3 h-3 text-stone-400" /></button>
                        }
                      </div>
                    ) : (
                      <button onClick={() => setEditingRole(member.id)}
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full hover:opacity-80 ${roleStyle[member.role]}`}>
                        {roleLabel[member.role]} <Pencil className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-3">
                    <Mail className="w-3 h-3" /> {member.email}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1.5">Assigned clients</p>
                    <div className="flex flex-wrap gap-1.5">
                      {clients.length === 0 && <span className="text-xs text-stone-300">No clients yet</span>}
                      {clients.map(client => {
                        const assigned = assignments.some(a => a.member_id === member.id && a.client_id === client.id)
                        return (
                          <button key={client.id} onClick={() => assignClient(member.id, client.id)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                              assigned ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-stone-500 border-stone-200 hover:border-indigo-300'
                            }`}>
                            {assigned && <Check className="w-2.5 h-2.5 inline mr-1" />}
                            {client.company}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <button onClick={() => setDeleteTarget(member)}
                  className="text-stone-300 hover:text-red-400 transition-colors shrink-0 mt-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}

        {activeMembers.length === 0 && (
          <div className="text-center text-stone-400 text-sm py-12 bg-white border border-stone-200 rounded-2xl">
            No team members yet. Add your first member above.
          </div>
        )}
      </div>
    </div>
  )
}
