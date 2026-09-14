import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { AdminShell } from '../../../components/admin/AdminShell'
import {
  designationLevelOptions,
  designationTitleOptions,
  getDefaultDesignationArea,
} from '../../../lib/designation-assignment'
import { hasMembershipAdminAccess } from '../../../lib/admin/access'
import { setMemberActiveAction } from '../../../lib/admin/actions'
import { useI18n } from '../../../lib/i18n'
import { supabase } from '../../../lib/supabase/client'
import { geographyPath, type GeographyRow } from '../../../lib/volunteers'

export const Route = createFileRoute('/admin/members/$id')({
  component: AdminMemberDetailPage,
})

type Member = {
  id: string
  user_id: string
  member_no: string | null
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  geography_id: string | null
  address: string | null
  date_of_birth: string | null
  gender: string | null
  education: string | null
  blood_group: string | null
  profession: string | null
  designation: string | null
  designation_level: string | null
  designation_area: string | null
  caste_branch: string | null
  declaration_accepted: boolean
  photo_url: string | null
  is_active: boolean
  issued_at: string
  created_at: string
  updated_at: string
}

type ProfileForm = {
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  geography_id: string
  address: string
  profession: string
  caste_branch: string
}

type DesignationForm = {
  designation: string
  designation_level: string
  designation_area: string
}

const emptyProfile: ProfileForm = {
  full_name: '',
  father_name: '',
  cnic: '',
  mobile: '',
  geography_id: '',
  address: '',
  profession: '',
  caste_branch: '',
}

const emptyDesignation: DesignationForm = {
  designation: '',
  designation_level: '',
  designation_area: '',
}

function AdminMemberDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { t, direction, language } = useI18n()

  const [member, setMember] = useState<Member | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [geographies, setGeographies] = useState<GeographyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingDesignation, setSavingDesignation] = useState(false)
  const [changingActivation, setChangingActivation] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile)
  const [designationForm, setDesignationForm] = useState<DesignationForm>(emptyDesignation)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    void loadMember()
  }, [id])

  async function loadMember() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate({ to: '/login' })
      return
    }

    if (!(await hasMembershipAdminAccess(user.id))) {
      navigate({ to: '/dashboard' })
      return
    }

    const [{ data, error: memberError }, { data: geographyData, error: geographyError }] = await Promise.all([
      supabase.from('members').select('*').eq('id', id).single(),
      supabase.from('geographies').select('*').eq('is_active', true).order('name'),
    ])

    if (memberError || geographyError) {
      setError(memberError?.message || geographyError?.message || 'Unable to load member data.')
      setLoading(false)
      return
    }

    const activeGeographies = (geographyData ?? []) as GeographyRow[]
    setGeographies(activeGeographies)
    const nextMember = data as Member
    setMember(nextMember)
    setProfileForm(memberToProfileForm(nextMember))
    setDesignationForm({
      designation: nextMember.designation ?? '',
      designation_level: nextMember.designation_level ?? '',
      designation_area: nextMember.designation_area ?? '',
    })

    if (nextMember.photo_url) {
      const { data: signed } = await supabase.storage
        .from('member-photos')
        .createSignedUrl(nextMember.photo_url, 60 * 60)
      setPhotoUrl(signed?.signedUrl ?? null)
    } else {
      setPhotoUrl(null)
    }

    setLoading(false)
  }

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? ''
  }

  async function handleActivationChange() {
    if (!member) return

    setChangingActivation(true)
    setError('')
    setSuccess('')

    try {
      const accessToken = await getAccessToken()
      const nextActive = !member.is_active

      await setMemberActiveAction({
        data: {
          memberId: member.id,
          isActive: nextActive,
          accessToken,
        },
      })

      await loadMember()
      setSuccess(nextActive ? 'Membership reactivated successfully.' : 'Membership deactivated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update membership status.')
    } finally {
      setChangingActivation(false)
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!member) return

    setSavingProfile(true)
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('members')
      .update({
        full_name: profileForm.full_name.trim(),
        father_name: profileForm.father_name.trim(),
        cnic: profileForm.cnic.trim(),
        mobile: profileForm.mobile.trim(),
        geography_id: profileForm.geography_id || null,
        address: optionalText(profileForm.address),
        profession: optionalText(profileForm.profession),
        caste_branch: optionalText(profileForm.caste_branch),
      })
      .eq('id', member.id)

    if (updateError) {
      setError(updateError.message)
      setSavingProfile(false)
      return
    }

    await loadMember()
    setEditMode(false)
    setSuccess('Member profile updated successfully.')
    setSavingProfile(false)
  }

  async function handleDesignationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!member) return

    setSavingDesignation(true)
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('members')
      .update({
        designation: optionalText(designationForm.designation),
        designation_level: optionalText(designationForm.designation_level),
        designation_area: optionalText(designationForm.designation_area),
      })
      .eq('id', member.id)

    if (updateError) {
      setError(updateError.message)
      setSavingDesignation(false)
      return
    }

    await loadMember()
    setSuccess('Designation updated successfully.')
    setSavingDesignation(false)
  }

  function handleDesignationLevelChange(level: string) {
    setDesignationForm((current) => ({
      ...current,
      designation_level: level,
      designation_area: getDefaultDesignationArea(level, { district: member?.district, taluka: member?.taluka }),
    }))
  }

  if (loading) {
    return (
      <AdminShell title={t('admin.detail.memberDetails')}>
        <div className="rounded-2xl bg-white p-6 shadow-sm">{t('admin.loading')}</div>
      </AdminShell>
    )
  }

  if (!member) {
    return (
      <AdminShell title={t('admin.detail.memberDetails')}>
        <div className="rounded-2xl bg-white p-6 shadow-sm">{error || 'Member not found.'}</div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title={member.full_name} subtitle="Manage member profile, designation and membership activation.">
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin" className="text-sm font-black text-emerald-800 no-underline hover:underline">
            ← {t('common.backToAdmin')}
          </Link>

          <div className="flex flex-wrap gap-2">
            {member.is_active && member.member_no ? (
              <Link
                to="/admin/members/$id/card"
                params={{ id: member.id }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 no-underline"
              >
                {t('nav.digitalCard')}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleActivationChange()}
              disabled={changingActivation}
              className={`rounded-xl px-4 py-2 text-sm font-black text-white disabled:opacity-60 ${member.is_active ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}
            >
              {changingActivation ? 'Saving...' : member.is_active ? 'Deactivate Membership' : 'Reactivate Membership'}
            </button>
          </div>
        </div>

        {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div> : null}
        {success ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{success}</div> : null}

        <section className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            {photoUrl ? (
              <img src={photoUrl} alt={member.full_name} className="aspect-square w-full rounded-[1.5rem] object-cover object-top ring-1 ring-slate-200" />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-[1.5rem] bg-slate-100 text-sm font-black text-slate-500">No photo</div>
            )}
            <div className="mt-4">
              <StatusBadge active={member.is_active} />
              <p className="mt-3 text-sm font-black text-slate-950">{member.member_no}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Issued {formatDateTime(member.issued_at, language)}</p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">Member details</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Self-issued membership. No payment or approval workflow.</p>
              </div>
              <button type="button" onClick={() => setEditMode((value) => !value)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                {editMode ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>

            {editMode ? (
              <form onSubmit={handleProfileSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Full Name" value={profileForm.full_name} onChange={(value) => setProfileForm((current) => ({ ...current, full_name: value }))} required />
                <Field label="Father Name" value={profileForm.father_name} onChange={(value) => setProfileForm((current) => ({ ...current, father_name: value }))} required />
                <Field label="CNIC" value={profileForm.cnic} onChange={(value) => setProfileForm((current) => ({ ...current, cnic: value }))} required />
                <Field label="Mobile" value={profileForm.mobile} onChange={(value) => setProfileForm((current) => ({ ...current, mobile: value }))} required />
                <label className="md:col-span-2">
                  <span className="mb-1 block text-sm font-black text-slate-700">Canonical Geography / Tehsil</span>
                  <select
                    className="input"
                    value={profileForm.geography_id}
                    onChange={(event) => setProfileForm((current) => ({ ...current, geography_id: event.target.value }))}
                    required
                  >
                    <option value="">Select tehsil / taluka</option>
                    {geographies
                      .filter((row) => row.kind === 'tehsil' && row.is_active)
                      .sort((a, b) => geographyPath(geographies, a.id).localeCompare(geographyPath(geographies, b.id)))
                      .map((row) => (
                        <option key={row.id} value={row.id}>{geographyPath(geographies, row.id)}</option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs font-semibold text-slate-500">District and taluka are synchronized from the canonical Pakistan geography reference.</p>
                </label>
                <Field label="Profession" value={profileForm.profession} onChange={(value) => setProfileForm((current) => ({ ...current, profession: value }))} />
                <Field label="Caste Branch" value={profileForm.caste_branch} onChange={(value) => setProfileForm((current) => ({ ...current, caste_branch: value }))} />
                <label className="md:col-span-2">
                  <span className="mb-1 block text-sm font-black text-slate-700">Address</span>
                  <textarea value={profileForm.address} onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))} className="input min-h-24" />
                </label>
                <div className="md:col-span-2">
                  <button type="submit" disabled={savingProfile} className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-black text-white disabled:opacity-60">
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Info label={t('dashboard.fullName')} value={member.full_name} />
                <Info label={t('dashboard.fatherName')} value={member.father_name} />
                <Info label={t('dashboard.cnic')} value={member.cnic} />
                <Info label={t('dashboard.mobile')} value={member.mobile} />
                <Info label={t('dashboard.district')} value={member.district} />
                <Info label={t('dashboard.taluka')} value={member.taluka} />
                <Info label={t('dashboard.profession')} value={member.profession} />
                <Info label={t('dashboard.casteBranch')} value={member.caste_branch} />
                <Info label="Issue Date" value={formatDateTime(member.issued_at, language)} />
                <Info label="Created" value={formatDateTime(member.created_at, language)} />
                <div className="md:col-span-2 xl:col-span-3"><Info label={t('dashboard.address')} value={member.address} /></div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Member Designation</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Assign designation to membership card</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Designation is an admin-managed field and does not require membership approval.</p>
          </div>

          <form onSubmit={handleDesignationSubmit} className="mt-6 grid gap-4 lg:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-black text-slate-700">Designation</span>
              <select className="input" value={designationForm.designation} onChange={(event) => setDesignationForm((current) => ({ ...current, designation: event.target.value }))}>
                <option value="">No designation</option>
                {designationTitleOptions.map((title) => <option key={title} value={title}>{title}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-black text-slate-700">Level</span>
              <select className="input" value={designationForm.designation_level} onChange={(event) => handleDesignationLevelChange(event.target.value)}>
                <option value="">No level</option>
                {designationLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <Field label="Area" value={designationForm.designation_area} onChange={(value) => setDesignationForm((current) => ({ ...current, designation_area: value }))} />
            <div className="lg:col-span-3">
              <button type="submit" disabled={savingDesignation} className="rounded-xl bg-emerald-800 px-5 py-2 text-sm font-black text-white disabled:opacity-60">
                {savingDesignation ? 'Saving...' : 'Save Designation'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminShell>
  )
}

function memberToProfileForm(member: Member): ProfileForm {
  return {
    full_name: member.full_name,
    father_name: member.father_name,
    cnic: member.cnic,
    mobile: member.mobile,
    geography_id: member.geography_id ?? '',
    address: member.address ?? '',
    profession: member.profession ?? '',
    caste_branch: member.caste_branch ?? '',
  }
}

function optionalText(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-black text-slate-700">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  const { t } = useI18n()
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{value || t('common.notProvided')}</p>
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function formatDateTime(value: string | null | undefined, language: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const locale = language === 'ur' ? 'ur-PK' : 'en-PK'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
