// analyticsService.js
// GET /posts/api/analytics/ — analytics snapshot

import api from './api'

export const analyticsService = {

  getSnapshot: () => api.get('/analytics/'),

  // Expected response:
  // {
  //   scan_trend:     [{ day: "Mon", scans: 8, completed: 7 }, ...],
  //   category_split: [{ name: "Fasteners", count: 487 }, ...],
  //   value_trend:    [{ month: "Nov", value: 68000 }, ...],
  //   confidence_dist:[{ range: "90-100%", count: 68 }, ...],
  //   top_components: [{ name, category, scan_count, avg_confidence, avg_price }]
  // }
}