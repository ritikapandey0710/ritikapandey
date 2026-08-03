import { authClient } from '../lib/auth-client';
import { fetchTickets } from '../api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { AuthUser } from '../types/user';
import { UserRole } from '../types/role';

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession();
  const enabled = !isPending && !!session;
  const navigate = useNavigate();

  const { data: tickets } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => fetchTickets(),
    enabled,
  });

  const open = tickets?.filter((t: any) => t.status === 'OPEN').length ?? 0;
  const inProgress = tickets?.filter((t: any) => t.status === 'IN_PROGRESS').length ?? 0;
  const resolved = tickets?.filter((t: any) => t.status === 'RESOLVED').length ?? 0;
  const total = tickets?.length ?? 0;

  const stats = [
    { label: 'Open Tickets',  value: open,       color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
    { label: 'In Progress',   value: inProgress,  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
    { label: 'Resolved',      value: resolved,    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Total Tickets', value: total,       color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100' },
  ];

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as AuthUser;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Welcome banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 mb-8 shadow-lg shadow-violet-200">
          <div className="relative z-10">
            {user.role === UserRole.ADMIN && (
              <span className="inline-block px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full mb-1">Admin</span>
            )}
            <h1 className="text-2xl font-bold text-white">Welcome back, {user.name?.split(' ')[0] ?? 'there'}! 👋</h1>
            <p className="text-violet-200 text-sm mt-1">{user.email}</p>
          </div>
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-white/5 rounded-full" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(stat => (
            <div key={stat.label} className={`bg-white rounded-2xl border ${stat.border} p-5 shadow-sm hover:shadow-md transition`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/tickets')}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition group text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 group-hover:bg-violet-200 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">View Tickets</p>
                <p className="text-xs text-slate-500">Browse and manage tickets</p>
              </div>
            </button>
            {user.role === UserRole.ADMIN && (
              <button
                onClick={() => navigate('/user')}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Manage Users</p>
                  <p className="text-xs text-slate-500">View and edit user accounts</p>
                </div>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
