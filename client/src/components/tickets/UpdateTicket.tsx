import { useState, useEffect } from 'react';
import { getStatusLabel, getCategoryLabel } from '@/utils/ticketUtils';
import { TicketStatus, TicketCategory, TICKET_STATUSES, TICKET_CATEGORIES } from '@/types/ticket';
import type { Ticket } from '@/types/ticket';

interface UpdateTicketProps {
  originalTicket: Ticket;
  agents: Array<{ id: string; name: string; email: string }>;
  onSave: (payload: {
    assigneeId?: string | null;
    status?: TicketStatus;
    category?: TicketCategory | null;
  }) => Promise<void>;
}

function isTicketStatus(value: string): value is TicketStatus {
  return TICKET_STATUSES.includes(value as TicketStatus);
}

function isTicketCategory(value: string): value is TicketCategory {
  return TICKET_CATEGORIES.includes(value as TicketCategory);
}

interface BaselineValues {
  assigneeId: string;
  status: TicketStatus | '';
  category: TicketCategory | '';
}

export default function UpdateTicket({ originalTicket, agents, onSave }: UpdateTicketProps) {
  // Baseline ticket values (last saved state)
  const [baselineTicket, setBaselineTicket] = useState<BaselineValues>({
    assigneeId: originalTicket.assigneeId ?? '',
    status: originalTicket.status ?? '',
    category: originalTicket.category ?? '',
  });

  // Form state (current values in the form)
  const [selectedAssignee, setSelectedAssignee] = useState<string>(baselineTicket.assigneeId);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>(baselineTicket.status as TicketStatus | '');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | ''>(baselineTicket.category as TicketCategory | '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Reset baseline and form when originalTicket prop changes (e.g., after refetch)
  useEffect(() => {
    const newBaseline: BaselineValues = {
      assigneeId: originalTicket.assigneeId ?? '',
      status: originalTicket.status ?? '',
      category: originalTicket.category ?? '',
    };
    setBaselineTicket(newBaseline);
    setSelectedAssignee(newBaseline.assigneeId);
    setSelectedStatus(newBaseline.status);
    setSelectedCategory(newBaseline.category);
  }, [originalTicket.assigneeId, originalTicket.status, originalTicket.category]);

  const handleFieldChange = () => {
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveChanges = async () => {
    // Build payload with only changed fields
    const payload: Record<string, string | null> = {};
    if (selectedAssignee !== baselineTicket.assigneeId) {
      // Convert empty string to null for unassigning
      payload.assigneeId = selectedAssignee === '' ? null : selectedAssignee;
    }
    if (selectedStatus !== baselineTicket.status && isTicketStatus(selectedStatus)) {
      payload.status = selectedStatus;
    }
    if (selectedCategory !== baselineTicket.category) {
      payload.category = selectedCategory === '' ? null : (isTicketCategory(selectedCategory) ? selectedCategory : null);
    }

    if (Object.keys(payload).length === 0) {
      setSaveError('No changes to save');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await onSave(payload);
      // Update baseline to current form values after successful save
      setBaselineTicket({
        assigneeId: selectedAssignee,
        status: selectedStatus,
        category: selectedCategory,
      });
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Failed to update ticket');
    } finally {
      setIsSaving(false);
    }
  };

  if (!agents.length) {
    return (
      <div className="col-span-4">
        <div className="space-y-6">
          <p className="text-xs text-slate-500 italic">
            No agents available to assign
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-4">
      <div className="space-y-6">
        {/* Save feedback message (shown once) */}
        {saveError && (
          <p className="text-xs text-red-600" data-testid="save-error">{saveError}</p>
        )}
        {saveSuccess && (
          <p className="text-xs text-green-600" data-testid="save-success">Changes saved successfully!</p>
        )}

        {/* Assignee controls */}
        <section data-testid="assignee-controls">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Assignee</h3>
          <div className="mb-2 flex flex-col gap-1">
            <label htmlFor="assign-to-select" className="text-sm font-medium text-slate-700">Assign to:</label>
            <select
              id="assign-to-select"
              data-testid="assign-to-select"
              value={selectedAssignee}
              onChange={(e) => { setSelectedAssignee(e.target.value); handleFieldChange(); }}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
            >
              <option value="">Unassigned</option>
              {agents.map((agent: any) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.email})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-xl transition shadow-sm shadow-violet-200"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </section>

        {/* Status controls */}
        <section data-testid="status-controls">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Status</h3>
          <div className="mb-2 flex flex-col gap-1">
            <label htmlFor="status-select" className="text-sm font-medium text-slate-700">Status:</label>
            <select
              id="status-select"
              data-testid="status-select"
              value={selectedStatus}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStatus(isTicketStatus(val) ? val : '');
                handleFieldChange();
              }}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
            >
              {TICKET_STATUSES.map((status: TicketStatus) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-xl transition shadow-sm shadow-violet-200"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </section>

        {/* Category controls */}
        <section data-testid="category-controls">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Category</h3>
          <div className="mb-2 flex flex-col gap-1">
            <label htmlFor="category-select" className="text-sm font-medium text-slate-700">Category:</label>
            <select
              id="category-select"
              data-testid="category-select"
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(isTicketCategory(val) ? val : '');
                handleFieldChange();
              }}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
            >
              <option value="">— None —</option>
              {TICKET_CATEGORIES.map((category: TicketCategory) => (
                <option key={category} value={category}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-xl transition shadow-sm shadow-violet-200"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </section>
      </div>
    </div>
  );
}
