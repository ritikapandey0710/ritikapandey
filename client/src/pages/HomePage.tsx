import { authClient } from '../lib/auth-client';

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <h1 className="text-2xl font-bold mb-1">Welcome back, {session.user.name}! 👋</h1>
          <p className="text-white/80 text-sm">{session.user.email}</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Open Tickets", value: "0", icon: "🎫", color: "bg-blue-50 border-blue-100" },
            { label: "In Progress", value: "0", icon: "⚙️", color: "bg-yellow-50 border-yellow-100" },
            { label: "Resolved", value: "0", icon: "✅", color: "bg-green-50 border-green-100" },
          ].map(card => (
            <div key={card.label} className={`rounded-xl border p-5 ${card.color} shadow-sm`}>
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
