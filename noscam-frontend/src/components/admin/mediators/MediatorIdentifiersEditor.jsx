import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import mediatorBankService from '../../../services/mediatorBankService'

const SOCIAL_GROUPS = [
  {
    type: 'phone',
    title: 'Số điện thoại',
    placeholder: 'Nhập số điện thoại',
    add: '+ Thêm số điện thoại',
  },
  {
    type: 'zalo',
    title: 'Zalo',
    placeholder: 'Nhập số điện thoại / Zalo',
    add: '+ Thêm Zalo',
  },
  {
    type: 'facebook',
    title: 'Facebook',
    placeholder: 'Nhập link hoặc username Facebook',
    add: '+ Thêm Facebook',
  },
  {
    type: 'tiktok',
    title: 'TikTok',
    placeholder: 'Nhập link hoặc username TikTok',
    add: '+ Thêm TikTok',
  },
  {
    type: 'instagram',
    title: 'Instagram',
    placeholder: 'Nhập link hoặc username Instagram',
    add: '+ Thêm Instagram',
  },
  {
    type: 'telegram',
    title: 'Telegram',
    placeholder: 'Nhập link hoặc username Telegram',
    add: '+ Thêm Telegram',
  },
]

function newIdentifier(type) {
  return {
    type,
    value: '',
    bank_id: null,
    bank_name: '',
    account_holder: '',
    label: '',
    is_public: true,
  }
}

function SimpleGroup({
  config,
  identifiers,
  setIdentifiers,
}) {
  const rows = useMemo(
    () =>
      identifiers
        .map((item, index) => ({
          item,
          index,
        }))
        .filter(
          ({ item }) =>
            item.type === config.type,
        ),
    [
      identifiers,
      config.type,
    ],
  )

  function add() {
    setIdentifiers((current) => [
      ...current,
      newIdentifier(config.type),
    ])
  }

  function update(
    index,
    value,
  ) {
    setIdentifiers((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              value,
            }
          : item,
      ),
    )
  }

  function remove(index) {
    setIdentifiers((current) =>
      current.filter(
        (_, i) => i !== index,
      ),
    )
  }

  return (
    <div className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-black text-slate-950">
            {config.title}
          </h4>

          <p className="mt-1 text-xs text-slate-400">
            Có thể thêm nhiều.
          </p>
        </div>

        <button
          type="button"
          onClick={add}
          className="text-sm font-bold text-blue-600"
        >
          {config.add}
        </button>
      </div>

      {rows.length > 0 ? (
        <div className="mt-3 space-y-3">
          {rows.map(
            ({ item, index }) => (
              <div
                key={`${config.type}-${index}`}
                className="flex gap-2 rounded-2xl bg-slate-50 p-3"
              >
                <input
                  value={item.value || ''}
                  onChange={(event) =>
                    update(
                      index,
                      event.target.value,
                    )
                  }
                  placeholder={
                    config.placeholder
                  }
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    remove(index)
                  }
                  className="rounded-xl px-3 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  Xóa
                </button>
              </div>
            ),
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={add}
          className="mt-3 w-full rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-600"
        >
          {config.add}
        </button>
      )}
    </div>
  )
}

function BankGroup({
  identifiers,
  setIdentifiers,
}) {
  const [banks, setBanks] =
    useState([])

  const [searches, setSearches] =
    useState({})

  const [openIndex, setOpenIndex] =
    useState(null)

  const [newBank, setNewBank] =
    useState('')

  const [showNewBank, setShowNewBank] =
    useState(false)

  const [addingBank, setAddingBank] =
    useState(false)

  const [bankError, setBankError] =
    useState('')

  const rows = useMemo(
    () =>
      identifiers
        .map((item, index) => ({
          item,
          index,
        }))
        .filter(
          ({ item }) =>
            item.type ===
            'bank_account',
        ),
    [identifiers],
  )

  async function loadBanks() {
    try {
      const response =
        await mediatorBankService.list()

      setBanks(
        response?.data?.data ||
          response?.data ||
          [],
      )
    } catch (error) {
      setBankError(
        error?.message ||
          'Không tải được danh sách ngân hàng.',
      )
    }
  }

  useEffect(() => {
    loadBanks()
  }, [])

  function setField(
    index,
    field,
    value,
  ) {
    setIdentifiers((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }

  function addAccount() {
    setIdentifiers((current) => [
      ...current,
      newIdentifier(
        'bank_account',
      ),
    ])
  }

  function removeAccount(index) {
    setIdentifiers((current) =>
      current.filter(
        (_, i) => i !== index,
      ),
    )
  }

  function selectBank(
    index,
    bank,
  ) {
    setIdentifiers((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              bank_id: bank.id,
              bank_name:
                bank.name,
            }
          : item,
      ),
    )

    setSearches((current) => ({
      ...current,
      [index]: bank.name,
    }))

    setOpenIndex(null)
  }

  async function createBank() {
    const name =
      newBank.trim()

    if (
      !name ||
      addingBank
    ) {
      return
    }

    setAddingBank(true)
    setBankError('')

    try {
      const response =
        await mediatorBankService
          .create(name)

      const created =
        response?.data?.data ||
        response?.data

      if (created?.id) {
        setBanks((current) => [
          ...current,
          created,
        ])
      }

      setNewBank('')
      setShowNewBank(false)

      await loadBanks()
    } catch (error) {
      setBankError(
        error?.message ||
          'Không thể thêm ngân hàng.',
      )
    } finally {
      setAddingBank(false)
    }
  }

  return (
    <div className="border-t border-slate-100 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-black text-slate-950">
            Tài khoản ngân hàng
          </h4>

          <p className="mt-1 text-xs text-slate-400">
            Chọn ngân hàng, nhập STK và tên chủ tài khoản.
          </p>
        </div>

        <button
          type="button"
          onClick={addAccount}
          className="shrink-0 text-sm font-bold text-blue-600"
        >
          + Thêm tài khoản
        </button>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 space-y-4">
          {rows.map(
            ({ item, index }) => {
              const query =
                searches[index] ??
                item.bank?.name ??
                item.bank_name ??
                ''

              const filteredBanks =
                banks.filter(
                  (bank) =>
                    bank.name
                      .toLowerCase()
                      .includes(
                        query
                          .toLowerCase()
                          .trim(),
                      ),
                )

              return (
                <div
                  key={`bank-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="relative">
                    <label className="text-xs font-bold text-slate-500">
                      Ngân hàng
                    </label>

                    <input
                      value={query}
                      autoComplete="off"
                      onFocus={() =>
                        setOpenIndex(
                          index,
                        )
                      }
                      onChange={(
                        event,
                      ) => {
                        const value =
                          event.target
                            .value

                        setSearches(
                          (current) => ({
                            ...current,
                            [index]:
                              value,
                          }),
                        )

                        setField(
                          index,
                          'bank_id',
                          null,
                        )

                        setField(
                          index,
                          'bank_name',
                          '',
                        )

                        setOpenIndex(
                          index,
                        )
                      }}
                      placeholder="Tìm ngân hàng..."
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />

                    {openIndex ===
                      index && (
                      <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                        {filteredBanks.length >
                        0 ? (
                          filteredBanks.map(
                            (bank) => (
                              <button
                                key={
                                  bank.id
                                }
                                type="button"
                                onMouseDown={(
                                  event,
                                ) =>
                                  event.preventDefault()
                                }
                                onClick={() =>
                                  selectBank(
                                    index,
                                    bank,
                                  )
                                }
                                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                              >
                                {
                                  bank.name
                                }
                              </button>
                            ),
                          )
                        ) : (
                          <div className="px-3 py-3 text-sm text-slate-400">
                            Không tìm thấy ngân hàng.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        Số tài khoản
                      </label>

                      <input
                        value={
                          item.value ||
                          ''
                        }
                        onChange={(
                          event,
                        ) =>
                          setField(
                            index,
                            'value',
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Ví dụ: 123456789"
                        inputMode="numeric"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        Chủ tài khoản
                      </label>

                      <input
                        value={
                          item.account_holder ||
                          ''
                        }
                        onChange={(
                          event,
                        ) =>
                          setField(
                            index,
                            'account_holder',
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="NGUYEN VAN A"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeAccount(
                        index,
                      )
                    }
                    className="mt-3 text-xs font-bold text-red-600"
                  >
                    Xóa tài khoản này
                  </button>
                </div>
              )
            },
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={addAccount}
          className="mt-3 w-full rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-600"
        >
          + Thêm tài khoản ngân hàng
        </button>
      )}

      <div className="mt-4">
        {!showNewBank ? (
          <button
            type="button"
            onClick={() =>
              setShowNewBank(true)
            }
            className="text-xs font-bold text-slate-500 hover:text-blue-600"
          >
            + Ngân hàng chưa có trong danh sách
          </button>
        ) : (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <p className="mb-2 text-xs font-bold text-slate-600">
              Thêm ngân hàng mới vào hệ thống
            </p>

            <div className="flex gap-2">
              <input
                value={newBank}
                onChange={(event) =>
                  setNewBank(
                    event.target.value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault()
                    createBank()
                  }
                }}
                placeholder="Tên ngân hàng"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />

              <button
                type="button"
                disabled={
                  !newBank.trim() ||
                  addingBank
                }
                onClick={createBank}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
              >
                {addingBank
                  ? 'Đang thêm...'
                  : 'Thêm'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNewBank(
                    false,
                  )
                  setNewBank('')
                }}
                className="rounded-xl px-3 text-xs font-bold text-slate-500"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {bankError && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {bankError}
          </p>
        )}
      </div>
    </div>
  )
}

export default function MediatorIdentifiersEditor({
  identifiers = [],
  onChange,
}) {
  function setIdentifiers(
    updater,
  ) {
    if (
      typeof updater ===
      'function'
    ) {
      onChange(
        updater(
          identifiers,
        ),
      )

      return
    }

    onChange(updater)
  }

  return (
    <div className="border-t border-slate-100 pt-5">
      <div className="mb-5">
        <h3 className="font-black text-slate-950">
          Thông tin đối chiếu
        </h3>

        <p className="mt-1 text-xs text-slate-400">
          Thêm các thông tin chính thức để người dùng tra cứu.
        </p>
      </div>

      <SimpleGroup
        config={
          SOCIAL_GROUPS[0]
        }
        identifiers={
          identifiers
        }
        setIdentifiers={
          setIdentifiers
        }
      />

      <BankGroup
        identifiers={
          identifiers
        }
        setIdentifiers={
          setIdentifiers
        }
      />

      {SOCIAL_GROUPS
        .slice(1)
        .map((config) => (
          <SimpleGroup
            key={
              config.type
            }
            config={config}
            identifiers={
              identifiers
            }
            setIdentifiers={
              setIdentifiers
            }
          />
        ))}
    </div>
  )
}
