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

  function resetForm() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      identifiers: [
        { ...EMPTY_IDENTIFIER },
      ],
    })
  }

  function edit(item) {
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
      if (editing) {
        await adminService
          .updateMediator(
            editing.id,
            payload,
          )
      } else {
        await adminService
          .createMediator(
            payload,
          )
      }

      resetForm()
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
      <AdminHeader />

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
              onClick={resetForm}
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

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
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

                  <select
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
                  </select>
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
                    <motion.button
                      layout
                      whileHover={{
                        y: -2,
                      }}
                      type="button"
                      key={item.id}
                      onClick={() =>
                        edit(item)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
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
                    </motion.button>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
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
