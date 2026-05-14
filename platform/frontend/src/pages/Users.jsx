import { useEffect, useState } from 'react';
import { listUsers } from '../api/users.js';
import { usePlatformI18n } from '../components/platform/platformText';

const surface = 'rounded-3xl border border-white/10 bg-black/25 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl';

export default function UsersPage() {
  const { t } = usePlatformI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await listUsers();
        setUsers(data);
      } catch (loadError) {
        setUsers([]);
        setError(loadError?.response?.data?.detail || loadError?.message || t.usersLoadFailed);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 text-white">
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 shadow-[0_20px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8">
        <div className="mb-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-200">
          {t.usersAdminBadge}
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t.userManagementTitle}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">{t.usersPageDescription}</p>
      </section>

      <section className={surface}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{t.usersListTitle}</h2>
            <p className="mt-1 text-sm text-white/50">{t.usersListDescription}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            {users.length} {t.usersCountLabel}
          </div>
        </div>

        {loading ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/70">{t.loadingUsers}</div> : null}
        {!loading && error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div> : null}
        {!loading && !error && !users.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white/60">{t.noUsersFound}</div> : null}

        {!loading && !error && users.length ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="grid grid-cols-[1.6fr_1.2fr_0.8fr_0.8fr] gap-4 border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.2em] text-white/45">
              <div>{t.userEmail}</div>
              <div>{t.userName}</div>
              <div>{t.userRole}</div>
              <div>{t.userStatus}</div>
            </div>
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-[1.6fr_1.2fr_0.8fr_0.8fr] gap-4 border-b border-white/5 px-5 py-4 text-sm last:border-b-0">
                <div className="font-medium text-white">{user.email}</div>
                <div className="text-white/70">{user.display_name || t.dashPlaceholder}</div>
                <div>
                  <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-purple-100">{user.role}</span>
                </div>
                <div>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-emerald-100">{user.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
