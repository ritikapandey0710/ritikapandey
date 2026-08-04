/**
 * Simple API service for making requests to the backend
 */

import axios from 'axios';

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
  sortBy?: string; // e.g., 'createdAt', 'subject'
  sortOrder?: 'asc' | 'desc';
}

export async function fetchTickets(params?: TicketFetchParams) {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.priority) queryParams.append("priority", params.priority);
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
  subject: string;
  body?: string;
  status?: string;
  category?: string;
  senderName: string;
  senderEmail: string;
  assignedTo?: string;
}) {
  const url = `/tickets`;

  try {
    const response = await api.post(url, ticketData, {
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
  description?: string;
  status?: string;
  assigneeId?: string;
}>) {
  const url = `/tickets/${id}`;

  try {
    const response = await api.patch(url, ticketData, {
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

// User management functions
export async function fetchUsers() {
  const response = await api.get('/users', {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

// User management functions
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