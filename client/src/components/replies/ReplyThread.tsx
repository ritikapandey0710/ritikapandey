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
      <div className="flex items-center gap-3 text-sm text-slate-500 py-8">
        <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading replies...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 rotate-[-90deg]" />
        Failed to load replies: {error}
      </div>
    );
  }

  if (!replies || replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <ChevronRight className="h-6 w-6 text-slate-400 rotate-[-90deg]" />
        </div>
        <p className="text-sm text-slate-500">No replies yet</p>
        <p className="mt-1 text-xs text-slate-400">Be the first to respond!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {replies.map((reply) => {
        const isAgent = reply.senderType === 'AGENT';
        const authorName = reply.author?.name || 'Unknown';
        const authorInitials = authorName
          .split(' ')
          .map(part => part[0])
          .join('')
          .toUpperCase()
          .substring(0, 2) || '?';
        const timestamp = new Date(reply.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return (
          <div key={reply.id} className="flex w-full">
            {/* Customer messages (LEFT) */}
            {!isAgent && (
              <div className="flex-max w-[calc(100%-4rem)]">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{authorInitials}</span>
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 max-w-[70%]">
                    <div className="flex items-start gap-2 mb-2 text-sm">
                      <span className="font-medium text-slate-900">{authorName}</span>
                      <span className="inline-flex items-center px-2.5 px-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800">
                        Customer
                      </span>
                      <span className="ml-2 text-xs text-slate-400">{timestamp}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-line">{reply.body}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Agent messages (RIGHT) */}
            {isAgent && (
              <div className="flex-max w-[calc(100%-4rem)] ml-auto">
                <div className="flex items-start gap-3">
                  {/* Message Bubble */}
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 max-w-[70%]">
                    <div className="flex items-start gap-2 mb-2 text-sm justify-end">
                      <span className="ml-2 text-xs text-slate-400">{timestamp}</span>
                      <span className="inline-flex items-center px-2.5 px-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800">
                        Agent
                      </span>
                      <span className="font-medium text-slate-900">{authorName}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-line">{reply.body}</p>
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center ml-3">
                    <span className="text-sm font-medium text-blue-600">{authorInitials}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};