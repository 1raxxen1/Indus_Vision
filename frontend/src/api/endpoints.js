export const API_BASE = "http://127.0.0.1:8000";

export const ENDPOINTS = {
  apiIndex: `${API_BASE}/posts/api/`,
  login: `${API_BASE}/posts/api/login/`,
  dashboard: `${API_BASE}/posts/api/dashboard/`,
  upload: `${API_BASE}/posts/api/upload/`,
  results: `${API_BASE}/posts/api/results/`,
  scanInventory: `${API_BASE}/posts/api/scan-inventory/`,
  analytics: `${API_BASE}/posts/api/analytics/`,
  settings: `${API_BASE}/posts/api/settings/`,
  admin: `${API_BASE}/posts/api/admin/`,
  processImage: `${API_BASE}/posts/api/process-image/`,

  // App health endpoints
  accountsHealth: `${API_BASE}/accounts/`,
  dashboardHealth: `${API_BASE}/dashboard/`,
  uploadsHealth: `${API_BASE}/uploads/`,
  resultsHealth: `${API_BASE}/results/`,
  inventoryHealth: `${API_BASE}/inventory/`,
  analyticsHealth: `${API_BASE}/analytics/`,
  appSettingsHealth: `${API_BASE}/app-settings/`,
};
