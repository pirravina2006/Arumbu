import api from "./axiosClient.js";

export async function listChildren() {
  const response = await api.get("/children/");
  return response.data;
}

export async function listChildrenWithStatus() {
  const response = await api.get("/children/with-status");
  return response.data;
}

export async function createChild(payload) {
  const response = await api.post("/children/", payload);
  return response.data;
}

export async function getChildById(childId) {
  const response = await api.get(`/children/${childId}`);
  return response.data;
}

/** Calculates age in whole months from a YYYY-MM-DD dob string to today. */
export function calcAgeMonths(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  const now = new Date();
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth()) -
    (now.getDate() < dob.getDate() ? 1 : 0);
  return Math.max(0, months);
}
