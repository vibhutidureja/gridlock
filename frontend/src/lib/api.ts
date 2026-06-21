import axios from "axios";

// Using explicit 127.0.0.1 to avoid IPv6 localhost blackholes
const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
// Ensure it always has /api/v1 even if the cached env var doesn't
const API_URL = envUrl.includes('/api/v1') ? envUrl : `${envUrl.replace(/\/$/, '')}/api/v1`;
const baseURL = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

export const api = axios.create({
  baseURL: baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getEvents = async () => {
  const response = await api.get("events/");
  return response.data;
};

export const createEvent = async (eventData: any) => {
  const response = await api.post("events/", eventData);
  return response.data;
};

export const simulateImpact = async (eventData: any) => {
  // AI orchestrator calls OpenAI so needs a longer timeout
  const response = await api.post("simulate", eventData, { timeout: 60000 });
  return response.data;
};

export const predictImpact = async (eventData: any) => {
  const response = await api.post("predict-impact/", eventData);
  return response.data;
};

export const resolveEvent = async (eventId: string, data: {
  resolution_description: string;
  actual_resolution_time_mins: number;
  ai_accurate: boolean;
}) => {
  const response = await api.post(`events/${eventId}/resolve`, data);
  return response.data;
};
