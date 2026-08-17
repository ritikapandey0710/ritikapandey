import { ChevronRight } from 'lucide-react';

export interface ReplyAuthor {
  id?: string;
  name?: string;
  email?: string;
}

export interface Reply {
  id: string;
  body: string;
  ticketId?: string;
  authorId?: string;
  senderType?: string;
  createdAt: string;
  author?: ReplyAuthor;
}

interface ReplyThreadProps {
  replies: Reply[] | undefined;
  isLoading: boolean;
  error: string | null;
}

export const ReplyThread: React.FC<ReplyThreadProps> = ({ replies, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading replies...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 rotate-[-90deg]" />
        Failed to load replies: {error}
      </div>
    );
  }

  if (!replies || replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <ChevronRight className="h-5 w-5 text-slate-400 rotate-[-90deg]" />
        </div>
        <p className="text-sm text-slate-500">No replies yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <div key={reply.id} className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {reply.author?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {reply.author?.name || 'Unknown'}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  reply.senderType === 'AGENT'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {reply.senderType === 'AGENT' ? 'Agent' : 'Customer'}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
              {reply.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
