import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCw,
  Save,
  ScanLine,
  ShieldCheck,
  UserCog,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  completionPercent,
  dutyPriorityOptions,
  dutyStatusLabels,
  formatOperationDate,
  fromDateTimeLocal,
  operationKindLabels,
  operationKindOptions,
  operationStatusLabels,
  operationStatusOptions,
  type DutyAssignment,
  type DutyPriority,
  type OperationCoordinator,
  type OperationCoordinatorRole,
  type OperationDuty,
  type OperationKind,
  type OperationShift,
  type OperationStatus,
  type OperationSummary,
  type OperationTeam,
  type OperationTeamMember,
} from '../../lib/operations'
import { organizationLevelLabel, organizationRoleLabel } from '../../lib/organization'
import { supabase } from '../../lib/supabase/client'
import type { Tables } from '../../lib/supabase/database.types'
import type { OrganizationUnitRow, VolunteerDirectoryRow } from '../../lib/volunteers'

export const Route = createFileRoute('/operations/workbench')({ component: OperationsWorkbenchPage })

type Access = { can_view: boolean; can_manage: boolean; can_create: boolean }
type CoordinatorCandidate = {
  user_id: string
  email: string | null
  role: Tables<'organization_role_assignments'>['role']
  org_unit_id: string
  org_unit_name: string
}

type OperationForm = {
  title: string
  kind: OperationKind
  status: OperationStatus
  orgUnitId: string
  location: string
  startsAt: string
  endsAt: string
  description: string
}

type TeamForm = { name: string; orgUnitId: string; description: string; leadVolunteerId: string }
type ShiftForm = { name: string; orgUnitId: string; startsAt: string; endsAt: string; location: string; capacity: string }
type DutyForm = {
  title: string
  orgUnitId: string
  teamId: string
  shiftId: string
  priority: DutyPriority
  startsAt: string
  endsAt: string
  location: string
  instructions: string
}

const emptyOperationForm: OperationForm = { title: '', kind: 'other', status: 'draft', orgUnitId: '', location: '', startsAt: '', endsAt: '', description: '' }
const emptyTeamForm: TeamForm = { name: '', orgUnitId: '', description: '', leadVolunteerId: '' }
const emptyShiftForm: ShiftForm = { name: '', orgUnitId: '', startsAt: '', endsAt: '', location: '', capacity: '' }
const emptyDutyForm: DutyForm = { title: '', orgUnitId: '', teamId: '', shiftId: '', priority: 'normal', startsAt: '', endsAt: '', location: '', instructions: '' }

function OperationsWorkbenchPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [access, setAccess] = useState<Access>({ can_view: false, can_manage: false, can_create: false })
  const [operations, setOperations] = useState<OperationSummary[]>([])
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitRow[]>([])
  const [volunteers, setVolunteers] = useState<VolunteerDirectoryRow[]>([])
  const [selectedOperationId, setSelectedOperationId] = useState('')
  const [operationForm, setOperationForm] = useState<OperationForm>(emptyOperationForm)
  const [creatingOperation, setCreatingOperation] = useState(false)
  const [teams, setTeams] = useState<OperationTeam[]>([])
  const [teamMembers, setTeamMembers] = useState<OperationTeamMember[]>([])
  const [shifts, setShifts] = useState<OperationShift[]>([])
  const [duties, setDuties] = useState<OperationDuty[]>([])
  const [assignments, setAssignments] = useState<DutyAssignment[]>([])
  const [coordinators, setCoordinators] = useState<OperationCoordinator[]>([])
  const [coordinatorCandidates, setCoordinatorCandidates] = useState<CoordinatorCandidate[]>([])
  const [teamForm, setTeamForm] = useState<TeamForm>(emptyTeamForm)
  const [shiftForm, setShiftForm] = useState<ShiftForm>(emptyShiftForm)
  const [dutyForm, setDutyForm] = useState<DutyForm>(emptyDutyForm)
  const [memberTeamId, setMemberTeamId] = useState('')
  const [memberVolunteerId, setMemberVolunteerId] = useState('')
  const [assignmentDutyId, setAssignmentDutyId] = useState('')
  const [assignmentVolunteerId, setAssignmentVolunteerId] = useState('')
  const [coordinatorUserId, setCoordinatorUserId] = useState('')
  const [coordinatorRole, setCoordinatorRole] = useState<OperationCoordinatorRole>('coordinator')

  useEffect(() => { void loadPage() }, [])
  useEffect(() => { if (selectedOperationId) void loadOperationDetail(selectedOperationId) }, [selectedOperationId])

  const selectedOperation = useMemo(() => operations.find((item) => item.id === selectedOperationId) ?? null, [operations, selectedOperationId])
  const orgById = useMemo(() => new Map(orgUnits.map((item) => [item.id, item])), [orgUnits])
  const volunteerById = useMemo(() => new Map(volunteers.map((item) => [item.id, item])), [volunteers])
  const teamById = useMemo(() => new Map(teams.map((item) => [item.id, item])), [teams])
  const shiftById = useMemo(() => new Map(shifts.map((item) => [item.id, item])), [shifts])
  const assignmentsByDuty = useMemo(() => {
    const map = new Map<string, DutyAssignment[]>()
    for (const row of assignments) map.set(row.duty_id, [...(map.get(row.duty_id) ?? []), row])
    return map
  }, [assignments])

  async function loadPage() {
    setLoading(true); setError('')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { void navigate({ to: '/login' }); return }

    const { data: accessRows, error: accessError } = await supabase.rpc('my_operations_workbench_access')
    if (accessError) { setError(accessError.message); setLoading(false); return }
    const nextAccess = ((accessRows ?? [])[0] ?? { can_view: false, can_manage: false, can_create: false }) as Access
    setAccess(nextAccess)
    if (!nextAccess.can_view) { setLoading(false); return }

    const [operationResult, orgResult, volunteerResult] = await Promise.all([
      supabase.rpc('list_operations_for_my_scope'),
      supabase.from('organization_units').select('*').eq('is_active', true).order('level').order('name'),
      supabase.rpc('list_volunteers_for_my_scope'),
    ])
    const firstError = operationResult.error ?? orgResult.error ?? volunteerResult.error
    if (firstError) { setError(firstError.message); setLoading(false); return }

    const nextOperations = (operationResult.data ?? []) as OperationSummary[]
    setOperations(nextOperations)
    setOrgUnits((orgResult.data ?? []) as OrganizationUnitRow[])
    setVolunteers((volunteerResult.data ?? []) as VolunteerDirectoryRow[])
    if (!selectedOperationId && nextOperations[0]) setSelectedOperationId(nextOperations[0].id)
    setLoading(false)
  }

  async function loadOperationDetail(operationId: string) {
    setError('')
    const [teamResult, memberResult, shiftResult, dutyResult, assignmentResult, coordinatorResult, candidateResult] = await Promise.all([
      supabase.from('operation_teams').select('*').eq('operation_id', operationId).order('name'),
      supabase.from('operation_team_members').select('*'),
      supabase.from('operation_shifts').select('*').eq('operation_id', operationId).order('starts_at'),
      supabase.from('operation_duties').select('*').eq('operation_id', operationId).order('created_at'),
      supabase.from('duty_assignments').select('*').order('assigned_at', { ascending: false }),
      supabase.from('operation_coordinators').select('*').eq('operation_id', operationId).order('assigned_at'),
      supabase.rpc('list_operation_coordinator_candidates', { p_operation_id: operationId }),
    ])
    const firstError = teamResult.error ?? memberResult.error ?? shiftResult.error ?? dutyResult.error ?? assignmentResult.error ?? coordinatorResult.error ?? candidateResult.error
    if (firstError) { setError(firstError.message); return }

    const nextTeams = (teamResult.data ?? []) as OperationTeam[]
    const teamIds = new Set(nextTeams.map((row) => row.id))
    const nextDuties = (dutyResult.data ?? []) as OperationDuty[]
    const dutyIds = new Set(nextDuties.map((row) => row.id))
    setTeams(nextTeams)
    setTeamMembers(((memberResult.data ?? []) as OperationTeamMember[]).filter((row) => teamIds.has(row.team_id)))
    setShifts((shiftResult.data ?? []) as OperationShift[])
    setDuties(nextDuties)
    setAssignments(((assignmentResult.data ?? []) as DutyAssignment[]).filter((row) => dutyIds.has(row.duty_id)))
    setCoordinators((coordinatorResult.data ?? []) as OperationCoordinator[])
    setCoordinatorCandidates((candidateResult.data ?? []) as CoordinatorCandidate[])
    setTeamForm((current) => ({ ...emptyTeamForm, orgUnitId: current.orgUnitId || selectedOperation?.org_unit_id || '' }))
    setShiftForm((current) => ({ ...emptyShiftForm, orgUnitId: current.orgUnitId || selectedOperation?.org_unit_id || '' }))
    setDutyForm((current) => ({ ...emptyDutyForm, orgUnitId: current.orgUnitId || selectedOperation?.org_unit_id || '' }))
  }

  async function saveOperation(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!operationForm.orgUnitId) { setError('Select an organization scope.'); return }
    setSaving(true)
    const { data, error: saveError } = await supabase.rpc('save_operation', {
      p_operation_id: creatingOperation ? null : (selectedOperationId || null),
      p_org_unit_id: operationForm.orgUnitId,
      p_payload: {
        title: operationForm.title.trim(), kind: operationForm.kind, status: operationForm.status,
        location: operationForm.location.trim(), description: operationForm.description.trim(),
        starts_at: fromDateTimeLocal(operationForm.startsAt), ends_at: fromDateTimeLocal(operationForm.endsAt),
      },
    })
    if (saveError) { setError(saveError.message); setSaving(false); return }
    setSuccess(creatingOperation ? 'Operation created.' : 'Operation updated.')
    setCreatingOperation(false); setOperationForm(emptyOperationForm)
    await loadPage()
    if (data) setSelectedOperationId(data)
    setSaving(false)
  }

  function editSelectedOperation() {
    if (!selectedOperation) return
    setCreatingOperation(false)
    setOperationForm({
      title: selectedOperation.title, kind: selectedOperation.kind, status: selectedOperation.status,
      orgUnitId: selectedOperation.org_unit_id, location: selectedOperation.location ?? '',
      startsAt: toLocal(selectedOperation.starts_at), endsAt: toLocal(selectedOperation.ends_at), description: selectedOperation.description ?? '',
    })
  }

  async function saveTeam(event: FormEvent) {
    event.preventDefault(); if (!selectedOperationId) return; setSaving(true); clearMessages()
    const { error: saveError } = await supabase.rpc('save_operation_team', {
      p_team_id: null, p_operation_id: selectedOperationId, p_org_unit_id: teamForm.orgUnitId || selectedOperation?.org_unit_id || '',
      p_name: teamForm.name.trim(), p_description: teamForm.description.trim(), p_lead_volunteer_id: teamForm.leadVolunteerId || null,
    })
    await finishDetailAction(saveError?.message, 'Team created.', () => setTeamForm({ ...emptyTeamForm, orgUnitId: selectedOperation?.org_unit_id ?? '' }))
  }

  async function saveShift(event: FormEvent) {
    event.preventDefault(); if (!selectedOperationId) return; setSaving(true); clearMessages()
    const starts = fromDateTimeLocal(shiftForm.startsAt); const ends = fromDateTimeLocal(shiftForm.endsAt)
    if (!starts || !ends) { setError('Shift start and end are required.'); setSaving(false); return }
    const { error: saveError } = await supabase.rpc('save_operation_shift', {
      p_shift_id: null, p_operation_id: selectedOperationId, p_org_unit_id: shiftForm.orgUnitId || selectedOperation?.org_unit_id || '',
      p_name: shiftForm.name.trim(), p_starts_at: starts, p_ends_at: ends, p_location: shiftForm.location.trim(),
      p_capacity: shiftForm.capacity ? Number(shiftForm.capacity) : null,
    })
    await finishDetailAction(saveError?.message, 'Shift created.', () => setShiftForm({ ...emptyShiftForm, orgUnitId: selectedOperation?.org_unit_id ?? '' }))
  }

  async function saveDuty(event: FormEvent) {
    event.preventDefault(); if (!selectedOperationId) return; setSaving(true); clearMessages()
    const { error: saveError } = await supabase.rpc('save_operation_duty', {
      p_duty_id: null, p_operation_id: selectedOperationId, p_org_unit_id: dutyForm.orgUnitId || selectedOperation?.org_unit_id || '',
      p_team_id: dutyForm.teamId || null, p_shift_id: dutyForm.shiftId || null,
      p_payload: { title: dutyForm.title.trim(), instructions: dutyForm.instructions.trim(), location: dutyForm.location.trim(), priority: dutyForm.priority, starts_at: fromDateTimeLocal(dutyForm.startsAt), ends_at: fromDateTimeLocal(dutyForm.endsAt) },
    })
    await finishDetailAction(saveError?.message, 'Duty created.', () => setDutyForm({ ...emptyDutyForm, orgUnitId: selectedOperation?.org_unit_id ?? '' }))
  }

  async function addTeamMember() {
    if (!memberTeamId || !memberVolunteerId) return
    setSaving(true); clearMessages()
    const { error: saveError } = await supabase.rpc('set_operation_team_member', { p_team_id: memberTeamId, p_volunteer_id: memberVolunteerId, p_is_active: true })
    await finishDetailAction(saveError?.message, 'Volunteer added to team.', () => { setMemberVolunteerId('') })
  }

  async function assignDuty() {
    if (!assignmentDutyId || !assignmentVolunteerId) return
    setSaving(true); clearMessages()
    const { error: saveError } = await supabase.rpc('assign_operation_duty', { p_duty_id: assignmentDutyId, p_volunteer_id: assignmentVolunteerId })
    await finishDetailAction(saveError?.message, 'Duty assigned.', () => setAssignmentVolunteerId(''))
  }

  async function assignCoordinator() {
    if (!selectedOperationId || !coordinatorUserId) return
    setSaving(true); clearMessages()
    const { error: saveError } = await supabase.rpc('set_operation_coordinator', { p_operation_id: selectedOperationId, p_user_id: coordinatorUserId, p_role: coordinatorRole, p_is_active: true })
    await finishDetailAction(saveError?.message, 'Operation coordinator assigned.', () => setCoordinatorUserId(''))
  }

  async function removeTeamMember(teamId: string, volunteerId: string) {
    setSaving(true); clearMessages()
    const { error: saveError } = await supabase.rpc('set_operation_team_member', { p_team_id: teamId, p_volunteer_id: volunteerId, p_is_active: false })
    await finishDetailAction(saveError?.message, 'Volunteer removed from team.')
  }

  async function revokeCoordinator(row: OperationCoordinator) {
    if (!selectedOperationId) return
    setSaving(true); clearMessages()
    const { error: saveError } = await supabase.rpc('set_operation_coordinator', { p_operation_id: selectedOperationId, p_user_id: row.user_id, p_role: row.role, p_is_active: false })
    await finishDetailAction(saveError?.message, 'Operation coordinator revoked.')
  }

  async function cancelAssignment(row: DutyAssignment) {
    const reason = window.prompt('Optional cancellation reason:') ?? ''
    setSaving(true); clearMessages()
    const { error: saveError } = await supabase.rpc('cancel_duty_assignment', { p_assignment_id: row.id, p_reason: reason })
    await finishDetailAction(saveError?.message, 'Duty assignment cancelled.')
  }

  async function finishDetailAction(message: string | undefined, successMessage: string, reset?: () => void) {
    if (message) { setError(message); setSaving(false); return }
    setSuccess(successMessage); reset?.(); if (selectedOperationId) await loadOperationDetail(selectedOperationId); await loadPage(); setSaving(false)
  }

  function clearMessages() { setError(''); setSuccess('') }

  if (loading) return <LoadingCard label="Loading operations command center…" />
  if (!access.can_view) return <AccessDenied />

  return (
    <main className="px-4 py-8 md:py-10">
      <div className="page-wrap space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-600 via-white to-red-700" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">PTI Operations — Phase 3</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">Operations, teams & duties.</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">Plan reusable field operations, create local teams and shifts, assign duties to volunteers, and monitor execution inside your authorized organization scope.</p>
            </div>
            <div className="flex flex-wrap gap-2"><HeroPill icon={<ShieldCheck className="h-4 w-4" />} text={access.can_manage ? 'Scoped manager' : 'Read-only'} /><HeroPill icon={<Activity className="h-4 w-4" />} text={`${operations.length} visible operations`} /></div>
          </div>
        </header>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {success ? <Notice tone="success">{success}</Notice> : null}

        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Operations</p><h2 className="mt-1 text-xl font-black text-slate-950">Command list</h2></div>{access.can_create ? <button onClick={() => { setCreatingOperation(true); setOperationForm(emptyOperationForm); clearMessages() }} className="rounded-xl bg-emerald-700 p-2.5 text-white"><Plus className="h-4 w-4" /></button> : null}</div>
              <div className="mt-4 space-y-2">
                {operations.map((operation) => <button key={operation.id} onClick={() => { setSelectedOperationId(operation.id); setCreatingOperation(false); setOperationForm(emptyOperationForm) }} className={`w-full rounded-2xl p-4 text-left ring-1 transition ${selectedOperationId === operation.id ? 'bg-slate-950 text-white ring-slate-950' : 'bg-slate-50 text-slate-900 ring-slate-200 hover:bg-slate-100'}`}><div className="flex items-start justify-between gap-3"><p className="font-black">{operation.title}</p><StatusBadge status={operation.status} /></div><p className={`mt-2 text-xs font-bold ${selectedOperationId === operation.id ? 'text-white/60' : 'text-slate-500'}`}>{operationKindLabels[operation.kind]} · {operation.org_unit_name}</p><p className={`mt-1 text-xs font-semibold ${selectedOperationId === operation.id ? 'text-white/50' : 'text-slate-400'}`}>{formatOperationDate(operation.starts_at)}</p></button>)}
                {!operations.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No operations are visible in your scope yet.</p> : null}
              </div>
            </div>
            <Link to="/operations/volunteers" className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200/70 hover:bg-slate-50"><UsersRound className="h-5 w-5 text-emerald-700" /> Open Volunteer Workbench</Link>
            <Link to="/operations/attendance" className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200/70 hover:bg-slate-50"><ScanLine className="h-5 w-5 text-emerald-700" /> Open Attendance Workbench</Link>
          </aside>

          <div className="space-y-5">
            {creatingOperation || operationForm.title || (!selectedOperation && access.can_create) ? <OperationEditor form={operationForm} setForm={setOperationForm} orgUnits={orgUnits} saving={saving} onSubmit={saveOperation} title={creatingOperation ? 'Create operation' : 'Edit operation'} /> : null}

            {selectedOperation ? <>
              <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={selectedOperation.status} /><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{operationKindLabels[selectedOperation.kind]}</span></div><h2 className="mt-3 text-2xl font-black text-slate-950">{selectedOperation.title}</h2><p className="mt-2 text-sm font-semibold text-slate-500">{selectedOperation.org_unit_name} · {organizationLevelLabel(selectedOperation.org_level)}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{selectedOperation.description || 'No description added.'}</p></div>{access.can_manage ? <button onClick={editSelectedOperation} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Edit operation</button> : null}</div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Teams" value={selectedOperation.team_count} /><Metric label="Shifts" value={selectedOperation.shift_count} /><Metric label="Duties" value={selectedOperation.duty_count} /><Metric label="Assignments" value={selectedOperation.assignment_count} /><Metric label="Completed" value={`${completionPercent(selectedOperation.completed_count, selectedOperation.assignment_count)}%`} /></div>
              </section>

              <div className="grid gap-5 2xl:grid-cols-2">
                <Panel title="Shifts & schedule" icon={<CalendarClock className="h-5 w-5" />} count={shifts.length}>
                  <div className="space-y-2">{shifts.map((shift) => <RowCard key={shift.id} title={shift.name} subtitle={`${formatOperationDate(shift.starts_at)} → ${formatOperationDate(shift.ends_at)}`} meta={`${shift.location || 'No location'}${shift.capacity ? ` · Capacity ${shift.capacity}` : ''}`} />)}</div>
                  {access.can_manage ? <form onSubmit={saveShift} className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="Shift name" value={shiftForm.name} onChange={(v) => setShiftForm({ ...shiftForm, name: v })} /><OrgSelect label="Scope" value={shiftForm.orgUnitId} onChange={(v) => setShiftForm({ ...shiftForm, orgUnitId: v })} rows={orgUnits} /><Input label="Start" type="datetime-local" value={shiftForm.startsAt} onChange={(v) => setShiftForm({ ...shiftForm, startsAt: v })} /><Input label="End" type="datetime-local" value={shiftForm.endsAt} onChange={(v) => setShiftForm({ ...shiftForm, endsAt: v })} /><Input label="Location" value={shiftForm.location} onChange={(v) => setShiftForm({ ...shiftForm, location: v })} /><Input label="Capacity" type="number" value={shiftForm.capacity} onChange={(v) => setShiftForm({ ...shiftForm, capacity: v })} /><SubmitButton saving={saving} label="Add shift" /></form> : null}
                </Panel>

                <Panel title="Operation coordinators" icon={<UserCog className="h-5 w-5" />} count={coordinators.filter((row) => row.is_active).length}>
                  <div className="space-y-2">{coordinators.filter((row) => row.is_active).map((row) => { const candidate = coordinatorCandidates.find((item) => item.user_id === row.user_id); return <div key={row.id} className="flex items-center gap-2"><div className="min-w-0 flex-1"><RowCard title={candidate?.email || row.user_id.slice(0, 8)} subtitle={row.role === 'coordinator' ? 'Coordinator' : 'Supervisor'} meta={candidate ? `${organizationRoleLabel(candidate.role)} · ${candidate.org_unit_name}` : 'Authorized operation assignment'} /></div>{access.can_manage ? <button type="button" title="Revoke coordinator" onClick={() => void revokeCoordinator(row)} className="rounded-xl border border-red-200 p-2 text-red-700"><X className="h-4 w-4" /></button> : null}</div> })}</div>
                  {access.can_manage ? <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><Select label="Office bearer" value={coordinatorUserId} onChange={setCoordinatorUserId} options={[{ value: '', label: 'Select user' }, ...coordinatorCandidates.map((item) => ({ value: item.user_id, label: `${item.email || item.user_id.slice(0, 8)} — ${organizationRoleLabel(item.role)}` }))]} /><Select label="Role" value={coordinatorRole} onChange={(v) => setCoordinatorRole(v as OperationCoordinatorRole)} options={[{ value: 'coordinator', label: 'Coordinator' }, { value: 'supervisor', label: 'Supervisor' }]} /><button onClick={() => void assignCoordinator()} disabled={saving || !coordinatorUserId} className="self-end rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Assign</button></div> : null}
                </Panel>
              </div>

              <Panel title="Teams & members" icon={<UsersRound className="h-5 w-5" />} count={teams.filter((row) => row.is_active).length}>
                <div className="grid gap-3 lg:grid-cols-2">{teams.filter((row) => row.is_active).map((team) => { const members = teamMembers.filter((row) => row.team_id === team.id && row.is_active); const leader = team.lead_volunteer_id ? volunteerById.get(team.lead_volunteer_id) : null; return <div key={team.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{team.name}</p><p className="mt-1 text-xs font-bold text-slate-500">{orgById.get(team.org_unit_id)?.name ?? 'Organization scope'} · {members.length} members</p></div>{leader ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">Lead: {leader.full_name}</span> : null}</div><p className="mt-3 text-sm text-slate-600">{team.description || 'No description.'}</p><div className="mt-3 flex flex-wrap gap-2">{members.slice(0, 8).map((member) => <span key={member.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{volunteerById.get(member.volunteer_id)?.full_name ?? member.volunteer_id.slice(0, 8)}{access.can_manage ? <button type="button" title="Remove member" onClick={() => void removeTeamMember(team.id, member.volunteer_id)} className="text-slate-400 hover:text-red-700"><X className="h-3 w-3" /></button> : null}</span>)}</div></div> })}</div>
                {access.can_manage ? <div className="mt-5 grid gap-5 xl:grid-cols-2"><form onSubmit={saveTeam} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black text-slate-900">Create team</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><Input label="Team name" value={teamForm.name} onChange={(v) => setTeamForm({ ...teamForm, name: v })} /><OrgSelect label="Scope" value={teamForm.orgUnitId} onChange={(v) => setTeamForm({ ...teamForm, orgUnitId: v })} rows={orgUnits} /><VolunteerSelect label="Team lead (optional)" value={teamForm.leadVolunteerId} onChange={(v) => setTeamForm({ ...teamForm, leadVolunteerId: v })} rows={volunteers} /><Input label="Description" value={teamForm.description} onChange={(v) => setTeamForm({ ...teamForm, description: v })} /><SubmitButton saving={saving} label="Create team" /></div></form><div className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black text-slate-900">Add volunteer to team</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><Select label="Team" value={memberTeamId} onChange={setMemberTeamId} options={[{ value: '', label: 'Select team' }, ...teams.filter((row) => row.is_active).map((row) => ({ value: row.id, label: row.name }))]} /><VolunteerSelect label="Volunteer" value={memberVolunteerId} onChange={setMemberVolunteerId} rows={volunteers} /><button type="button" onClick={() => void addTeamMember()} disabled={saving || !memberTeamId || !memberVolunteerId} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-2"><UserPlus className="mr-2 inline h-4 w-4" /> Add member</button></div></div></div> : null}
              </Panel>

              <Panel title="Duties & assignments" icon={<ClipboardList className="h-5 w-5" />} count={duties.filter((row) => row.is_active).length}>
                <div className="space-y-3">{duties.filter((row) => row.is_active).map((duty) => { const dutyAssignments = assignmentsByDuty.get(duty.id) ?? []; return <div key={duty.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{duty.title}</p><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase text-amber-700">{duty.priority}</span></div><p className="mt-1 text-xs font-bold text-slate-500">{teamById.get(duty.team_id ?? '')?.name || 'No team'} · {shiftById.get(duty.shift_id ?? '')?.name || formatOperationDate(duty.starts_at)}</p><p className="mt-2 text-sm text-slate-600">{duty.instructions || 'No instructions.'}</p></div><span className="text-xs font-black text-slate-400">{dutyAssignments.length} assigned</span></div><div className="mt-3 flex flex-wrap gap-2">{dutyAssignments.map((assignment) => <span key={assignment.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{volunteerById.get(assignment.volunteer_id)?.full_name ?? assignment.volunteer_id.slice(0, 8)} · {dutyStatusLabels[assignment.status]}{access.can_manage && assignment.status !== 'completed' && assignment.status !== 'cancelled' ? <button type="button" title="Cancel assignment" onClick={() => void cancelAssignment(assignment)} className="text-slate-400 hover:text-red-700"><X className="h-3 w-3" /></button> : null}</span>)}</div></div> })}</div>
                {access.can_manage ? <div className="mt-5 grid gap-5 xl:grid-cols-2"><form onSubmit={saveDuty} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black text-slate-900">Create duty</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><Input label="Duty title" value={dutyForm.title} onChange={(v) => setDutyForm({ ...dutyForm, title: v })} /><OrgSelect label="Scope" value={dutyForm.orgUnitId} onChange={(v) => setDutyForm({ ...dutyForm, orgUnitId: v })} rows={orgUnits} /><Select label="Team (optional)" value={dutyForm.teamId} onChange={(v) => setDutyForm({ ...dutyForm, teamId: v })} options={[{ value: '', label: 'No team' }, ...teams.filter((row) => row.is_active).map((row) => ({ value: row.id, label: row.name }))]} /><Select label="Shift (optional)" value={dutyForm.shiftId} onChange={(v) => setDutyForm({ ...dutyForm, shiftId: v })} options={[{ value: '', label: 'No shift' }, ...shifts.filter((row) => row.is_active).map((row) => ({ value: row.id, label: row.name }))]} /><Select label="Priority" value={dutyForm.priority} onChange={(v) => setDutyForm({ ...dutyForm, priority: v as DutyPriority })} options={dutyPriorityOptions} /><Input label="Location" value={dutyForm.location} onChange={(v) => setDutyForm({ ...dutyForm, location: v })} /><Input label="Start (optional)" type="datetime-local" value={dutyForm.startsAt} onChange={(v) => setDutyForm({ ...dutyForm, startsAt: v })} /><Input label="End (optional)" type="datetime-local" value={dutyForm.endsAt} onChange={(v) => setDutyForm({ ...dutyForm, endsAt: v })} /><div className="sm:col-span-2"><Input label="Instructions" value={dutyForm.instructions} onChange={(v) => setDutyForm({ ...dutyForm, instructions: v })} /></div><SubmitButton saving={saving} label="Create duty" /></div></form><div className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black text-slate-900">Assign duty</h3><div className="mt-3 grid gap-3"><Select label="Duty" value={assignmentDutyId} onChange={setAssignmentDutyId} options={[{ value: '', label: 'Select duty' }, ...duties.filter((row) => row.is_active).map((row) => ({ value: row.id, label: row.title }))]} /><VolunteerSelect label="Volunteer" value={assignmentVolunteerId} onChange={setAssignmentVolunteerId} rows={volunteers} /><button type="button" onClick={() => void assignDuty()} disabled={saving || !assignmentDutyId || !assignmentVolunteerId} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><BadgeCheck className="mr-2 inline h-4 w-4" /> Assign duty</button></div></div></div> : null}
              </Panel>
            </> : !creatingOperation ? <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/70"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" /><h2 className="mt-3 text-xl font-black">Ready for the first operation</h2><p className="mt-2 text-sm font-semibold text-slate-500">Create an operation in an organization scope you manage.</p></section> : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function OperationEditor({ form, setForm, orgUnits, saving, onSubmit, title }: { form: OperationForm; setForm: (value: OperationForm) => void; orgUnits: OrganizationUnitRow[]; saving: boolean; onSubmit: (event: FormEvent) => void; title: string }) {
  return <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700"><Save className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="text-sm font-semibold text-slate-500">Generic operations stay reusable for marches, gatherings, conventions and field campaigns.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input label="Operation title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} /><OrgSelect label="Organization scope" value={form.orgUnitId} onChange={(v) => setForm({ ...form, orgUnitId: v })} rows={orgUnits} /><Select label="Type" value={form.kind} onChange={(v) => setForm({ ...form, kind: v as OperationKind })} options={operationKindOptions} /><Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v as OperationStatus })} options={operationStatusOptions} /><Input label="Start" type="datetime-local" value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} /><Input label="End" type="datetime-local" value={form.endsAt} onChange={(v) => setForm({ ...form, endsAt: v })} /><Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} /><Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} /><SubmitButton saving={saving} label="Save operation" /></div></form>
}

function Panel({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) { return <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-700">{icon}</span><h2 className="text-lg font-black text-slate-950">{title}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{count}</span></div>{children}</section> }
function RowCard({ title, subtitle, meta }: { title: string; subtitle: string; meta: string }) { return <div className="rounded-2xl border border-slate-200 p-4"><p className="font-black text-slate-950">{title}</p><p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p><p className="mt-1 text-xs font-semibold text-slate-400">{meta}</p></div> }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div> }
function StatusBadge({ status }: { status: OperationStatus }) { const styles = status === 'active' ? 'bg-emerald-100 text-emerald-800' : status === 'cancelled' ? 'bg-red-100 text-red-800' : status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${styles}`}>{operationStatusLabels[status]}</span> }
function HeroPill({ icon, text }: { icon: React.ReactNode; text: string }) { return <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white/80">{icon}{text}</span> }
function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} /></label> }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) { return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>{options.map((item) => <option key={`${item.value}-${item.label}`} value={item.value}>{item.label}</option>)}</select></label> }
function OrgSelect({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: OrganizationUnitRow[] }) { return <Select label={label} value={value} onChange={onChange} options={[{ value: '', label: 'Select scope' }, ...rows.map((row) => ({ value: row.id, label: `${row.name} — ${organizationLevelLabel(row.level)}` }))]} /> }
function VolunteerSelect({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: VolunteerDirectoryRow[] }) { return <Select label={label} value={value} onChange={onChange} options={[{ value: '', label: 'Select volunteer' }, ...rows.filter((row) => row.is_active).map((row) => ({ value: row.id, label: `${row.full_name} — ${row.mobile}` }))]} /> }
function SubmitButton({ saving, label }: { saving: boolean; label: string }) { return <button type="submit" disabled={saving} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-2">{saving ? <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" /> : <Plus className="mr-2 inline h-4 w-4" />}{label}</button> }
function Notice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) { return <div className={`rounded-2xl border p-4 text-sm font-bold ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{children}</div> }
function LoadingCard({ label }: { label: string }) { return <main className="px-4 py-10"><div className="page-wrap rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center gap-3 text-sm font-bold text-slate-600"><RefreshCw className="h-4 w-4 animate-spin" />{label}</div></div></main> }
function AccessDenied() { return <main className="px-4 py-10"><div className="page-wrap rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/70"><ShieldCheck className="mx-auto h-10 w-10 text-slate-400" /><h1 className="mt-3 text-2xl font-black text-slate-950">Operations access required</h1><p className="mt-2 text-sm font-semibold text-slate-500">Your current organization role does not include the operations workbench.</p><Link to="/dashboard" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Back to dashboard</Link></div></main> }
function toLocal(value: string | null) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16) }
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
