import { AuthUser } from '@/types/user';

interface UserTableProps {
  users: AuthUser[] | null;
}

export const UserTable = ({ users }: UserTableProps) => {
  if (!users || users.length === 0) {
    // This component expects users to be non-null and have length > 0
    // The calling component should handle empty/loading states.
    return null;
  }

  return (
    <table className="min-w-full">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            User
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Email
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Role
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Joined
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {users.map((user) => (
          <tr key={user.id} className="hover:bg-slate-50/60 transition">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold shrink-0">
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-900">{user.name || '—'}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                user.role === 'ADMIN'
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {user.role}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};