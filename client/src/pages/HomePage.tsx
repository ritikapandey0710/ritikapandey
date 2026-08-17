import { authClient } from '../lib/auth-client';
import { fetchTickets } from '../api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { AuthUser } from '../types/user';
import { UserRole } from '../types/role';
import { Ticket, Clock, CheckCircle, PauseCircle, Users } from 'lucide-react';

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
    { label: 'Open Tickets', value: open, icon: Clock, color: 'bg-blue-50 text-blue-600' },
    { label: 'In Progress', value: inProgress, icon: PauseCircle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Resolved', value: resolved, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Tickets', value: total, icon: Ticket, color: 'bg-violet-50 text-violet-600' },
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome banner */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              {user.role === UserRole.ADMIN && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                  Admin
                </span>
              )}
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome back, {user.name?.split(' ')[0] ?? 'there'}!
              </h1>
            </div>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-violet-50 rounded-full" />
          <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-slate-50 rounded-full" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
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
                <Ticket className="w-4 h-4" />
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
                  <Users className="w-4 h-4" />
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
