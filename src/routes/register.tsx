import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useI18n, type TranslationKey } from '../lib/i18n'
import { supabase } from '../lib/supabase/client'
import {
  formatCnicInput,
  formatMobileInput,
  isPakistaniMobile,
  normalizeMobile,
  optionalText,
  todayDate,
} from '../lib/shared/formatters'
import './register.css'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const REGISTER_DRAFT_VERSION = 1

const sindhDistricts = [
  'Badin',
  'Dadu',
  'Ghotki',
  'Hyderabad',
  'Jacobabad',
  'Jamshoro',
  'Karachi Central',
  'Karachi East',
  'Karachi South',
  'Karachi West',
  'Kashmore',
  'Keamari',
  'Khairpur',
  'Korangi',
  'Larkana',
  'Malir',
  'Matiari',
  'Mirpur Khas',
  'Naushahro Firoze',
  'Qambar Shahdadkot',
  'Sanghar',
  'Shaheed Benazirabad',
  'Shikarpur',
  'Sujawal',
  'Sukkur',
  'Tando Allahyar',
  'Tando Muhammad Khan',
  'Tharparkar',
  'Thatta',
  'Umerkot',
]

const talukasByDistrict: Record<string, string[]> = {
  Badin: [
    'Badin',
    'Matli',
    'Shaheed Fazil Rahu (Golarchi)',
    'Talhar',
    'Tando Bago',
  ],
  Sujawal: ['Jati', 'Kharo Chan', 'Mirpur Bathoro', 'Shah Bunder', 'Sujawal'],
  Thatta: ['Ghorabari', 'Keti Bunder', 'Mirpur Sakro', 'Thatta'],
  Dadu: ['Dadu', 'Johi', 'Khairpur Nathan Shah', 'Mehar'],
  Hyderabad: ['Hyderabad City', 'Hyderabad Rural', 'Latifabad', 'Qasimabad'],
  Jamshoro: ['Kotri', 'Manjhand', 'Sehwan Sharif', 'Thano Bula Khan'],
  Matiari: ['Hala', 'Matiari', 'Saeedabad'],
  'Tando Allahyar': ['Chamber', 'Jhando Mari', 'Tando Allahyar'],
  'Tando Muhammad Khan': [
    'Bulri Shah Karim',
    'Tando Ghulam Hyder',
    'Tando Muhammad Khan',
  ],
  'Karachi Central': [
    'Gulberg',
    'Liaquatabad',
    'Nazimabad',
    'New Karachi',
    'North Nazimabad',
  ],
  'Karachi East': [
    'Ferozabad',
    'Gulshan-e-Iqbal',
    'Gulzar-e-Hijri',
    'Jamshed Quarters',
  ],
  'Karachi South': ['Aram Bagh', 'Civil Line', 'Garden', 'Lyari', 'Saddar'],
  'Karachi West': ['Mango Pir', 'Mominabad', 'Orangi'],
  Keamari: ['Baldia', 'Harbour', 'Mauripur', 'SITE'],
  Korangi: ['Korangi', 'Landhi', 'Model Colony', 'Shah Faisal'],
  Malir: [
    'Airport',
    'Bin Qasim',
    'Gadap',
    'Ibrahim Hyderi',
    'Murad Memon',
    'Shah Murad',
  ],
  Jacobabad: ['Garhi Khairo', 'Jacobabad', 'Thul'],
  Kashmore: ['Kandhkot', 'Kashmore', 'Tangwani'],
  Larkana: ['Bakrani', 'Dokri', 'Larkana', 'Ratodero'],
  'Qambar Shahdadkot': [
    'Mirokhan',
    'Nasirabad',
    'Qambar',
    'Qubo Saeed Khan',
    'Shahdadkot',
    'Sijawal Junejo',
    'Warah',
  ],
  Shikarpur: ['Garhi Yasin', 'Khanpur', 'Lakhi Ghulam Shah', 'Shikarpur'],
  'Mirpur Khas': [
    'Digri',
    'Hussain Bux Mari',
    'Jhuddo',
    'Kot Ghulam Muhammad',
    'Mirpur Khas',
    'Shujabad',
    'Sindhri',
  ],
  Tharparkar: [
    'Chachro',
    'Dahli',
    'Diplo',
    'Islamkot',
    'Kaloi',
    'Mithi',
    'Nagarparkar',
  ],
  Umerkot: ['Kunri', 'Pithoro', 'Samaro', 'Umerkot'],
  'Naushahro Firoze': [
    'Bhiria',
    'Kandiaro',
    'Mehrabpur',
    'Moro',
    'Naushahro Firoze',
  ],
  Sanghar: [
    'Jam Nawaz Ali',
    'Khipro',
    'Sanghar',
    'Shahdadpur',
    'Sinjhoro',
    'Tando Adam',
  ],
  'Shaheed Benazirabad': ['Daur', 'Nawabshah', 'Qazi Ahmed', 'Sakrand'],
  Ghotki: ['Daharki', 'Ghotki', 'Khangarh', 'Mirpur Mathelo', 'Ubauro'],
  Khairpur: [
    'Faiz Ganj',
    'Gambat',
    'Khairpur',
    'Kingri',
    'Kot Diji',
    'Mirwah',
    'Nara',
    'Sobhodero',
  ],
  Sukkur: ['New Sukkur', 'Pano Aqil', 'Rohri', 'Salehpat', 'Sukkur City'],
}

const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say']
const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

type MemberStatus = 'pending' | 'approved' | 'rejected'

type ExistingMember = {
  id: string
  status: MemberStatus
  address: string | null
  date_of_birth: string | null
  gender: string | null
  education: string | null
  blood_group: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_mobile: string | null
  declaration_accepted: boolean
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  profession: string | null
  caste_branch: string | null
  photo_url: string
}

type RegisterFormState = {
  fullName: string
  fatherName: string
  cnic: string
  mobile: string
  district: string
  taluka: string
  profession: string
  casteBranch: string
  address: string
  dateOfBirth: string
  gender: string
  education: string
  bloodGroup: string
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactMobile: string
  declarationAccepted: boolean
}

type FormField = keyof RegisterFormState | 'photo'

type FieldErrors = Partial<Record<FormField, string>>

const initialForm: RegisterFormState = {
  fullName: '',
  fatherName: '',
  cnic: '',
  mobile: '',
  district: '',
  taluka: '',
  profession: '',
  casteBranch: '',
  address: '',
  dateOfBirth: '',
  gender: '',
  education: '',
  bloodGroup: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactMobile: '',
  declarationAccepted: false,
}

const formSteps: Array<{
  titleKey: TranslationKey
  shortTitleKey: TranslationKey
  descriptionKey: TranslationKey
  fields: FormField[]
}> = [
  {
    titleKey: 'register.step.identity.title',
    shortTitleKey: 'register.step.identity.short',
    descriptionKey: 'register.step.identity.desc',
    fields: ['fullName', 'fatherName', 'cnic', 'mobile'],
  },
  {
    titleKey: 'register.step.location.title',
    shortTitleKey: 'register.step.location.short',
    descriptionKey: 'register.step.location.desc',
    fields: ['district', 'taluka', 'address'],
  },
  {
    titleKey: 'register.step.profile.title',
    shortTitleKey: 'register.step.profile.short',
    descriptionKey: 'register.step.profile.desc',
    fields: ['profession', 'casteBranch', 'dateOfBirth', 'gender', 'education', 'bloodGroup'],
  },
  {
    titleKey: 'register.step.emergency.title',
    shortTitleKey: 'register.step.emergency.short',
    descriptionKey: 'register.step.emergency.desc',
    fields: ['emergencyContactName', 'emergencyContactRelation', 'emergencyContactMobile'],
  },
  {
    titleKey: 'register.step.submit.title',
    shortTitleKey: 'register.step.submit.short',
    descriptionKey: 'register.photo.hint',
    fields: ['photo', 'declarationAccepted'],
  },
]

function RegisterPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState('')
  const [existingMember, setExistingMember] = useState<ExistingMember | null>(null)

  const [form, setForm] = useState<RegisterFormState>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [currentStep, setCurrentStep] = useState(0)

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [existingPhotoSignedUrl, setExistingPhotoSignedUrl] = useState<string | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [draftSavedAt, setDraftSavedAt] = useState('')

  const locked = existingMember?.status === 'approved'
  const isPendingEdit = existingMember?.status === 'pending'
  const isRejected = existingMember?.status === 'rejected'
  const isLastStep = currentStep === formSteps.length - 1
  const localizedSteps = useMemo(() =>
    formSteps.map((step) => ({
      ...step,
      title: t(step.titleKey),
      shortTitle: t(step.shortTitleKey),
      description: t(step.descriptionKey),
    })),
    [t],
  )
  const currentStepData = localizedSteps[currentStep]
  const progressPercent = Math.round(((currentStep + 1) / formSteps.length) * 100)

  const talukaOptions = useMemo(() => {
    return form.district ? talukasByDistrict[form.district] || [] : []
  }, [form.district])

  const photoSrc = photoPreview || existingPhotoSignedUrl

  useEffect(() => {
    loadExisting()
  }, [])

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  async function loadExisting() {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      navigate({ to: '/login' })
      return
    }

    setUserId(user.id)

    const { data: rawData, error: memberError } = await (supabase as any)
      .from('members')
      .select(
        [
          'id',
          'status',
          'address',
          'date_of_birth',
          'gender',
          'education',
          'blood_group',
          'emergency_contact_name',
          'emergency_contact_relation',
          'emergency_contact_mobile',
          'declaration_accepted',
          'full_name',
          'father_name',
          'cnic',
          'mobile',
          'district',
          'taluka',
          'profession',
          'caste_branch',
          'photo_url',
        ].join(', '),
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    const data = rawData as unknown as ExistingMember | null

    if (data) {
      setExistingMember(data)
      setForm(memberToForm(data))

      if (data.photo_url) {
        const { data: signed } = await supabase.storage
          .from('member-photos')
          .createSignedUrl(data.photo_url, 60 * 60)

        setExistingPhotoSignedUrl(signed?.signedUrl ?? null)
      }
    } else {
      const draft = readDraft(user.id)

      if (draft) {
        setForm({ ...initialForm, ...draft.form })
        setDraftSavedAt(draft.savedAt)
      }
    }

    setLoading(false)
  }

  function updateField<K extends keyof RegisterFormState>(
    field: K,
    value: RegisterFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }

    setError('')
    setSuccess('')
  }

  function handleDistrictChange(value: string) {
    setForm((current) => ({
      ...current,
      district: value,
      taluka: '',
    }))

    setFieldErrors((current) => {
      const next = { ...current }
      delete next.district
      delete next.taluka
      return next
    })

    setError('')
    setSuccess('')
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setError('')
    setSuccess('')

    const file = event.target.files?.[0] ?? null
    setPhoto(null)

    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
    }

    if (!file) return

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setFieldErrors((current) => ({
        ...current,
        photo: t('register.photo.hint'),
      }))
      event.target.value = ''
      return
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setFieldErrors((current) => ({
        ...current,
        photo: t('register.photo.hint'),
      }))
      event.target.value = ''
      return
    }

    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))

    setFieldErrors((current) => {
      const next = { ...current }
      delete next.photo
      return next
    })
  }



  function validateStep(stepIndex: number) {
    const step = formSteps[stepIndex]
    const errors = validateForm()

    const stepErrors: FieldErrors = {}

    step.fields.forEach((field) => {
      if (errors[field]) {
        stepErrors[field] = errors[field]
      }
    })

    setFieldErrors((current) => ({
      ...current,
      ...stepErrors,
    }))

    return stepErrors
  }

  function handleNextStep() {
    const stepErrors = validateStep(currentStep)

    if (Object.keys(stepErrors).length > 0) {
      setError(t('register.error.fixHighlightedContinue'))
      focusFirstInvalidField()
      return
    }

    setError('')
    setSuccess('')
    setCurrentStep((step) => Math.min(step + 1, formSteps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handlePreviousStep() {
    setError('')
    setSuccess('')
    setCurrentStep((step) => Math.max(step - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleStepClick(targetStep: number) {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep)
      setError('')
      setSuccess('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const stepErrors = validateStep(currentStep)

    if (Object.keys(stepErrors).length > 0) {
      setError(t('register.error.completeCurrentStep'))
      focusFirstInvalidField()
      return
    }

    setCurrentStep(targetStep)
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function saveDraft() {
    if (!userId || locked) return

    try {
      const savedAt = new Date().toISOString()

      localStorage.setItem(
        draftKey(userId),
        JSON.stringify({
          version: REGISTER_DRAFT_VERSION,
          savedAt,
          form,
        }),
      )

      setDraftSavedAt(savedAt)
      setSuccess(t('register.draftSaved'))
      setError('')
    } catch {
      setError(t('register.draftSaveFailed'))
    }
  }

  function clearDraft() {
    if (!userId) return

    localStorage.removeItem(draftKey(userId))
    setDraftSavedAt('')
    setSuccess(t('register.draftCleared'))
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!userId) {
      setError(t('register.error.loginRequired'))
      return
    }

    if (existingMember?.status === 'approved') {
      setError(t('register.error.approvedLocked'))
      return
    }

    const allErrors = validateForm()
    setFieldErrors(allErrors)

    if (Object.keys(allErrors).length > 0) {
      const firstField = Object.keys(allErrors)[0] as FormField | undefined
      const targetStep = formSteps.findIndex(
        (step) => firstField && step.fields.includes(firstField),
      )

      if (targetStep >= 0) {
        setCurrentStep(targetStep)
      }

      setError(t('register.error.fixHighlightedSubmit'))
      focusFirstInvalidField()
      return
    }

    setSubmitting(true)

    let photoPath = existingMember?.photo_url ?? ''

    if (photo) {
      const extension = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
      photoPath = `${userId}/photo-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(photoPath, photo, {
          upsert: true,
          contentType: photo.type || 'image/jpeg',
        })

      if (uploadError) {
        setError(uploadError.message)
        setSubmitting(false)
        return
      }
    }


    const normalizedMobile = normalizeMobile(form.mobile)
    const normalizedEmergencyMobile = normalizeMobile(form.emergencyContactMobile)

    const payload = {
      full_name: form.fullName.trim(),
      father_name: form.fatherName.trim(),
      cnic: form.cnic.trim(),
      mobile: normalizedMobile,
      district: form.district,
      taluka: form.taluka,
      profession: optionalText(form.profession),
      caste_branch: optionalText(form.casteBranch),
      address: form.address.trim(),
      date_of_birth: form.dateOfBirth || null,
      gender: optionalText(form.gender),
      education: optionalText(form.education),
      blood_group: optionalText(form.bloodGroup),
      emergency_contact_name: optionalText(form.emergencyContactName),
      emergency_contact_relation: optionalText(form.emergencyContactRelation),
      emergency_contact_mobile: normalizedEmergencyMobile || null,
      declaration_accepted: form.declarationAccepted,
      photo_url: photoPath,
    }

    if (existingMember) {
      const updatePayload =
        existingMember.status === 'rejected'
          ? {
              ...payload,
              status: 'pending' as const,
              rejection_reason: null,
            }
          : payload

      const { error: updateError } = await (supabase as any)
        .from('members')
        .update(updatePayload)
        .eq('id', existingMember.id)

      if (updateError) {
        setError(updateError.message)
        setSubmitting(false)
        return
      }
    } else {
      const { error: insertError } = await (supabase as any)
        .from('members')
        .insert({
          user_id: userId,
          ...payload,
          status: 'pending',
        })

      if (insertError) {
        setError(insertError.message)
        setSubmitting(false)
        return
      }
    }


    localStorage.removeItem(draftKey(userId))
    setDraftSavedAt('')
    setSubmitting(false)

    setSuccess(
      existingMember
        ? t('register.success.updated')
        : t('register.success.submitted'),
    )

    window.setTimeout(() => {
      navigate({ to: '/dashboard' })
    }, 650)
  }

  function validateForm() {
    const errors: FieldErrors = {}
    const normalizedMobile = normalizeMobile(form.mobile)
    const normalizedEmergencyMobile = normalizeMobile(form.emergencyContactMobile)

    if (!form.fullName.trim()) {
      errors.fullName = t('register.error.fullNameRequired')
    } else if (form.fullName.trim().length < 3) {
      errors.fullName = t('register.error.fullNameShort')
    }

    if (!form.fatherName.trim()) {
      errors.fatherName = t('register.error.fatherRequired')
    } else if (form.fatherName.trim().length < 3) {
      errors.fatherName = t('register.error.fullNameShort')
    }

    if (!/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(form.cnic.trim())) {
      errors.cnic = t('register.error.cnicInvalid')
    }

    if (!isPakistaniMobile(normalizedMobile)) {
      errors.mobile = t('register.error.mobileInvalid')
    }

    if (!form.district) {
      errors.district = t('register.error.districtRequired')
    }

    if (!form.taluka) {
      errors.taluka = t('register.error.talukaRequired')
    }

    if (!form.address.trim()) {
      errors.address = t('register.error.addressRequired')
    } else if (form.address.trim().length < 10) {
      errors.address = t('register.error.addressRequired')
    }

    if (form.dateOfBirth && form.dateOfBirth > todayDate()) {
      errors.dateOfBirth = t('register.error.dobFuture')
    }

    if (normalizedEmergencyMobile && !isPakistaniMobile(normalizedEmergencyMobile)) {
      errors.emergencyContactMobile =
        t('register.error.emergencyMobileInvalid')
    }

    if (!photo && !existingMember?.photo_url) {
      errors.photo = t('register.error.photoRequired')
    }

    if (!form.declarationAccepted) {
      errors.declarationAccepted = t('register.error.declarationRequired')
    }

    return errors
  }

  function getDescriptionIds(field: FormField, hasHint = false) {
    const ids: string[] = []

    if (hasHint) ids.push(`${field}-hint`)
    if (fieldErrors[field]) ids.push(`${field}-error`)

    return ids.length ? ids.join(' ') : undefined
  }

  function renderCurrentStep() {
    if (currentStep === 0) {
      return (
        <FormSection
          title={currentStepData.title}
          description={currentStepData.description}
        >
          <div className="reg-grid">
            <Field
              name="fullName"
              label={t('register.field.fullName')}
              required
              error={fieldErrors.fullName}
            >
              <input
                id="fullName"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                disabled={locked}
                className="reg-input"
                placeholder="Enter full name"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={getDescriptionIds('fullName')}
              />
            </Field>

            <Field
              name="fatherName"
              label={t('register.field.fatherName')}
              required
              error={fieldErrors.fatherName}
            >
              <input
                id="fatherName"
                value={form.fatherName}
                onChange={(event) => updateField('fatherName', event.target.value)}
                disabled={locked}
                className="reg-input"
                placeholder="Enter father's name"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.fatherName)}
                aria-describedby={getDescriptionIds('fatherName')}
              />
            </Field>

            <Field
              name="cnic"
              label={t('register.field.cnic')}
              required
              hint={t('register.hint.cnic')}
              error={fieldErrors.cnic}
            >
              <input
                id="cnic"
                value={form.cnic}
                onChange={(event) =>
                  updateField('cnic', formatCnicInput(event.target.value))
                }
                disabled={locked}
                className="reg-input"
                placeholder="12345-1234567-1"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.cnic)}
                aria-describedby={getDescriptionIds('cnic', true)}
              />
            </Field>

            <Field
              name="mobile"
              label={t('register.field.mobile')}
              required
              hint={t('register.hint.mobile')}
              error={fieldErrors.mobile}
            >
              <input
                id="mobile"
                value={form.mobile}
                onChange={(event) =>
                  updateField('mobile', formatMobileInput(event.target.value))
                }
                disabled={locked}
                className="reg-input"
                placeholder="03001234567"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={Boolean(fieldErrors.mobile)}
                aria-describedby={getDescriptionIds('mobile', true)}
              />
            </Field>
          </div>
        </FormSection>
      )
    }

    if (currentStep === 1) {
      return (
        <FormSection
          title={currentStepData.title}
          description={currentStepData.description}
        >
          <div className="reg-grid">
            <Field
              name="district"
              label={t('register.field.district')}
              required
              error={fieldErrors.district}
            >
              <select
                id="district"
                value={form.district}
                onChange={(event) => handleDistrictChange(event.target.value)}
                disabled={locked}
                className="reg-input reg-select"
                aria-invalid={Boolean(fieldErrors.district)}
                aria-describedby={getDescriptionIds('district')}
              >
                <option value="">Select district</option>
                {sindhDistricts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              name="taluka"
              label={t('register.field.taluka')}
              required
              error={fieldErrors.taluka}
            >
              <select
                id="taluka"
                value={form.taluka}
                onChange={(event) => updateField('taluka', event.target.value)}
                disabled={locked || !form.district}
                className="reg-input reg-select"
                aria-invalid={Boolean(fieldErrors.taluka)}
                aria-describedby={getDescriptionIds('taluka')}
              >
                <option value="">
                  {form.district ? 'Select taluka' : 'Select district first'}
                </option>
                {talukaOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              name="address"
              label={t('register.field.address')}
              required
              error={fieldErrors.address}
              className="span-2"
            >
              <textarea
                id="address"
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
                disabled={locked}
                className="reg-input reg-textarea"
                placeholder="House no., street, area, taluka, district"
                autoComplete="street-address"
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={getDescriptionIds('address')}
              />
            </Field>
          </div>
        </FormSection>
      )
    }

    if (currentStep === 2) {
      return (
        <FormSection
          title={currentStepData.title}
          description={currentStepData.description}
        >
          <div className="reg-grid">
            <Field
              name="profession"
              label={t('register.field.profession')}
              error={fieldErrors.profession}
            >
              <input
                id="profession"
                value={form.profession}
                onChange={(event) => updateField('profession', event.target.value)}
                disabled={locked}
                className="reg-input"
                placeholder={t('register.placeholder.profession')}
                autoComplete="organization-title"
                aria-invalid={Boolean(fieldErrors.profession)}
                aria-describedby={getDescriptionIds('profession')}
              />
            </Field>

            <Field
              name="casteBranch"
              label={t('register.field.casteBranch')}
              error={fieldErrors.casteBranch}
            >
              <input
                id="casteBranch"
                value={form.casteBranch}
                onChange={(event) => updateField('casteBranch', event.target.value)}
                disabled={locked}
                className="reg-input"
                placeholder="Enter caste branch"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.casteBranch)}
                aria-describedby={getDescriptionIds('casteBranch')}
              />
            </Field>

            <Field
              name="dateOfBirth"
              label={t('register.field.dateOfBirth')}
              error={fieldErrors.dateOfBirth}
            >
              <input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => updateField('dateOfBirth', event.target.value)}
                disabled={locked}
                className="reg-input"
                max={todayDate()}
                aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                aria-describedby={getDescriptionIds('dateOfBirth')}
              />
            </Field>

            <Field
              name="gender"
              label={t('register.field.gender')}
              error={fieldErrors.gender}
            >
              <select
                id="gender"
                value={form.gender}
                onChange={(event) => updateField('gender', event.target.value)}
                disabled={locked}
                className="reg-input reg-select"
                aria-invalid={Boolean(fieldErrors.gender)}
                aria-describedby={getDescriptionIds('gender')}
              >
                <option value="">Select gender</option>
                {genderOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              name="education"
              label={t('register.field.education')}
              error={fieldErrors.education}
            >
              <input
                id="education"
                value={form.education}
                onChange={(event) => updateField('education', event.target.value)}
                disabled={locked}
                className="reg-input"
                placeholder={t('register.placeholder.education')}
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.education)}
                aria-describedby={getDescriptionIds('education')}
              />
            </Field>

            <Field
              name="bloodGroup"
              label={t('register.field.bloodGroup')}
              error={fieldErrors.bloodGroup}
            >
              <select
                id="bloodGroup"
                value={form.bloodGroup}
                onChange={(event) => updateField('bloodGroup', event.target.value)}
                disabled={locked}
                className="reg-input reg-select"
                aria-invalid={Boolean(fieldErrors.bloodGroup)}
                aria-describedby={getDescriptionIds('bloodGroup')}
              >
                <option value="">Select blood group</option>
                {bloodGroupOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </FormSection>
      )
    }

    if (currentStep === 3) {
      return (
        <FormSection
          title={currentStepData.title}
          description={currentStepData.description}
        >
          <div className="reg-grid">
            <Field
              name="emergencyContactName"
              label={t('register.field.contactName')}
              error={fieldErrors.emergencyContactName}
            >
              <input
                id="emergencyContactName"
                value={form.emergencyContactName}
                onChange={(event) =>
                  updateField('emergencyContactName', event.target.value)
                }
                disabled={locked}
                className="reg-input"
                placeholder="Full name"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.emergencyContactName)}
                aria-describedby={getDescriptionIds('emergencyContactName')}
              />
            </Field>

            <Field
              name="emergencyContactRelation"
              label={t('register.field.relation')}
              error={fieldErrors.emergencyContactRelation}
            >
              <input
                id="emergencyContactRelation"
                value={form.emergencyContactRelation}
                onChange={(event) =>
                  updateField('emergencyContactRelation', event.target.value)
                }
                disabled={locked}
                className="reg-input"
                placeholder={t('register.placeholder.relation')}
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.emergencyContactRelation)}
                aria-describedby={getDescriptionIds('emergencyContactRelation')}
              />
            </Field>

            <Field
              name="emergencyContactMobile"
              label={t('register.field.contactMobile')}
              hint={t('register.hint.emergencyMobile')}
              error={fieldErrors.emergencyContactMobile}
            >
              <input
                id="emergencyContactMobile"
                value={form.emergencyContactMobile}
                onChange={(event) =>
                  updateField(
                    'emergencyContactMobile',
                    formatMobileInput(event.target.value),
                  )
                }
                disabled={locked}
                className="reg-input"
                placeholder="03001234567"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={Boolean(fieldErrors.emergencyContactMobile)}
                aria-describedby={getDescriptionIds('emergencyContactMobile', true)}
              />
            </Field>
          </div>
        </FormSection>
      )
    }

    return (
      <FormSection
        title={currentStepData.title}
        description={currentStepData.description}
      >
        <div className="reg-photo-row">
          <div className="reg-photo-preview">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={t('register.photo.alt')}
                className="reg-photo-img"
              />
            ) : (
              <div className="reg-photo-placeholder" aria-hidden="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <span>{t('register.photo.none')}</span>
              </div>
            )}
          </div>

          <div className="reg-photo-upload">
            <label
              className={`reg-upload-btn ${
                locked ? 'is-disabled' : 'cursor-pointer'
              }`}
              htmlFor="photo"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {photo ? photo.name : t('register.photo.choose')}
            </label>

            <input
              id="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoChange}
              disabled={locked}
              className="reg-sr-only"
              aria-invalid={Boolean(fieldErrors.photo)}
              aria-describedby={getDescriptionIds('photo', true)}
            />

            <p id="photo-hint" className="reg-upload-hint">
              {t('register.photo.hint')}
            </p>

            {fieldErrors.photo ? (
              <p id="photo-error" className="reg-error-text">
                {fieldErrors.photo}
              </p>
            ) : null}
          </div>
        </div>

        <label
          className={`reg-declaration ${
            form.declarationAccepted ? 'reg-declaration--checked' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={form.declarationAccepted}
            onChange={(event) =>
              updateField('declarationAccepted', event.target.checked)
            }
            disabled={locked}
            className="reg-checkbox"
            aria-invalid={Boolean(fieldErrors.declarationAccepted)}
            aria-describedby={getDescriptionIds('declarationAccepted')}
          />
          <span>
            {t('register.declaration')}
          </span>
        </label>

        {fieldErrors.declarationAccepted ? (
          <p id="declarationAccepted-error" className="reg-error-text">
            {fieldErrors.declarationAccepted}
          </p>
        ) : null}
      </FormSection>
    )
  }

  if (loading) {
    return (
      <>
        <main className="reg-page" dir={direction}>
          <div className="reg-card">
            <div className="reg-loading">
              <span className="reg-spinner" />
              <p>{t('register.loading')}</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <main className="reg-page" dir={direction}>
        <div className="reg-bg-pattern" aria-hidden="true" />

        <div className="reg-card">
          <div className="reg-header">
            <div className="reg-header-badge">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              {t('register.brand')}
            </div>

            <h1 className="reg-title">{t('register.title')}</h1>

            <p className="reg-subtitle">
              {t('register.subtitle')}
            </p>

            <div className="reg-title-line" />
          </div>

          <div className="reg-progress-wrap" aria-label={t('register.progressLabel')}>
            <div className="reg-progress-top">
              <span>
                {t('register.stepOf').replace('{current}', String(currentStep + 1)).replace('{total}', String(formSteps.length))}
              </span>
              <strong>{t('register.complete').replace('{percent}', String(progressPercent))}</strong>
            </div>

            <div className="reg-progress-track" aria-hidden="true">
              <div
                className="reg-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="reg-step-tabs">
              {localizedSteps.map((step, index) => (
                <button
                  key={step.titleKey}
                  type="button"
                  className={`reg-step-tab ${
                    index === currentStep ? 'is-active' : ''
                  } ${index < currentStep ? 'is-done' : ''}`}
                  onClick={() => handleStepClick(index)}
                  disabled={locked && index !== currentStep}
                  aria-current={index === currentStep ? 'step' : undefined}
                >
                  <span>{index + 1}</span>
                  {step.shortTitle}
                </button>
              ))}
            </div>
          </div>

          {existingMember?.status === 'approved' ? (
            <div className="reg-banner reg-banner--success">
              <span className="reg-banner-icon">✓</span>
              {t('register.approvedBanner')}
            </div>
          ) : null}

          {isPendingEdit ? (
            <div className="reg-banner reg-banner--info">
              <span className="reg-banner-icon">i</span>
              {t('register.pendingEditBanner')}
            </div>
          ) : null}

          {isRejected ? (
            <div className="reg-banner reg-banner--warning">
              <span className="reg-banner-icon">!</span>
              {t('register.rejectedBanner')}
            </div>
          ) : null}

          {draftSavedAt && !existingMember ? (
            <div className="reg-banner reg-banner--info">
              <span className="reg-banner-icon">i</span>
              {t('register.draftAvailable')}
            </div>
          ) : null}

          {error ? (
            <div className="reg-banner reg-banner--error" role="alert">
              <span className="reg-banner-icon">!</span>
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="reg-banner reg-banner--success" role="status">
              <span className="reg-banner-icon">✓</span>
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="reg-form" noValidate>
            {renderCurrentStep()}

            <div className="reg-actions">
              <div className="reg-actions-left">
                {currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="reg-btn-secondary"
                  >
                    ← {t('register.previous')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/dashboard' })}
                    className="reg-btn-secondary"
                  >
                    ← {t('register.backDashboard')}
                  </button>
                )}

                {!locked ? (
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="reg-btn-soft"
                  >
                    {t('register.saveDraft')}
                  </button>
                ) : null}

                {draftSavedAt && !locked ? (
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="reg-btn-soft reg-btn-soft--danger"
                  >
                    {t('register.clearDraft')}
                  </button>
                ) : null}
              </div>

              <div className="reg-actions-right">
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={locked}
                    className="reg-btn-primary"
                  >
                    {t('register.nextStep')} →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || locked}
                    className="reg-btn-primary"
                  >
                    {submitting ? (
                      <>
                        <span className="reg-spinner reg-spinner--sm" />
                        {t('register.saving')}
                      </>
                    ) : isRejected ? (
                      t('register.resubmit')
                    ) : existingMember ? (
                      t('register.updateForm')
                    ) : (
                      t('register.submitApplication')
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="reg-section">
      <div className="reg-section-header">
        <div>
          <h2 className="reg-section-title">{title}</h2>
          <p className="reg-section-desc">{description}</p>
        </div>
      </div>

      <div className="reg-section-body">{children}</div>
    </section>
  )
}

function Field({
  name,
  label,
  children,
  required,
  hint,
  error,
  className = '',
}: {
  name: FormField
  label: string
  children: ReactNode
  required?: boolean
  hint?: string
  error?: string
  className?: string
}) {
  return (
    <div className={`reg-field ${className}`}>
      <label htmlFor={name} className="reg-label">
        {label}
        {required ? (
          <span className="reg-required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <span id={`${name}-hint`} className="reg-hint">
          {hint}
        </span>
      ) : null}

      {children}

      {error ? (
        <p id={`${name}-error`} className="reg-error-text">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function memberToForm(data: ExistingMember): RegisterFormState {
  return {
    fullName: data.full_name,
    fatherName: data.father_name,
    cnic: data.cnic,
    mobile: data.mobile,
    district: data.district,
    taluka: data.taluka ?? '',
    profession: data.profession ?? '',
    casteBranch: data.caste_branch ?? '',
    address: data.address ?? '',
    dateOfBirth: data.date_of_birth ?? '',
    gender: data.gender ?? '',
    education: data.education ?? '',
    bloodGroup: data.blood_group ?? '',
    emergencyContactName: data.emergency_contact_name ?? '',
    emergencyContactRelation: data.emergency_contact_relation ?? '',
    emergencyContactMobile: data.emergency_contact_mobile ?? '',
    declarationAccepted: data.declaration_accepted,
  }
}

function draftKey(userId: string) {
  return `bbjf-register-draft:${REGISTER_DRAFT_VERSION}:${userId}`
}

function readDraft(userId: string) {
  try {
    const raw = localStorage.getItem(draftKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as {
      version?: number
      savedAt?: string
      form?: Partial<RegisterFormState>
    }

    if (parsed.version !== REGISTER_DRAFT_VERSION || !parsed.form) {
      return null
    }

    return {
      savedAt: parsed.savedAt ?? '',
      form: parsed.form,
    }
  } catch {
    return null
  }
}

function focusFirstInvalidField() {
  window.setTimeout(() => {
    const firstInvalid = document.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    )

    firstInvalid?.focus()
  }, 50)
}
