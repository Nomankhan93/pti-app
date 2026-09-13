import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  HeartHandshake,
  Languages,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { formatMobileInput, normalizeMobile } from '../lib/shared/formatters'
import { supabase } from '../lib/supabase/client'
import type { Tables } from '../lib/supabase/database.types'
import {
  capabilityLabels,
  emptyGeographySelection,
  geographyChildren,
  geographyPath,
  geographySelectionForTehsil,
  preferredDutyOptions,
  profileCompletion,
  splitTags,
  volunteerAvailabilityOptions,
  volunteerSkillSuggestions,
  type GeographyRow,
  type GeographySelection,
  type VolunteerAvailability,
  type VolunteerProfile,
} from '../lib/volunteers'

export const Route = createFileRoute('/volunteer')({ component: VolunteerPage })

type MemberPrefill = Pick<
  Tables<'members'>,
  | 'full_name'
  | 'mobile'
  | 'profession'
  | 'education'
  | 'address'
  | 'emergency_contact_name'
  | 'emergency_contact_mobile'
>

type VolunteerForm = {
  fullName: string
  mobile: string
  profession: string
  education: string
  languages: string
  skills: string
  availability: VolunteerAvailability
  availabilityNotes: string
  preferredDuties: string[]
  vehicleAvailable: boolean
  drivingAvailable: boolean
  medicalSkills: boolean
  socialMediaSkills: boolean
  itSkills: boolean
  crowdManagement: boolean
  logistics: boolean
  securityDiscipline: boolean
  address: string
  emergencyContactName: string
  emergencyContactMobile: string
  bio: string
}

const initialForm: VolunteerForm = {
  fullName: '',
  mobile: '',
  profession: '',
  education: '',
  languages: '',
  skills: '',
  availability: 'available',
  availabilityNotes: '',
  preferredDuties: [],
  vehicleAvailable: false,
  drivingAvailable: false,
  medicalSkills: false,
  socialMediaSkills: false,
  itSkills: false,
  crowdManagement: false,
  logistics: false,
  securityDiscipline: false,
  address: '',
  emergencyContactName: '',
  emergencyContactMobile: '',
  bio: '',
}

function VolunteerPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState<VolunteerProfile | null>(null)
  const [memberLinked, setMemberLinked] = useState(false)
  const [geographies, setGeographies] = useState<GeographyRow[]>([])
  const [selection, setSelection] = useState<GeographySelection>(emptyGeographySelection())
  const [form, setForm] = useState<VolunteerForm>(initialForm)

  useEffect(() => {
    void loadPage()
  }, [])

  const provinces = useMemo(() => geographyChildren(geographies, null, 'province'), [geographies])
  const divisions = useMemo(
    () => (selection.provinceId ? geographyChildren(geographies, selection.provinceId, 'division') : []),
    [geographies, selection.provinceId],
  )
  const districtParent = divisions.length > 0 ? selection.divisionId : selection.provinceId
  const districts = useMemo(
    () => (districtParent ? geographyChildren(geographies, districtParent, 'district') : []),
    [districtParent, geographies],
  )
  const tehsils = useMemo(
    () => (selection.districtId ? geographyChildren(geographies, selection.districtId, 'tehsil') : []),
    [geographies, selection.districtId],
  )

  const completion = profileCompletion(profile)
  const profilePath = profile ? geographyPath(geographies, profile.geography_id) : ''
  const capabilities = profile ? capabilityLabels(profile) : []

  async function loadPage() {
    setLoading(true)
    setError('')

    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData.user
    if (userError || !user) {
      void navigate({ to: '/login' })
      return
    }

    const [geoResult, profileResult, memberResult] = await Promise.all([
      supabase.from('geographies').select('*').eq('is_active', true).order('name'),
      supabase.from('volunteer_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('members')
        .select('full_name,mobile,profession,education,address,emergency_contact_name,emergency_contact_mobile')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const firstError = geoResult.error ?? profileResult.error ?? memberResult.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const geographyRows = (geoResult.data ?? []) as GeographyRow[]
    const volunteer = (profileResult.data ?? null) as VolunteerProfile | null
    const member = (memberResult.data ?? null) as MemberPrefill | null
    setGeographies(geographyRows)
    setProfile(volunteer)
    setMemberLinked(Boolean(volunteer?.member_id ?? member))

    if (volunteer) {
      setSelection(geographySelectionForTehsil(geographyRows, volunteer.geography_id))
      setForm(formFromProfile(volunteer))
    } else if (member) {
      setForm((current) => ({
        ...current,
        fullName: member.full_name ?? '',
        mobile: formatMobileInput(member.mobile ?? ''),
        profession: member.profession ?? '',
        education: member.education ?? '',
        address: member.address ?? '',
        emergencyContactName: member.emergency_contact_name ?? '',
        emergencyContactMobile: formatMobileInput(member.emergency_contact_mobile ?? ''),
      }))
    }

    setLoading(false)
  }

  function updateSelection(level: keyof GeographySelection, value: string) {
    setSelection((current) => {
      if (level === 'provinceId') return { provinceId: value, divisionId: '', districtId: '', tehsilId: '' }
      if (level === 'divisionId') return { ...current, divisionId: value, districtId: '', tehsilId: '' }
      if (level === 'districtId') return { ...current, districtId: value, tehsilId: '' }
      return { ...current, tehsilId: value }
    })
  }

  function toggleDuty(duty: string) {
    setForm((current) => ({
      ...current,
      preferredDuties: current.preferredDuties.includes(duty)
        ? current.preferredDuties.filter((item) => item !== duty)
        : [...current.preferredDuties, duty],
    }))
  }

  function addSkillSuggestion(skill: string) {
    const next = splitTags(`${form.skills},${skill}`)
    setForm((current) => ({ ...current, skills: next.join(', ') }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selection.tehsilId) {
      setError('Select your Tehsil / Taluka before saving the volunteer profile.')
      return
    }

    const mobile = normalizeVolunteerMobile(form.mobile)
    const emergencyMobile = form.emergencyContactMobile.trim()
      ? normalizeVolunteerMobile(form.emergencyContactMobile)
      : ''

    if (!/^\+92\d{10}$/.test(mobile)) {
      setError('Enter a valid Pakistani mobile number.')
      return
    }
    if (emergencyMobile && !/^\+92\d{10}$/.test(emergencyMobile)) {
      setError('Enter a valid emergency contact mobile number.')
      return
    }

    setSaving(true)

    const { error: saveError } = await supabase.rpc('save_my_volunteer_profile', {
      p_geography_id: selection.tehsilId,
      p_profile: {
        full_name: form.fullName.trim(),
        mobile,
        profession: form.profession.trim(),
        education: form.education.trim(),
        languages: splitTags(form.languages, 12),
        skills: splitTags(form.skills, 24),
        availability: form.availability,
        availability_notes: form.availabilityNotes.trim(),
        preferred_duties: form.preferredDuties,
        vehicle_available: form.vehicleAvailable,
        driving_available: form.drivingAvailable,
        medical_skills: form.medicalSkills,
        social_media_skills: form.socialMediaSkills,
        it_skills: form.itSkills,
        crowd_management: form.crowdManagement,
        logistics: form.logistics,
        security_discipline: form.securityDiscipline,
        address: form.address.trim(),
        emergency_contact_name: form.emergencyContactName.trim(),
        emergency_contact_mobile: emergencyMobile,
        bio: form.bio.trim(),
      },
    })

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    setSuccess(profile ? 'Volunteer profile updated.' : 'Volunteer registration completed. Your profile is active immediately.')
    await loadPage()
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="px-4 py-10">
        <div className="page-wrap rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading volunteer workspace…
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 py-8 md:py-10">
      <div className="page-wrap space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-700 via-white to-emerald-700" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">PTI Volunteer Registry</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">Serve where your skills matter.</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70 md:text-base">
                Register your skills, availability and local area. Volunteer registration is separate from membership and does not require admin approval.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              <HeroMetric label="Profile" value={profile ? `${completion}%` : 'New'} />
              <HeroMetric label="Status" value={profile?.is_active === false ? 'Inactive' : 'Active'} />
            </div>
          </div>
        </header>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {success ? <Notice tone="success">{success}</Notice> : null}

        {profile ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={<BadgeCheck className="h-5 w-5" />} label="Volunteer status" value={profile.is_active ? 'Active' : 'Inactive'} />
            <SummaryCard icon={<MapPin className="h-5 w-5" />} label="Organization area" value={profilePath || '—'} />
            <SummaryCard icon={<Sparkles className="h-5 w-5" />} label="Skills registered" value={String(profile.skills.length)} />
            <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Membership link" value={memberLinked ? 'Linked' : 'Volunteer only'} />
          </section>
        ) : null}

        <form onSubmit={submit} className="space-y-6">
          <FormSection title="Identity & location" description="Your volunteer deployment area is linked to the canonical PTI organization hierarchy." icon={<UserRound className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name"><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required className={inputClass} maxLength={120} /></Field>
              <Field label="Mobile"><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: formatMobileInput(e.target.value) })} required className={inputClass} placeholder="03XX-XXXXXXX" /></Field>
              <Field label="Province / Territory">
                <select value={selection.provinceId} onChange={(e) => updateSelection('provinceId', e.target.value)} className={inputClass} required>
                  <option value="">Select province / territory</option>{provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              {divisions.length > 0 ? <Field label="Division"><select value={selection.divisionId} onChange={(e) => updateSelection('divisionId', e.target.value)} className={inputClass} required><option value="">Select division</option>{divisions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field> : null}
              <Field label="District"><select value={selection.districtId} onChange={(e) => updateSelection('districtId', e.target.value)} className={inputClass} required><option value="">Select district</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Tehsil / Taluka"><select value={selection.tehsilId} onChange={(e) => updateSelection('tehsilId', e.target.value)} className={inputClass} required><option value="">Select tehsil / taluka</option>{tehsils.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <div className="md:col-span-2"><Field label="Address"><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputClass} min-h-24`} maxLength={2000} /></Field></div>
            </div>
          </FormSection>

          <FormSection title="Skills & professional profile" description="Keep this practical so coordinators can find the right volunteers quickly." icon={<BriefcaseBusiness className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Profession"><input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} className={inputClass} maxLength={160} /></Field>
              <Field label="Education"><input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className={inputClass} maxLength={300} /></Field>
              <Field label="Languages"><input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className={inputClass} placeholder="Urdu, Sindhi, English" /></Field>
              <Field label="Skills"><input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className={inputClass} placeholder="Data entry, First aid, Photography" /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {volunteerSkillSuggestions.map((skill) => <button key={skill} type="button" onClick={() => addSkillSuggestion(skill)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">+ {skill}</button>)}
            </div>
          </FormSection>

          <FormSection title="Availability & preferred duties" description="These preferences will feed team and duty assignment in the operations phase." icon={<HeartHandshake className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Availability"><select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as VolunteerAvailability })} className={inputClass}>{volunteerAvailabilityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Availability notes"><input value={form.availabilityNotes} onChange={(e) => setForm({ ...form, availabilityNotes: e.target.value })} className={inputClass} placeholder="Weekends / evenings / specific dates" maxLength={500} /></Field>
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-wide text-slate-500">Preferred duties</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preferredDutyOptions.map((duty) => {
                const selected = form.preferredDuties.includes(duty)
                return <button key={duty} type="button" onClick={() => toggleDuty(duty)} className={`rounded-full px-3 py-2 text-xs font-black ring-1 transition ${selected ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>{selected ? '✓ ' : ''}{duty}</button>
              })}
            </div>
          </FormSection>

          <FormSection title="Operational capabilities" description="Select only capabilities you can actually provide in field operations." icon={<CheckCircle2 className="h-5 w-5" />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Toggle label="Vehicle available" checked={form.vehicleAvailable} onChange={(value) => setForm({ ...form, vehicleAvailable: value })} />
              <Toggle label="Can drive" checked={form.drivingAvailable} onChange={(value) => setForm({ ...form, drivingAvailable: value })} />
              <Toggle label="Medical skills" checked={form.medicalSkills} onChange={(value) => setForm({ ...form, medicalSkills: value })} />
              <Toggle label="Social media" checked={form.socialMediaSkills} onChange={(value) => setForm({ ...form, socialMediaSkills: value })} />
              <Toggle label="IT / technical" checked={form.itSkills} onChange={(value) => setForm({ ...form, itSkills: value })} />
              <Toggle label="Crowd management" checked={form.crowdManagement} onChange={(value) => setForm({ ...form, crowdManagement: value })} />
              <Toggle label="Logistics" checked={form.logistics} onChange={(value) => setForm({ ...form, logistics: value })} />
              <Toggle label="Security / discipline" checked={form.securityDiscipline} onChange={(value) => setForm({ ...form, securityDiscipline: value })} />
            </div>
          </FormSection>

          <FormSection title="Emergency contact & volunteer note" description="Only collect information useful for safe coordination. Keep sensitive information minimal." icon={<Languages className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Emergency contact name"><input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} className={inputClass} maxLength={120} /></Field>
              <Field label="Emergency contact mobile"><input value={form.emergencyContactMobile} onChange={(e) => setForm({ ...form, emergencyContactMobile: formatMobileInput(e.target.value) })} className={inputClass} /></Field>
              <div className="md:col-span-2"><Field label="Short volunteer bio / experience"><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${inputClass} min-h-28`} maxLength={2000} placeholder="Relevant experience, community work or useful operational context." /></Field></div>
            </div>
          </FormSection>

          {profile?.is_active === false ? <Notice tone="warning">Your volunteer profile is currently inactive. You can update profile details, but a coordinator must reactivate operational participation.</Notice> : null}

          <div className="flex flex-col gap-3 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-slate-950">{profile ? 'Update volunteer profile' : 'Complete volunteer registration'}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">No admin approval step. Administrative deactivation is separate from self-service profile editing.</p>
            </div>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save volunteer profile'}
            </button>
          </div>
        </form>

        {profile ? (
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <h2 className="text-lg font-black text-slate-950">Volunteer readiness snapshot</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {capabilities.length ? capabilities.map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">{item}</span>) : <span className="text-sm font-semibold text-slate-500">No operational capabilities selected yet.</span>}
            </div>
            <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">Teams, assigned duties and attendance will appear in the volunteer dashboard after the Operations, Teams & Duties phase is added.</p>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function formFromProfile(profile: VolunteerProfile): VolunteerForm {
  return {
    fullName: profile.full_name,
    mobile: formatMobileInput(profile.mobile),
    profession: profile.profession ?? '',
    education: profile.education ?? '',
    languages: profile.languages.join(', '),
    skills: profile.skills.join(', '),
    availability: profile.availability,
    availabilityNotes: profile.availability_notes ?? '',
    preferredDuties: profile.preferred_duties,
    vehicleAvailable: profile.vehicle_available,
    drivingAvailable: profile.driving_available,
    medicalSkills: profile.medical_skills,
    socialMediaSkills: profile.social_media_skills,
    itSkills: profile.it_skills,
    crowdManagement: profile.crowd_management,
    logistics: profile.logistics,
    securityDiscipline: profile.security_discipline,
    address: profile.address ?? '',
    emergencyContactName: profile.emergency_contact_name ?? '',
    emergencyContactMobile: formatMobileInput(profile.emergency_contact_mobile ?? ''),
    bio: profile.bio ?? '',
  }
}

function normalizeVolunteerMobile(value: string) {
  const normalized = normalizeMobile(value)
  if (/^03\d{9}$/.test(normalized)) return `+92${normalized.slice(1)}`
  return normalized
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>{children}</label>
}

function FormSection({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">{icon}</span><div><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p></div></div>{children}</section>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm font-black transition ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-emerald-700" />{label}</label>
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><div className="text-emerald-700">{icon}</div><p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-black text-slate-900">{value}</p></div>
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p></div>
}

function Notice({ tone, children }: { tone: 'error' | 'success' | 'warning'; children: React.ReactNode }) {
  const styles = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return <div className={`rounded-2xl border p-4 text-sm font-bold ${styles}`}>{children}</div>
}
