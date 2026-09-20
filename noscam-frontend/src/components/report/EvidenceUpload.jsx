import { useRef } from 'react'

function EvidenceUpload({
  files = [],
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null)

  const handleSelect = (event) => {
    const selectedFiles = Array.from(
      event.target.files || [],
    )

    if (selectedFiles.length === 0) {
      return
    }

    const nextFiles = [
      ...files,
      ...selectedFiles,
    ].slice(0, 5)

    onChange?.(nextFiles)

    event.target.value = ''
  }

  const handleRemove = (indexToRemove) => {
    const nextFiles = files.filter(
      (_, index) => index !== indexToRemove,
    )

    onChange?.(nextFiles)
  }

  const formatFileSize = (size) => {
    if (size < 1024) {
      return `${size} B`
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`
  }

  return (
    <div>
      <label className="text-sm font-semibold text-slate-900">
        Bằng chứng
      </label>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={handleSelect}
        disabled={disabled}
        className="hidden"
      />

      <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center sm:px-6 sm:py-10">
        <p className="text-sm font-semibold text-slate-800">
          Thêm hình ảnh hoặc tài liệu
        </p>

        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
          Có thể là ảnh chụp tin nhắn, giao dịch, hóa đơn hoặc các
          bằng chứng liên quan.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || files.length >= 5}
          className="mt-5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
        >
          {files.length >= 5
            ? 'Đã chọn tối đa 5 tệp'
            : 'Chọn tệp'}
        </button>

        <p className="mt-3 text-xs text-slate-400">
          JPG, JPEG, PNG, WEBP hoặc PDF · Tối đa 5 MB/tệp · Tối đa 5 tệp
        </p>

        {files.length > 0 && (
          <div className="mt-6 space-y-2 text-left">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default EvidenceUpload