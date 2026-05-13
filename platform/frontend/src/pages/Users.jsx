import { useEffect, useState } from 'react';
import { listUsers, updateUserRole } from '../api/users.js';
import { usePlatformI18n } from '../components/platform/platformText';
import { showToast } from '../utils/toast.js';

export default function UsersPage() {
  const { t } = usePlatformI18n();
  const [users, setUsers] = useState([]);
  const [savingUserId, setSavingUserId] = useState(null);

  const loadUsers = async () => {
    const data = await listUsers();
    setUsers(data);
  };

  useEffect(() => {
    loadUsers().catch(() => setUsers([]));
  }, []);

  const handleRoleChange = async (userId, role) => {
    setSavingUserId(userId);
    try {
      await updateUserRole(userId, role);
      showToast.success(t.userRoleUpdatedSuccess);
      await loadUsers();
    } catch (error) {
      showToast.error(error?.response?.data?.detail || t.userRoleUpdateFailed);
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 text-white">
      <div className="mb-8">
        <div className="mb-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-200">
          {t.usersBadge}
        </div>
        <h1 className="text-4xl font-bold">{t.usersTitle}</h1>
        <p className="mt-2 max-w-3xl text-white/60">{t.usersDescription}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">{t.userEmail}</th>
              <th className="px-4 py-3">{t.userName}</th>
              <th className="px-4 py-3">{t.userProvider}</th>
              <th className="px-4 py-3">{t.userRole}</th>
              <th className="px-4 py-3">{t.userCreatedAt}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/10">
                <td className="px-4 py-3">{user.email || '-'}</td>
                <td className="px-4 py-3">{user.display_name || '-'}</td>
                <td className="px-4 py-3">{user.auth_provider || '-'}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(event) => handleRoleChange(user.id, event.target.value)}
                    disabled={savingUserId === user.id}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 disabled:opacity-50"
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">{new Date(user.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
