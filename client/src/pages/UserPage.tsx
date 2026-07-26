import { authClient } from '../lib/auth-client';

export default function UserPage() {
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
        <h1 className="text-3xl font-bold text-center text-primary mb-8">
          User Management Dashboard
        </h1>
        {/* Additional admin-only user management features would go here */}
      </div>
    </div>
  );
}
