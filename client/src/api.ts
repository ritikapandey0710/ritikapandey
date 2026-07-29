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

export async function fetchTickets(params?: {
  search?: string;
  status?: string;
  priority?: string;
}) {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.priority) queryParams.append("priority", params.priority);

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
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
}) {
  const url = `/tickets`;

  try {
    const response = await api.post(url, ticketData, {
      headers: {
        "Content-Type": "application/json",
      },
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
  priority?: string;
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