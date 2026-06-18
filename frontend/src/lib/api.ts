import axios from "axios";

// Using NEXT_PUBLIC_API_URL if defined, otherwise defaulting to localhost
const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// Ensure it always has /api/v1 even if the cached env var doesn't
const API_URL = envUrl.includes('/api/v1') ? envUrl : `${envUrl.replace(/\/$/, '')}/api/v1`;
const baseURL = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

export const api = axios.create({
  baseURL: baseURL,
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
  const response = await api.post("simulate", eventData);
  return response.data;
};

export const predictImpact = async (eventData: any) => {
  const response = await api.post("predict-impact/", eventData);
  return response.data;
};
