import { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import SocialAdminNav from '../../components/admin/social/SocialAdminNav';

export default function AdminSocialProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await adminService.getSocialProviders();
      const body = response?.data ?? response;
      const items = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.data?.data)
            ? body.data.data
            : [];

      setProviders(items);
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
        error.message ||
        'Không tải được danh sách nhà cung cấp.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function execute(provider, action) {
    if (
      action === 'sync' &&
      !window.confirm(
        `Đồng bộ dịch vụ từ ${provider.name}? Giá, tên và trạng thái dịch vụ có thể được cập nhật.`
      )
    ) return;

    setBusy(provider.id);
    setMessage('');

    try {
      const response = action === 'test'
        ? await adminService.testSocialProvider(provider.id)
        : await adminService.syncSocialProvider(provider.id);

      const result = response?.data ?? response;

      await load();

      setMessage(result?.message || 'Thao tác thành công.');
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
        error.message ||
        'Thao tác thất bại.'
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-5 text-2xl font-bold">
        Quản lý nhà cung cấp SMM
      </h1>

      <SocialAdminNav />

      <div className="my-5 flex items-center justify-between gap-3">
        <p>Quản lý kết nối API và đồng bộ dịch vụ nhà cung cấp.</p>
        <button
          className="rounded-lg border px-4 py-2"
          onClick={() => {
            setMessage('');
            load();
          }}
        >
          Tải lại
        </button>
      </div>

      {message && (
        <div className="my-4 rounded-lg border p-3">
          {message}
        </div>
      )}

      {loading ? (
        <p>Đang tải nhà cung cấp...</p>
      ) : providers.length === 0 ? (
        <p>Chưa có nhà cung cấp hoặc API trả về danh sách trống.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Nhà cung cấp</th>
                <th className="p-3">Loại API</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Số dịch vụ</th>
                <th className="p-3">Đồng bộ gần nhất</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {providers.map(provider => (
                <tr key={provider.id} className="border-b">
                  <td className="p-3 font-medium">
                    {provider.name}
                  </td>
                  <td className="p-3">
                    {provider.driver || '—'}
                  </td>
                  <td className="p-3">
                    {provider.status || '—'}
                  </td>
                  <td className="p-3">
                    {provider.services_count ?? '—'}
                  </td>
                  <td className="p-3">
                    {provider.last_synced_at || 'Chưa đồng bộ'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border px-3 py-2 disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => execute(provider, 'test')}
                      >
                        Kiểm tra API
                      </button>

                      <button
                        className="rounded-lg border px-3 py-2 disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => execute(provider, 'sync')}
                      >
                        Đồng bộ dịch vụ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
