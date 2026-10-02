import { useMemo, useState } from 'react'
import {
  AnimatePresence,
  motion,
} from 'motion/react'

import EvidenceUpload from './EvidenceUpload'
import {
  banks,
  scamTypes,
} from '../../data/reportOptions'
import useReport from '../../hooks/useReport'

const initialForm = {
  scamType: '',
  phone: '',
  bankAccount: '',
  bank: '',
  social: '',
  website: '',
  description: '',
  lossAmount: '',
  occurredAt: '',
  websiteConfirm: '',
}

const sections = [
  {
    number: '01',
    label: 'Phân loại',
  },
  {
    number: '02',
    label: 'Thông tin',
  },
  {
    number: '03',
    label: 'Nội dung',
  },
  {
    number: '04',
    label: 'Bằng chứng',
  },
]

function ReportForm() {
  const [formData, setFormData] =
    useState(initialForm)

  const [evidences, setEvidences] =
    useState([])

  const {
    status,
    error,
    message,
    submitReport,
    reset,
  } = useReport()

  const isSubmitting =
    status === 'loading'

  const isSuccess =
    status === 'success'

  const isError =
    status === 'error'

  const errorTitle =
    error?.type === 'duplicate'
      ? 'Báo cáo đã được gửi gần đây'
      : error?.type === 'validation'
        ? 'Thông tin chưa hợp lệ'
        : error?.type === 'rate_limit'
          ? 'Bạn đang gửi quá nhiều báo cáo'
          : 'Không thể gửi báo cáo'

  const progress = useMemo(() => {
    let completed = 0

    if (formData.scamType) {
      completed += 1
    }

    if (
      formData.phone.trim() ||
      formData.bankAccount.trim() ||
      formData.social.trim() ||
      formData.website.trim()
    ) {
      completed += 1
    }

    if (formData.description.trim()) {
      completed += 1
    }

    if (evidences.length > 0) {
      completed += 1
    }

    return completed
  }, [formData, evidences])

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    if (isError) {
      reset()
    }
  }

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault()

    const result =
      await submitReport({
        ...formData,
        evidences,
      })

    if (result) {
      setFormData(initialForm)
      setEvidences([])
    }
  }

  const handleCreateAnother = () => {
    reset()
    setFormData(initialForm)
    setEvidences([])
  }

  const inputClass =
    'mt-2 h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:-translate-y-0.5 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-100/60 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:px-4'

  const textareaClass =
    'mt-2 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:-translate-y-0.5 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-100/60 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:px-4'

  if (isSuccess) {
    return (
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95,
          y: 20,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-white px-5 py-12 text-center shadow-xl shadow-emerald-100/30 sm:px-8 sm:py-16"
      >
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-12 h-32 w-32 -translate-x-1/2 rounded-full bg-emerald-100 blur-3xl"
          initial={{
            opacity: 0,
            scale: 0,
          }}
          animate={{
            opacity: 0.8,
            scale: 1.5,
          }}
          transition={{
            duration: 0.7,
          }}
        />

        <motion.div
          initial={{
            scale: 0,
            rotate: -90,
          }}
          animate={{
            scale: 1,
            rotate: 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 220,
            damping: 15,
          }}
          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
        >
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            className="h-7 w-7 text-emerald-600"
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m5 12 4 4L19 6"
              initial={{
                pathLength: 0,
              }}
              animate={{
                pathLength: 1,
              }}
              transition={{
                delay: 0.25,
                duration: 0.5,
              }}
            />
          </motion.svg>
        </motion.div>

        <motion.h2
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
          }}
          className="relative mt-6 text-xl font-semibold text-slate-950"
        >
          Báo cáo đang chờ kiểm duyệt
        </motion.h2>

        <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          {message ||
            'NoScam đã ghi nhận báo cáo của bạn. Thông tin sẽ được sử dụng làm dữ liệu để đối chiếu và hỗ trợ quá trình đánh giá rủi ro.'}
        </p>

        <div className="relative mx-auto mt-6 max-w-md rounded-2xl bg-slate-50 p-4 text-left">
          <p className="text-xs leading-5 text-slate-500">
            Việc tiếp nhận báo cáo
            không đồng nghĩa NoScam đã
            xác nhận cá nhân hoặc tổ
            chức được báo cáo có hành
            vi lừa đảo.
          </p>
        </div>

        <motion.button
          type="button"
          onClick={
            handleCreateAnother
          }
          whileHover={{
            scale: 1.03,
            y: -2,
          }}
          whileTap={{
            scale: 0.97,
          }}
          className="relative mt-7 h-11 w-full rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:w-auto"
        >
          Gửi báo cáo khác
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{
        opacity: 0,
        y: 25,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
      }}
      className="relative min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor="websiteConfirm">
          Leave this field empty
        </label>

        <input
          id="websiteConfirm"
          name="websiteConfirm"
          type="text"
          value={
            formData.websiteConfirm
          }
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
              Báo cáo cộng đồng
            </p>

            <h2 className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">
              Thông tin báo cáo
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Cung cấp những thông tin
              bạn biết. Bạn không bắt
              buộc phải có đầy đủ tất cả
              các trường bên dưới.
            </p>
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-2xl font-bold text-slate-950">
              {progress}
              <span className="text-sm font-medium text-slate-400">
                /4
              </span>
            </p>

            <p className="text-xs text-slate-400">
              nhóm đã điền
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {sections.map(
            (section, index) => {
              const active =
                index < progress

              return (
                <div
                  key={
                    section.number
                  }
                >
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full rounded-full bg-blue-600"
                      animate={{
                        width: active
                          ? '100%'
                          : '0%',
                      }}
                    />
                  </div>

                  <p
                    className={`mt-2 hidden text-[10px] font-semibold sm:block ${
                      active
                        ? 'text-blue-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {section.number}{' '}
                    {section.label}
                  </p>
                </div>
              )
            },
          )}
        </div>
      </div>

      <AnimatePresence>
        {isError && (
          <motion.div
            initial={{
              opacity: 0,
              y: -10,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -8,
            }}
            role="alert"
            className={`mt-6 rounded-2xl border px-4 py-4 ${
              error?.type ===
              'duplicate'
                ? 'border-amber-200 bg-amber-50'
                : error?.type ===
                    'rate_limit'
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex gap-3">
              <motion.div
                animate={{
                  scale: [
                    1,
                    1.15,
                    1,
                  ],
                }}
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-red-600 shadow-sm"
              >
                !
              </motion.div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {errorTitle}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {error?.message ||
                    'Đã xảy ra lỗi trong quá trình gửi dữ liệu. Vui lòng kiểm tra lại và thử lần nữa.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <fieldset
        disabled={isSubmitting}
        className="min-w-0"
      >
        <FormSection
          number="01"
          title="Phân loại sự việc"
          description="Chọn nhóm phù hợp nhất để hệ thống phân loại báo cáo."
        >
          <label
            htmlFor="scamType"
            className="text-sm font-semibold text-slate-900"
          >
            Loại sự việc
          </label>

          <select
            id="scamType"
            name="scamType"
            value={
              formData.scamType
            }
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">
              Chọn loại sự việc
            </option>

            {scamTypes.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ),
            )}
          </select>
        </FormSection>

        <FormSection
          number="02"
          title="Thông tin liên quan"
          description="Chỉ cần nhập những dữ liệu bạn biết. Có ít nhất một thông tin nhận diện sẽ giúp việc đối chiếu chính xác hơn."
        >
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
            <Field
              label="Số điện thoại"
              htmlFor="phone"
            >
              <input
                id="phone"
                name="phone"
                type="text"
                inputMode="tel"
                value={
                  formData.phone
                }
                onChange={
                  handleChange
                }
                placeholder="Ví dụ: 0909123456"
                className={
                  inputClass
                }
              />
            </Field>

            <Field
              label="Số tài khoản"
              htmlFor="bankAccount"
            >
              <input
                id="bankAccount"
                name="bankAccount"
                type="text"
                inputMode="numeric"
                value={
                  formData.bankAccount
                }
                onChange={
                  handleChange
                }
                placeholder="Nhập số tài khoản"
                className={
                  inputClass
                }
              />
            </Field>

            <Field
              label="Ngân hàng"
              htmlFor="bank"
            >
              <select
                id="bank"
                name="bank"
                value={
                  formData.bank
                }
                onChange={
                  handleChange
                }
                className={
                  inputClass
                }
              >
                <option value="">
                  Chọn ngân hàng
                </option>

                {banks.map(
                  (bank) => (
                    <option
                      key={bank}
                      value={bank}
                    >
                      {bank}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label="Mạng xã hội"
              htmlFor="social"
            >
              <input
                id="social"
                name="social"
                type="text"
                value={
                  formData.social
                }
                onChange={
                  handleChange
                }
                placeholder="Facebook, TikTok, Telegram, Zalo..."
                className={
                  inputClass
                }
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Website"
                htmlFor="website"
              >
                <input
                  id="website"
                  name="website"
                  type="text"
                  inputMode="url"
                  value={
                    formData.website
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Ví dụ: example.vn"
                  className={
                    inputClass
                  }
                />
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection
          number="03"
          title="Diễn biến sự việc"
          description="Mô tả diễn biến theo những gì bạn biết và tránh đưa thông tin bí mật như mật khẩu, OTP hoặc mã PIN."
        >
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
            <Field
              label="Số tiền thiệt hại"
              htmlFor="lossAmount"
            >
              <input
                id="lossAmount"
                name="lossAmount"
                type="number"
                min="0"
                inputMode="numeric"
                value={
                  formData.lossAmount
                }
                onChange={
                  handleChange
                }
                placeholder="Nhập số tiền"
                className={
                  inputClass
                }
              />

              <p className="mt-2 text-xs text-slate-400">
                Đơn vị: VNĐ
              </p>
            </Field>

            <Field
              label="Ngày xảy ra"
              htmlFor="occurredAt"
            >
              <input
                id="occurredAt"
                name="occurredAt"
                type="date"
                value={
                  formData.occurredAt
                }
                onChange={
                  handleChange
                }
                className={
                  inputClass
                }
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Nội dung sự việc"
                htmlFor="description"
              >
                <textarea
                  id="description"
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={
                    handleChange
                  }
                  rows="7"
                  placeholder="Mô tả quá trình liên hệ, giao dịch và những dấu hiệu khiến bạn nghi ngờ..."
                  className={
                    textareaClass
                  }
                />

                <div className="mt-2 flex justify-end">
                  <span className="text-xs text-slate-400">
                    {
                      formData
                        .description
                        .length
                    }{' '}
                    ký tự
                  </span>
                </div>
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection
          number="04"
          title="Bằng chứng"
          description="Không bắt buộc. Ảnh chụp hoặc tài liệu liên quan có thể hỗ trợ quá trình kiểm duyệt và đối chiếu."
        >
          <EvidenceUpload
            files={evidences}
            onChange={
              setEvidences
            }
            disabled={
              isSubmitting
            }
          />
        </FormSection>

        <div className="mt-8 border-t border-slate-200 pt-7">
          <label className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm">
            <input
              type="checkbox"
              required
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
            />

            <span className="text-xs leading-5 text-slate-500">
              Tôi xác nhận thông tin
              cung cấp là đúng theo hiểu
              biết của mình và đồng ý
              rằng báo cáo này chỉ là
              một nguồn dữ liệu để
              NoScam xem xét, đối chiếu
              và đánh giá.
            </span>
          </label>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={
              !isSubmitting
                ? {
                    y: -2,
                    scale: 1.01,
                  }
                : {}
            }
            whileTap={
              !isSubmitting
                ? {
                    scale: 0.98,
                  }
                : {}
            }
            className="relative mt-6 flex h-13 min-h-13 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-700 sm:w-auto"
          >
            {isSubmitting && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{
                  x: [
                    '-200%',
                    '500%',
                  ],
                }}
                transition={{
                  duration: 1.3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}

            {isSubmitting && (
              <motion.span
                className="h-4 w-4 rounded-full border-2 border-slate-400 border-t-white"
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}

            <span className="relative">
              {isSubmitting
                ? 'Đang gửi báo cáo...'
                : 'Gửi báo cáo'}
            </span>

            {!isSubmitting && (
              <motion.span
                animate={{
                  x: [0, 4, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              >
                →
              </motion.span>
            )}
          </motion.button>

          <p className="mt-3 text-xs leading-5 text-slate-400">
            Báo cáo sẽ được đưa vào
            trạng thái chờ kiểm duyệt
            trước khi ảnh hưởng đến dữ
            liệu cảnh báo công khai.
          </p>
        </div>
      </fieldset>
    </motion.form>
  )
}

function FormSection({
  number,
  title,
  description,
  children,
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 25,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.12,
      }}
      transition={{
        duration: 0.45,
      }}
      className="group mt-8 border-t border-slate-100 pt-8 first:border-0"
    >
      <div className="mb-6 flex gap-4">
        <motion.div
          whileInView={{
            scale: [0.8, 1.08, 1],
          }}
          viewport={{
            once: true,
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-lg shadow-slate-950/10 transition-colors group-hover:bg-blue-600"
        >
          {number}
        </motion.div>

        <div>
          <h3 className="text-base font-semibold text-slate-950">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </motion.section>
  )
}

function Field({
  label,
  htmlFor,
  children,
}) {
  return (
    <motion.div
      whileFocusWithin={{
        x: 2,
      }}
    >
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-slate-900"
      >
        {label}
      </label>

      {children}
    </motion.div>
  )
}

export default ReportForm