import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const MAX_FILES = 5
const MAX_FILE_SIZE =
  5 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

function EvidenceUpload({
  files = [],
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null)

  const [error, setError] =
    useState('')

  const totalSize = useMemo(
    () =>
      files.reduce(
        (total, file) =>
          total + file.size,
        0,
      ),
    [files],
  )

  const handleSelect = (
    event,
  ) => {
    const selectedFiles =
      Array.from(
        event.target.files || [],
      )

    event.target.value = ''

    if (
      selectedFiles.length === 0
    ) {
      return
    }

    setError('')

    const remainingSlots =
      MAX_FILES - files.length

    if (remainingSlots <= 0) {
      setError(
        'Bạn đã chọn tối đa 5 tệp bằng chứng.',
      )

      return
    }

    if (
      selectedFiles.length >
      remainingSlots
    ) {
      setError(
        `Bạn chỉ có thể chọn thêm ${remainingSlots} tệp. Mỗi báo cáo tối đa ${MAX_FILES} tệp.`,
      )

      return
    }

    const invalidType =
      selectedFiles.find(
        (file) =>
          !ALLOWED_TYPES.includes(
            file.type,
          ),
      )

    if (invalidType) {
      setError(
        `Tệp "${invalidType.name}" không được hỗ trợ. Chỉ chấp nhận JPG, JPEG, PNG, WEBP hoặc PDF.`,
      )

      return
    }

    const oversizedFile =
      selectedFiles.find(
        (file) =>
          file.size >
          MAX_FILE_SIZE,
      )

    if (oversizedFile) {
      setError(
        `Tệp "${oversizedFile.name}" vượt quá 5 MB.`,
      )

      return
    }

    const duplicateFile =
      selectedFiles.find(
        (selected) =>
          files.some(
            (existing) =>
              existing.name ===
                selected.name &&
              existing.size ===
                selected.size &&
              existing.lastModified ===
                selected.lastModified,
          ),
      )

    if (duplicateFile) {
      setError(
        `Tệp "${duplicateFile.name}" đã được chọn trước đó.`,
      )

      return
    }

    const duplicatesInsideSelection =
      selectedFiles.some(
        (file, index) =>
          selectedFiles.some(
            (
              other,
              otherIndex,
            ) =>
              index !==
                otherIndex &&
              file.name ===
                other.name &&
              file.size ===
                other.size &&
              file.lastModified ===
                other.lastModified,
          ),
      )

    if (
      duplicatesInsideSelection
    ) {
      setError(
        'Danh sách bạn vừa chọn có tệp bị trùng.',
      )

      return
    }

    onChange?.([
      ...files,
      ...selectedFiles,
    ])
  }

  const handleRemove = (
    indexToRemove,
  ) => {
    setError('')

    const nextFiles =
      files.filter(
        (_, index) =>
          index !==
          indexToRemove,
      )

    onChange?.(nextFiles)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <label className="text-sm font-semibold text-slate-900">
            Bằng chứng
          </label>

          <p className="mt-1 text-xs text-slate-400">
            Không bắt buộc
          </p>
        </div>

        <div className="text-xs font-medium text-slate-500">
          {files.length}/{MAX_FILES}
          {' tệp'}

          {files.length > 0 && (
            <>
              {' · '}
              {formatFileSize(
                totalSize,
              )}
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleSelect}
        disabled={disabled}
        className="hidden"
      />

      <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 sm:px-6 sm:py-8">
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5 text-slate-500"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V4m0 0L8 8m4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
              />
            </svg>
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-800">
            Thêm bằng chứng
          </p>

          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
            Ảnh chụp tin nhắn,
            giao dịch, hóa đơn hoặc
            tài liệu có liên quan.
          </p>

          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            disabled={
              disabled ||
              files.length >=
                MAX_FILES
            }
            className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
          >
            {files.length >=
            MAX_FILES
              ? 'Đã chọn tối đa 5 tệp'
              : files.length > 0
                ? 'Thêm tệp'
                : 'Chọn tệp'}
          </button>

          <p className="mt-3 text-xs text-slate-400">
            JPG, JPEG, PNG, WEBP
            hoặc PDF · Tối đa
            5 MB/tệp · Tối đa
            5 tệp
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <p className="text-xs font-medium leading-5 text-red-700">
              {error}
            </p>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tệp đã chọn
              </p>

              <p className="text-xs text-slate-400">
                {files.length}/
                {MAX_FILES}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {files.map(
                (file, index) => (
                  <SelectedFile
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    file={file}
                    disabled={
                      disabled
                    }
                    onRemove={() =>
                      handleRemove(
                        index,
                      )
                    }
                  />
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SelectedFile({
  file,
  disabled,
  onRemove,
}) {
  const isImage =
    file.type.startsWith(
      'image/',
    )

  const isPdf =
    file.type ===
    'application/pdf'

  const [previewUrl, setPreviewUrl] =
    useState('')

  useEffect(() => {
    if (!isImage) {
      return
    }

    const objectUrl =
      URL.createObjectURL(file)

    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(
        objectUrl,
      )
    }
  }, [file, isImage])

  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {isImage &&
        previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : isPdf ? (
          <div className="text-center">
            <div className="text-xs font-bold text-red-600">
              PDF
            </div>
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-500">
            FILE
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          title={file.name}
          className="truncate text-sm font-semibold text-slate-700"
        >
          {file.name}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {formatFileSize(
            file.size,
          )}
        </p>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="mt-2 text-xs font-semibold text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Xóa
        </button>
      </div>
    </div>
  )
}

function formatFileSize(size) {
  const bytes = Number(size)

  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return '0 B'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

export default EvidenceUpload