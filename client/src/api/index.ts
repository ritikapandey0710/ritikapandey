import { TicketStatus, TicketCategory } from '@/types/ticket';
import axios from 'axios';

/**
 * Simple API service for making requests to the backend
 */

const API_BASE_URL = "/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending cookies with the request
});

export interface TicketFetchParams {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  senderName?: string;
  assignedTo?: string;
  sortBy?: string; // e.g., 'createdAt', 'subject'
  sortOrder?: 'asc' | 'desc';
}

export async function fetchTickets(params?: TicketFetchParams) {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.priority) queryParams.append("priority", params.priority);
  if (params?.category) queryParams.append("category", params.category);
  if (params?.senderName) queryParams.append("senderName", params.senderName);
  if (params?.assignedTo) queryParams.append("assignedTo", params.assignedTo);
  if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const url = `/tickets${queryParams.toString() ? `?${queryParams}` : ""}`;

  try {
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching tickets:", error);
    throw new Error(`Failed to fetch tickets: ${error.response?.status || 'Unknown error'}`);
  }
}

export async function createTicket(ticketData: {
  title: string;
  body?: string;
  status?: string;
  category?: string;
  senderName: string;
  senderEmail: string;
  assignedTo?: string;
}) {
  const url = `/tickets`;

  // Map client `body` field to server `description` field
  const { body, ...rest } = ticketData;
  const payload: any = { ...rest, description: body };

  try {
    const response = await api.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    throw new Error(`Failed to create ticket: ${error.response?.status || 'Unknown error'}`);
  }
}

export async function updateTicket(id: string, ticketData: Partial<{
  title: string;
  body?: string | null;
  status?: TicketStatus;
  category?: TicketCategory | null;
  assigneeId?: string | null;
}>) {
  const url = `/tickets/${id}`;

  // Map client `body` field to server `description` field
  const { body, ...rest } = ticketData;
  const payload: any = { ...rest };
  if (body !== undefined) payload.description = body;

  try {
    const response = await api.patch(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error updating ticket:", error);
    throw new Error(`Failed to update ticket: ${error.response?.status || 'Unknown error'}`);
  }
}

export async function deleteTicket(id: string) {
  const url = `/tickets/${id}`;

  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error: any) {
    console.error("Error deleting ticket:", error);
    throw new Error(`Failed to delete ticket: ${error.response?.status || 'Unknown error'}`);
  }
}

export async function fetchTicketById(id: string) {
  const url = `/tickets/${id}`;

  try {
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching ticket by id:", error);
    throw new Error(`Failed to fetch ticket: ${error.response?.status || 'Unknown error'}`);
  }
}

export async function fetchRepliesByTicketId(ticketId: string) {
  const url = `/tickets/${ticketId}/replies`;

  try {
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching replies:", error);
    throw new Error(`Failed to fetch replies: ${error.response?.status || 'Unknown error'}`);
  }
}

export async function createReply(ticketId: string, replyData: { body: string }) {
  const url = `/tickets/${ticketId}/replies`;

  try {
    const response = await api.post(url, replyData, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error creating reply:", error);
    throw new Error(`Failed to create reply: ${error.response?.status || 'Unknown error'}`);
  }
}

export async function polishReply(text: string, ticketId?: string, customerName?: string, subject?: string): Promise<{ polished: string }> {
  const url = `/ai/polish`;

  try {
    const response = await api.post(url, { subject, text, ticketId, customerName }, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error polishing reply:", error);

    // Detect HTTP 429 (rate limit / quota exceeded) from the express-rate-limit middleware
    if (error.response?.status === 429) {
      throw new Error(
        "You've reached the request limit for reply polishing. " +
        "Please wait a moment and try again later."
      );
    }

    // Check if this is a Gemini quota exceeded error from the AI service
    if (error.response?.data?.error?.includes("You exceeded your current quota")) {
      throw new Error(
        "Gemini API quota exceeded. Please try again later or contact support if this persists."
      );
    }

    throw new Error(
      error.response?.data?.error ||
      `Failed to polish reply: ${error.response?.status || 'Unknown error'}`
    );
  }
}

export async function summarizeTicket(ticketId: string) {
  const url = `/ai/summarize`;

  try {
    const response = await api.post(url, { ticketId }, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error summarizing ticket:", error);

    // Detect HTTP 429 (rate limit / quota exceeded) from the express-rate-limit middleware
    if (error.response?.status === 429) {
      throw new Error(
        "You've reached the request limit for ticket summarization. " +
        "Please wait a moment and try again later."
      );
    }

    // Check if this is a Gemini quota exceeded error from the AI service
    if (error.response?.data?.error?.includes("You exceeded your current quota")) {
      throw new Error(
        "Gemini API quota exceeded. Please try again later or contact support if this persists."
      );
    }

    throw new Error(
      error.response?.data?.error ||
      `Failed to summarize ticket: ${error.response?.status || 'Unknown error'}`
    );
  }
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  aiResolvedTickets: number;
  aiResolvedPercentage: number;
  averageResolutionTime: number;
  ticketsPerDay: { date: string; count: number }[];
}

export async function fetchDashboardStats() {
  const url = `/dashboard`;

  try {
    const response = await api.get(url);
    return response.data as DashboardStats;
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    throw new Error(`Failed to fetch dashboard stats: ${error.response?.status || 'Unknown error'}`);
  }
}

// User management functions
export async function fetchUsers() {
  const response = await api.get('/users', {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function createUser(userData: { name: string; email: string; password: string }) {
  const response = await api.post('/users', userData, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

// Update user
export async function updateUser(id: string, userData: { name?: string; email?: string; password?: string }) {
  const response = await api.patch(`/users/${id}`, userData, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

// Delete user (optional)
export async function deleteUser(id: string) {
  const response = await api.delete(`/users/${id}`);
  return response.data;
}