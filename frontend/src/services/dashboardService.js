// dashboardService.js
// GET /posts/api/dashboard/ — returns summary counts

import api from './api'

export const dashboardService = {

  // Fetch all dashboard summary data in one call
  getSummary: () => api.get('/dashboard/'),

  // Example response your Django should return:
  // {
  //   total_items:     1284,
  //   total_scans:     142,
  //   accuracy_rate:   98,
  //   inventory_value: 240000,
  //   recent_scans: [
  //     { id: "SCN-001", name: "M8 Bolt", status: "completed",
  //       time: "2 hrs ago", price: "₹45" },
  //     ...
  //   ],
  //   category_breakdown: [
  //     { name: "Fasteners", count: 487 },
  //     ...
  //   ]
  // }
}