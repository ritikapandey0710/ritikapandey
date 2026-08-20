import { authClient } from '../lib/auth-client';
import { fetchDashboardStats } from '../api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { AuthUser } from '../types/user';
import { UserRole } from '../types/role';
import { Ticket, Clock, CheckCircle, Bot, Percent, Users, BarChart3, AlertCircle } from 'lucide-react';

function formatResolutionTime(hours: number): string {
  if (hours <= 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours * 10) / 10} hrs`;
  return `${Math.floor(hours / 24)}d ${Math.round(hours % 24)}h`;
}

function formatChartDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TicketsPerDayChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="w-full">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center justify-between h-48 text-[10px] text-slate-400 pr-1">
          <span>{maxCount}</span>
          <span>{Math.ceil(maxCount / 2)}</span>
          <span>0</span>
        </div>
        <div className="flex-1">
          <div className="relative h-48 flex items-end gap-[2px] sm:gap-1">
            {data.map((day, i) => {
              const height = day.count > 0 ? Math.max((day.count / maxCount) * 100, 4) : 2;
              const isHovered = hoveredIndex === i;
              return (
                <div
                  key={day.date}
                  className="flex-1 h-full flex flex-col items-center justify-end relative"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 z-10 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                      <div className="font-semibold">{formatChartDate(day.date)}</div>
                      <div className="text-slate-300">{day.count} ticket{day.count !== 1 ? 's' : ''}</div>
                    </div>
                  )}
                  <div
                    className={`w-full rounded-t-md transition-all duration-150 ${
                      day.count > 0 ? (isHovered ? 'bg-violet-500' : 'bg-violet-400') : 'bg-slate-100'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-[2px] sm:gap-1 mt-2">
            {data.map((day, i) => (
              <div key={day.date} className="flex-1 text-center">
                {i % 5 === 0 ? <span className="text-[10px] text-slate-400">{formatShortDate(day.date)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession();
  const enabled = !isPending && !!session;
  const navigate = useNavigate();

  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetchDashboardStats(),
    enabled,
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as AuthUser;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="h-4 w-24 bg-slate-200 animate-pulse rounded mb-3" />
                <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="h-4 w-48 bg-slate-200 animate-pulse rounded mb-4" />
            <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-700">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h2 className="font-semibold">Failed to load dashboard</h2>
            </div>
            <p className="text-sm">{(error as any)?.message || 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalTickets === 0) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                {user.role === UserRole.ADMIN && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">Admin</span>
                )}
                <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name?.split(' ')[0] ?? 'there'}!</h1>
              </div>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-violet-50 rounded-full" />
            <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-slate-50 rounded-full" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-7 h-7 text-violet-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">No tickets yet</h2>
            <p className="text-sm text-slate-500 mb-6">Create your first ticket to see dashboard analytics</p>
            <button
              onClick={() => navigate('/tickets')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200"
            >
              <Ticket className="w-4 h-4" /> Go to Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Total Tickets', value: stats.totalTickets.toLocaleString(), icon: Ticket, color: 'bg-violet-50 text-violet-600', sub: 'All tickets in system' },
    { label: 'Open Tickets', value: stats.openTickets.toLocaleString(), icon: Clock, color: 'bg-blue-50 text-blue-600', sub: 'Awaiting resolution' },
    { label: 'Resolved by AI', value: stats.aiResolvedTickets.toLocaleString(), icon: Bot, color: 'bg-emerald-50 text-emerald-600', sub: 'Auto-resolved tickets' },
    { label: '% Resolved by AI', value: `${stats.aiResolvedPercentage}%`, icon: Percent, color: 'bg-amber-50 text-amber-600', sub: 'Of total tickets' },
    { label: 'Avg Resolution Time', value: formatResolutionTime(stats.averageResolutionTime), icon: CheckCircle, color: 'bg-rose-50 text-rose-600', sub: 'Created → Resolved' },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              {user.role === UserRole.ADMIN && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">Admin</span>
              )}
              <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name?.split(' ')[0] ?? 'there'}!</h1>
            </div>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-violet-50 rounded-full" />
          <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-slate-50 rounded-full" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {metrics.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tickets Per Day</h2>
              <p className="text-xs text-slate-500">Last 30 days</p>
            </div>
          </div>
          <TicketsPerDayChart data={stats.ticketsPerDay} />
        </div>

      </div>
    </div>
  );
}
