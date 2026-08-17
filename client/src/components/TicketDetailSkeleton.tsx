import { Skeleton } from '@/components/ui/Skeleton';

export const TicketDetailSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Title and meta row */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Skeleton width="6" height="6" className="rounded-full" />
          <div className="space-y-1">
            <Skeleton width="48" height="4" className="rounded" />
            <Skeleton width="32" height="4" className="rounded mt-1" />
          </div>
        </div>

        {/* Ticket #, Status, Priority, Category row */}
        <div className="grid grid-cols-1 gap-4 text-sm">
          <Skeleton width="32" height="4" className="rounded" />
          <Skeleton width="24" height="4" className="rounded" />
          <Skeleton width="20" height="4" className="rounded" />
          <Skeleton width="20" height="4" className="rounded" />
        </div>
      </div>

      {/* Sender Information */}
      <div>
        <Skeleton width="40" height="4" className="rounded mb-2" /> {/* Name label */}
        <div className="grid grid-cols-2 gap-4">
          <Skeleton width="48" height="4" className="rounded" /> {/* Name value */}
          <Skeleton width="48" height="4" className="rounded" /> {/* Email value */}
        </div>
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <Skeleton width="40" height="4" className="rounded mb-2" /> {/* Assignee label */}
        <div className="flex items-center space-x-3">
          <Skeleton width="8" height="8" className="rounded-full" /> {/* Avatar */}
          <Skeleton width="32" height="4" className="rounded" /> {/* Name */}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Skeleton width="40" height="4" className="rounded mb-2" /> {/* Status label */}
        <Skeleton width="20" height="4" className="rounded" /> {/* Status value */}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Skeleton width="40" height="4" className="rounded mb-2" /> {/* Category label */}
        <Skeleton width="20" height="4" className="rounded" /> {/* Category value */}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton width="40" height="4" className="rounded mb-2" /> {/* Description label */}
        <Skeleton width="64" height="4" className="rounded mb-2" /> {/* Line 1 */}
        <Skeleton width="48" height="4" className="rounded mb-2" /> {/* Line 2 */}
        <Skeleton width="56" height="4" className="rounded" /> {/* Line 3 */}
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Skeleton width="32" height="4" className="rounded mb-1" /> {/* Created At label */}
          <Skeleton width="32" height="4" className="rounded" /> {/* Created At value */}
        </div>
        <div className="space-y-1">
          <Skeleton width="32" height="4" className="rounded mb-1" /> {/* Updated At label */}
          <Skeleton width="32" height="4" className="rounded" /> {/* Updated At value */}
        </div>
      </div>
    </div>
  );
};