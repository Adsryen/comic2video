import api, { isDemoMode } from './api.js';

let demoUsers = [
  {
    id: 'demo-user-1',
    external_auth_id: 'supabase-user-1',
    email: 'admin@example.com',
    display_name: 'Admin User',
    auth_provider: 'email',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-user-2',
    external_auth_id: 'supabase-user-2',
    email: 'member@example.com',
    display_name: 'Member User',
    auth_provider: 'google',
    role: 'member',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const listUsers = async () => {
  if (isDemoMode) {
    return demoUsers;
  }

  const response = await api.get('/api/v1/admin/users');
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  if (isDemoMode) {
    demoUsers = demoUsers.map((user) => (user.id === userId ? { ...user, role } : user));
    return demoUsers.find((user) => user.id === userId) || null;
  }

  const response = await api.patch(`/api/v1/admin/users/${userId}/role`, { role });
  return response.data;
};
