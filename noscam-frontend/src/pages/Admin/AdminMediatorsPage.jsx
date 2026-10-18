import AvatarLightbox from '../../components/AvatarLightbox'
import NoScamSelect from '../../components/ui/NoScamSelect'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useNavigate,
} from 'react-router-dom'

import adminService from '../../services/adminService'
import mediatorTagService from '../../services/mediatorTagService'
import MediatorIdentifiersEditor from '../../components/admin/mediators/MediatorIdentifiersEditor'
import AdminNav from '../../components/admin/AdminNav'

const EMPTY_IDENTIFIER = {
  type: 'phone',
  value: '',
  label: '',
  bank_name: '',
  account_holder: '',
  is_public: true,
}

const EMPTY_FORM = {
  name: '',
  description: '',
  status: 'active',
  is_public: true,
  admin_note: '',
  initial_deposit: '',
  tag_ids: [],
  identifiers: [
    { ...EMPTY_IDENTIFIER },
  ],
}

const typeLabels = {
  phone: 'Số điện thoại',
  bank_account: 'Tài khoản ngân hàng',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  zalo: 'Zalo',
  telegram: 'Telegram',
  other: 'Khác',
}

const statusLabels = {
  active: 'Đang hoạt động',
  suspended: 'Tạm ngưng',
  removed: 'Đã gỡ',
}

function money(value) {
  return `${Number(
    value || 0,
  ).toLocaleString('vi-VN')}đ`
}

function AdminMediatorsPage() {
  // NOSCAM_MEDIATOR_ACTIONS_V1
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)

  // NOSCAM_MEDIATOR_TABS_V1
  const [activeTab, setActiveTab] = useState('manage')

  const navigate = useNavigate()

  const [items, setItems] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [editing, setEditing] =
    useState(null)

  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  const [form, setForm] =
    useState(EMPTY_FORM)

  const [tags, setTags] =
    useState([])

  const [newTag, setNewTag] =
    useState('')

  const [addingTag, setAddingTag] =
    useState(false)

  const [deposit, setDeposit] =
    useState({
      amount: '',
      note: '',
      recorded_at:
        new Date()
          .toISOString()
          .slice(0, 10),
    })

  const load = useCallback(
    async () => {
      setLoading(true)
      setError('')

      try {
        const response =
          await adminService
            .getMediators(
              search,
              1,
            )

        setItems(
          response?.data?.data ||
          [],
        )
      } catch (err) {
        if (
          err?.status === 401 ||
          err?.status === 403
        ) {
          navigate(
            '/admin/login',
            { replace: true },
          )
          return
        }

        setError(
          err?.message ||
          'Không thể tải danh sách trung gian.',
        )
      } finally {
        setLoading(false)
      }
    },
    [navigate, search],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let active = true

    mediatorTagService
      .list()
      .then((response) => {
        if (active) {
          setTags(
            response?.data || [],
          )
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('')
      return
    }
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])


  async function removeMediator() {
    if (!removeTarget || removing) return
    setRemoving(true)
    setError('')
    try {
      await adminService.updateMediator(removeTarget.id, {
        name: removeTarget.name,
        description: removeTarget.description || '',
        status: 'removed',
        is_public: false,
        admin_note: removeTarget.admin_note || '',
        tag_ids: (removeTarget.tags || []).map(tag => tag.id),
        identifiers: (removeTarget.identifiers || []).map(item => ({
          type: item.type,
          value: item.value,
          label: item.label || '',
          bank_id: item.bank_id || null,
          bank_name: item.bank_name || '',
          account_holder: item.account_holder || '',
          is_public: item.is_public ?? true,
        })),
      })
      if (editing?.id === removeTarget.id) resetForm()
      setRemoveTarget(null)
      setActiveTab('manage')
      await load()
    } catch (err) {
      setError(err?.message || 'Không thể gỡ hồ sơ.')
      setRemoveTarget(null)
    } finally {
      setRemoving(false)
    }
  }

  function resetForm() {
    setAvatarFile(null)
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      identifiers: [
        { ...EMPTY_IDENTIFIER },
      ],
    })
  }

  function edit(item) {
    setAvatarFile(null)
    setActiveTab('create')
    setEditing(item)

    setForm({
      name: item.name || '',
      description:
        item.description || '',
      status:
        item.status || 'active',
      is_public:
        item.is_public ?? true,
      admin_note:
        item.admin_note || '',
      initial_deposit: '',
      tag_ids:
        item.tags?.map(
          (tag) => tag.id,
        ) || [],
      identifiers:
        item.identifiers?.length
          ? item.identifiers.map(
              (identifier) => ({
                type:
                  identifier.type,
                value:
                  identifier.value,
                label:
                  identifier.label ||
                  '',
                bank_id:
                  identifier
                    .bank_id || null,
                bank_name:
                  identifier
                    .bank?.name ||
                  identifier
                    .bank_name || '',
                account_holder:
                  identifier
                    .account_holder || '',
                is_public:
                  identifier
                    .is_public ??
                  true,
              }),
            )
          : [
              {
                ...EMPTY_IDENTIFIER,
              },
            ],
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function updateIdentifier(
    index,
    field,
    value,
  ) {
    setForm((current) => ({
      ...current,
      identifiers:
        current.identifiers.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item,
        ),
    }))
  }

  function addIdentifier() {
    setForm((current) => ({
      ...current,
      identifiers: [
        ...current.identifiers,
        { ...EMPTY_IDENTIFIER },
      ],
    }))
  }

  function removeIdentifier(
    index,
  ) {
    setForm((current) => ({
      ...current,
      identifiers:
        current.identifiers.filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
    }))
  }

  function toggleTag(id) {
    setForm((current) => ({
      ...current,
      tag_ids:
        current.tag_ids.includes(id)
          ? current.tag_ids.filter(
              (tagId) =>
                tagId !== id,
            )
          : [
              ...current.tag_ids,
              id,
            ],
    }))
  }

  async function createTag() {
    const name =
      newTag.trim()

    if (!name || addingTag) {
      return
    }

    setAddingTag(true)

    try {
      const response =
        await mediatorTagService
          .create(name)

      const tag =
        response?.data

      if (!tag) return

      setTags((current) => {
        if (
          current.some(
            (item) =>
              item.id === tag.id,
          )
        ) {
          return current
        }

        return [
          ...current,
          tag,
        ]
      })

      setForm((current) => ({
        ...current,
        tag_ids:
          current.tag_ids.includes(
            tag.id,
          )
            ? current.tag_ids
            : [
                ...current.tag_ids,
                tag.id,
              ],
      }))

      setNewTag('')
    } catch (err) {
      setError(
        err?.message ||
        'Không thể tạo nhãn.',
      )
    } finally {
      setAddingTag(false)
    }
  }

  async function submit(event) {
    event.preventDefault()

    setSaving(true)
    setError('')

    const payload = {
      ...form,
      identifiers:
        form.identifiers.filter(
          (item) =>
            item.value.trim(),
        ),
    }

    try {
      const response = editing
        ? await adminService.updateMediator(editing.id, payload)
        : await adminService.createMediator(payload)
      const id = editing?.id || response?.data?.id
      if (avatarFile) {
        if (!id) throw new Error('Đã lưu hồ sơ nhưng không xác định được ID để tải avatar.')
        await adminService.uploadMediatorAvatar(id, avatarFile)
      }

      resetForm()
      setActiveTab('manage')
      await load()
    } catch (err) {
      setError(
        err?.message ||
        'Không thể lưu hồ sơ.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function submitDeposit(
    event,
  ) {
    event.preventDefault()

    if (!editing) return

    setSaving(true)
    setError('')

    try {
      await adminService
        .addMediatorDeposit(
          editing.id,
          {
            amount:
              Number(
                deposit.amount,
              ),
            note:
              deposit.note,
            recorded_at:
              deposit
                .recorded_at,
          },
        )

      setDeposit({
        amount: '',
        note: '',
        recorded_at:
          new Date()
            .toISOString()
            .slice(0, 10),
      })

      const fresh =
        await adminService
          .getMediator(
            editing.id,
          )

      setEditing(
        fresh?.data || null,
      )

      await load()
    } catch (err) {
      setError(
        err?.message ||
        'Không thể cập nhật tiền cọc.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Quản lý
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Trung gian
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Hồ sơ và tiền cọc do NoScam ghi nhận.
            </p>
          </div>

          {editing && (
            <button
              type="button"
              onClick={() => {
                resetForm()
                setActiveTab('create')
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"
            >
              + Thêm hồ sơ mới
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        
        <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Quản lý trung gian">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'manage'}
              onClick={() => setActiveTab('manage')}
              className={`rounded-xl px-4 py-4 text-sm font-bold transition sm:text-base ${
                activeTab === 'manage'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Quản lý trung gian
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'create'}
              onClick={() => {
                resetForm()
                setActiveTab('create')
              }}
              className={`rounded-xl px-4 py-4 text-sm font-bold transition sm:text-base ${
                activeTab === 'create'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              + Tạo trung gian
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">

          {activeTab === 'create' && (

          <motion.section
            layout
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <h2 className="text-xl font-black text-slate-950">
              {editing
                ? `Sửa ${editing.code}`
                : 'Thêm trung gian'}
            </h2>

            <form
              onSubmit={submit}
              className="mt-6 space-y-5"
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-bold text-slate-800">Ảnh đại diện trung gian</p>
                <div className="flex flex-wrap items-center gap-4">
                  {avatarPreview || editing?.avatar_url ? (
                    <AvatarLightbox src={avatarPreview || editing.avatar_url} alt="Avatar trung gian" className="h-20 w-20 rounded-full border-2 border-white object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-black text-blue-700">
                      {(form.name || 'N').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={event => {
                        const file = event.target.files?.[0] || null
                        if (file && file.size > 5 * 1024 * 1024) {
                          setError('Avatar không được vượt quá 5 MB.')
                          event.target.value = ''
                          return
                        }
                        setAvatarFile(file)
                      }}
                      className="block w-full max-w-xs text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:font-bold file:text-white" />
                    <p className="text-xs text-slate-500">JPG, PNG, WebP · tối đa 5 MB</p>
                    {editing?.avatar_url && !avatarFile && (
                      <button type="button" disabled={saving} className="text-xs font-bold text-red-600 hover:underline"
                        onClick={async () => {
                          if (!window.confirm('Xóa ảnh đại diện hiện tại?')) return
                          setSaving(true)
                          try {
                            const result = await adminService.deleteMediatorAvatar(editing.id)
                            setEditing(result.data)
                            await load()
                          } catch (err) { setError(err.message || 'Không thể xóa avatar.') }
                          finally { setSaving(false) }
                        }}>Xóa ảnh hiện tại</button>
                    )}
                  </div>
                </div>
              </div>

              <Field
                label="Tên hiển thị"
                value={form.name}
                required
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      name: value,
                    }),
                  )
                }
              />

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Mô tả
                </label>

                <textarea
                  rows="3"
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Trạng thái
                  </label>

                  <NoScamSelect
                    value={
                      form.status
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          status:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <option value="active">
                      Đang hoạt động
                    </option>
                    <option value="suspended">
                      Tạm ngưng
                    </option>
                    <option value="removed">
                      Đã gỡ
                    </option>
                  </NoScamSelect>
                </div>

                <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      form.is_public
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          is_public:
                            event
                              .target
                              .checked,
                        }),
                      )
                    }
                  />
                  <span className="text-sm font-bold">
                    Hiển thị công khai
                  </span>
                </label>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950">
                      Lĩnh vực / Nhãn
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Có thể chọn nhiều nhãn cho một hồ sơ.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected =
                      form.tag_ids.includes(
                        tag.id,
                      )

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          toggleTag(
                            tag.id,
                          )
                        }
                        className={
                          selected
                            ? 'rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-bold text-white'
                            : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600'
                        }
                      >
                        {selected
                          ? '✓ '
                          : ''}
                        {tag.name}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={newTag}
                    onChange={(event) =>
                      setNewTag(
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        event.preventDefault()
                        createTag()
                      }
                    }}
                    placeholder="Thêm nhãn mới..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    disabled={
                      addingTag ||
                      !newTag.trim()
                    }
                    onClick={createTag}
                    className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-600 disabled:opacity-40"
                  >
                    + Thêm nhãn
                  </button>
                </div>
              </div>

              {!editing && (
                <div className="border-t border-slate-100 pt-5">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-black text-slate-950">
                          Tiền cọc ban đầu
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Số tiền NoScam ghi nhận khi tạo hồ sơ.
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                        VNĐ
                      </span>
                    </div>

                    <div className="relative mt-4">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          form.initial_deposit
                            ? Number(
                                form.initial_deposit,
                              ).toLocaleString(
                                'vi-VN',
                              )
                            : ''
                        }
                        onChange={(event) => {
                          const raw =
                            event.target.value.replace(
                              /\D/g,
                              '',
                            )

                          setForm(
                            (current) => ({
                              ...current,
                              initial_deposit:
                                raw,
                            }),
                          )
                        }}
                        placeholder="Ví dụ: 20.000.000"
                        className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 pr-14 font-bold outline-none focus:border-emerald-500"
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600">
                        đ
                      </span>
                    </div>

                    {form.initial_deposit && (
                      <p className="mt-2 text-sm font-black text-emerald-700">
                        {Number(
                          form.initial_deposit || 0,
                        ).toLocaleString('vi-VN')}đ
                      </p>
                    )}
                  </div>
                </div>
              )}

                          <MediatorIdentifiersEditor
              identifiers={
                form.identifiers
              }
              onChange={(
                identifiers,
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    identifiers,
                  }),
                )
              }
            />

            <div>
                <label className="text-sm font-bold text-slate-700">
                  Ghi chú nội bộ
                </label>

                <textarea
                  rows="2"
                  value={
                    form.admin_note
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        admin_note:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <button
                disabled={saving}
                className="w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
              >
                {saving
                  ? 'Đang lưu...'
                  : editing
                    ? 'Lưu thay đổi'
                    : 'Tạo hồ sơ'}
              </button>
            </form>

            {editing && (
              <form
                onSubmit={
                  submitDeposit
                }
                className="mt-7 border-t border-slate-100 pt-6"
              >
                <h3 className="font-black text-slate-950">
                  Tiền cọc
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Hiện ghi nhận:{' '}
                  <strong>
                    {money(
                      editing
                        .deposit_balance,
                    )}
                  </strong>
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    type="number"
                    required
                    value={
                      deposit.amount
                    }
                    onChange={(
                      event,
                    ) =>
                      setDeposit(
                        (current) => ({
                          ...current,
                          amount:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="VD: 10000000 hoặc -5000000"
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />

                  <input
                    type="date"
                    required
                    value={
                      deposit
                        .recorded_at
                    }
                    onChange={(
                      event,
                    ) =>
                      setDeposit(
                        (current) => ({
                          ...current,
                          recorded_at:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <input
                  value={
                    deposit.note
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeposit(
                      (current) => ({
                        ...current,
                        note:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Ghi chú: Nộp cọc lần đầu..."
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <button
                  disabled={saving}
                  className="mt-3 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Ghi nhận biến động cọc
                </button>

                {editing
                  .deposit_logs
                  ?.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {editing
                      .deposit_logs
                      .map((log) => (
                        <div
                          key={
                            log.id
                          }
                          className="flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"
                        >
                          <span>
                            {log.note ||
                              'Điều chỉnh tiền cọc'}
                          </span>

                          <strong
                            className={
                              Number(
                                log.amount,
                              ) >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }
                          >
                            {Number(
                              log.amount,
                            ) > 0
                              ? '+'
                              : ''}
                            {money(
                              log.amount,
                            )}
                          </strong>
                        </div>
                      ))}
                  </div>
                )}
              </form>
            )}
          </motion.section>
          )}

          {activeTab === 'manage' && (

          <section>
            <div className="mb-4 flex gap-3">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Tìm tên, mã, SĐT, STK..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </div>

            {loading ? (
              <div className="rounded-3xl bg-white p-10 text-center text-slate-400">
                Đang tải...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
                Chưa có hồ sơ trung gian.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(
                  (item) => (
                    <motion.div
                      layout
                      whileHover={{
                        y: -2,
                      }}
                      key={item.id}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          {item.avatar_url && <AvatarLightbox src={item.avatar_url} alt="" className="mb-3 h-12 w-12 rounded-full object-cover" />}
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-slate-950">
                              {item.name}
                            </h3>

                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                              {item.code}
                            </span>
                          </div>

                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {statusLabels[
                              item.status
                            ] ||
                              item.status}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {item
                              .identifiers
                              ?.slice(
                                0,
                                4,
                              )
                              .map(
                                (
                                  identifier,
                                ) => (
                                  <span
                                    key={
                                      identifier.id
                                    }
                                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                                  >
                                    {
                                      typeLabels[
                                        identifier
                                          .type
                                      ]
                                    }
                                    :{' '}
                                    {
                                      identifier
                                        .value
                                    }
                                  </span>
                                ),
                              )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-400">
                            Tiền cọc
                          </p>

                          <p className="mt-1 font-black text-emerald-600">
                            {money(
                              item
                                .deposit_balance,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => edit(item)}
                          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                          Chỉnh sửa
                        </button>
                        {item.status !== 'removed' && (
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(item)}
                            className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
                          >
                            Gỡ hồ sơ
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ),
                )}
              </div>
            )}
          </section>
          )}
        </div>

        {removeTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-mediator-title"
              className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            >
              <h2 id="remove-mediator-title" className="text-xl font-black text-slate-950">
                Gỡ hồ sơ trung gian?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bạn đang gỡ <strong>{removeTarget.name}</strong>
                {' '}({removeTarget.code}).
                Hồ sơ sẽ bị ẩn khỏi website công khai.
                Lịch sử tiền cọc vẫn được lưu.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => setRemoveTarget(null)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={removeMediator}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {removing ? 'Đang xử lý...' : 'Xác nhận gỡ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        required={required}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  )
}

function AdminHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <div className="font-black text-slate-950">
            NoScam.vn
          </div>

          <div className="text-xs text-slate-400">
            Admin Panel
          </div>
        </div>

        <nav className="flex gap-2">
          <Link
            to="/admin/reports"
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            Báo cáo
          </Link>

          <Link
            to="/admin/mediators"
            className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
          >
            Trung gian
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default AdminMediatorsPage
