import { createFileRoute } from '@tanstack/react-router'
import { Search, ShieldCheck, UserCog, UserMinus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminRouteGuard } from '../../components/admin/AdminRouteGuard'
import { AdminShell } from '../../components/admin/AdminShell'
import {
  ORGANIZATION_ROLES,
  expectedOrganizationLevel,
  organizationLevelLabel,
  organizationRoleLabel,
  type OrganizationLevel,
  type OrganizationRole,
} from '../../lib/organization'
import { supabase } from '../../lib/supabase/client'

export const Route = createFileRoute('/admin/roles')({
  component: RolesAdminPage,
})

type OrgUnit = {
  id: string
  level: OrganizationLevel
  name: string
  code: string
  is_active: boolean
}

type MemberOption = {
  user_id: string
  full_name: string
  member_no: string | null
  district: string
  taluka: string | null
}

type Profile = { id: string; email: string | null }

type Assignment = {
  id: string
  user_id: string
  role: OrganizationRole
  org_unit_id: string
  assigned_by: string | null
  assigned_at: string
  is_active: boolean
  revoked_at: string | null
  note: string | null
}

function RolesAdminPage() {
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState<OrganizationRole>('district_coordinator')
  const [orgUnitId, setOrgUnitId] = useState('')
  const [note, setNote] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    const [unitsResult, membersResult, profilesResult, assignmentsResult] = await Promise.all([
      supabase.from('organization_units').select('id, level, name, code, is_active').order('name'),
      supabase.from('members').select('user_id, full_name, member_no, district, taluka').order('full_name'),
      supabase.from('profiles').select('id, email').order('email'),
      supabase.from('organization_role_assignments').select('id, user_id, role, org_unit_id, assigned_by, assigned_at, is_active, revoked_at, note').order('assigned_at', { ascending: false }),
    ])

    const firstError = unitsResult.error ?? membersResult.error ?? profilesResult.error ?? assignmentsResult.error
    if (firstError) setError(firstError.message)
    else {
      setUnits((unitsResult.data ?? []) as OrgUnit[])
      setMembers((membersResult.data ?? []) as MemberOption[])
      setProfiles((profilesResult.data ?? []) as Profile[])
      setAssignments((assignmentsResult.data ?? []) as Assignment[])
    }
    setLoading(false)
  }

  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles])
  const memberByUser = useMemo(() => new Map(members.map((member) => [member.user_id, member])), [members])
  const unitById = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units])

  const memberOptions = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    return profiles
      .map((profile) => ({ profile, member: memberByUser.get(profile.id) }))
      .filter(({ profile, member }) => !query || `${member?.full_name ?? ''} ${member?.member_no ?? ''} ${profile.email ?? ''} ${member?.district ?? ''}`.toLowerCase().includes(query))
      .slice(0, 100)
  }, [memberByUser, memberSearch, profiles])

  const expectedLevel = expectedOrganizationLevel(role)
  const scopeOptions = useMemo(() => units.filter((unit) => unit.is_active && (!expectedLevel || unit.level === expectedLevel)), [expectedLevel, units])

  useEffect(() => {
    if (orgUnitId && !scopeOptions.some((unit) => unit.id === orgUnitId)) setOrgUnitId('')
  }, [orgUnitId, scopeOptions])

  async function assignRole() {
    if (!selectedUserId || !orgUnitId) {
      setError('Select a user and organization scope.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')

    const { error: assignError } = await supabase.rpc('assign_organization_role', {
      p_user_id: selectedUserId,
      p_role: role,
      p_org_unit_id: orgUnitId,
      p_note: note.trim() || null,
    })

    if (assignError) setError(assignError.message)
    else {
      setMessage('Role assigned successfully. The change is recorded in the audit log.')
      setNote('')
      await loadData()
    }
    setSaving(false)
  }

  async function revokeRole(assignment: Assignment) {
    if (!window.confirm(`Revoke ${organizationRoleLabel(assignment.role)} from this user?`)) return
    setSaving(true)
    setError('')
    setMessage('')
    const { error: revokeError } = await supabase.rpc('revoke_organization_role', { p_assignment_id: assignment.id })
    if (revokeError) setError(revokeError.message)
    else {
      setMessage('Role revoked. The previous assignment remains in history for auditability.')
      await loadData()
    }
    setSaving(false)
  }

  const visibleAssignments = assignments.filter((assignment) => showInactive || assignment.is_active)

  return (
    <AdminRouteGuard>
      <AdminShell title="Roles & Permissions" subtitle="Assign database-enforced PTI organizational access by geography and responsibility.">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="flex items-center gap-2 text-emerald-800">
              <UserCog className="h-5 w-5" />
              <h2 className="text-lg font-black">Assign organization role</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Membership is self-issued, but operational authority is explicitly assigned and scoped here.</p>

            {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
            {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <label>
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Find user</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} className="input pl-10" placeholder="Name, member no, email or district" />
                  </div>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">User</span>
                  <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="input">
                    <option value="">Select user</option>
                    {memberOptions.map(({ profile, member }) => (
                      <option key={profile.id} value={profile.id}>
                        {member?.full_name ?? profile.email ?? profile.id} {member?.member_no ? `· ${member.member_no}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value as OrganizationRole)} className="input">
                    {ORGANIZATION_ROLES.map((item) => <option key={item} value={item}>{organizationRoleLabel(item)}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Scope</span>
                  <select value={orgUnitId} onChange={(event) => setOrgUnitId(event.target.value)} className="input">
                    <option value="">Select organization unit</option>
                    {scopeOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Note (optional)</span>
                  <input value={note} onChange={(event) => setNote(event.target.value)} className="input" placeholder="Appointment reference, purpose or internal note" />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" disabled={saving || loading} onClick={() => void assignRole()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                <ShieldCheck className="h-4 w-4" />
                {saving ? 'Saving…' : 'Assign role'}
              </button>
              <span className="text-xs font-bold text-slate-500">
                {expectedLevel ? `This role requires a ${organizationLevelLabel(expectedLevel)} scope.` : 'This role can be assigned to any active organization scope.'}
              </span>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">Role assignments</h2>
                <p className="mt-1 text-sm text-slate-500">Active assignments drive future province/division/district/tehsil dashboard scope.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
                Show revoked history
              </label>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading role assignments…</td></tr>
                  ) : visibleAssignments.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No role assignments found.</td></tr>
                  ) : visibleAssignments.map((assignment) => {
                    const member = memberByUser.get(assignment.user_id)
                    const profile = profileById.get(assignment.user_id)
                    const unit = unitById.get(assignment.org_unit_id)
                    return (
                      <tr key={assignment.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-black text-slate-900">{member?.full_name ?? profile?.email ?? assignment.user_id}</div>
                          <div className="mt-0.5 text-xs text-slate-400">{member?.member_no ?? profile?.email ?? assignment.user_id}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">{organizationRoleLabel(assignment.role)}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-700">{unit?.name ?? 'Unknown unit'}</div>
                          <div className="text-xs text-slate-400">{unit ? organizationLevelLabel(unit.level) : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(assignment.assigned_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${assignment.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {assignment.is_active ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {assignment.is_active ? (
                            <button type="button" disabled={saving} onClick={() => void revokeRole(assignment)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-50">
                              <UserMinus className="h-3.5 w-3.5" /> Revoke
                            </button>
                          ) : <span className="text-xs text-slate-400">History</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminRouteGuard>
  )
}
