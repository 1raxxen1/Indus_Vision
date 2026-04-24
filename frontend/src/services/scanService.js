// scanService.js
// Handles image upload, processing, and results.
// This is your most important service — connects to the AI pipeline.

import api from './api'

export const scanService = {

  // ── POST /posts/api/process-image/ ───────────────────────────
  // THE CORE ENDPOINT — sends image, gets AI result back
  // FormData fields: image (required), image_name (optional)
  processImage: (file, imageName = '') => {
    const formData = new FormData()
    formData.append('image',      file)
    formData.append('image_name', imageName || file.name)
    return api.post('/process-image/', formData)
    // Expected response:
    // {
    //   result_id:  "RES-001",
    //   scan_id:    "SCN-001",
    //   status:     "completed",
    //   detection:  { name, category, confidence, description, specifications },
    //   ocr:        { texts: ["M8", "8.8", ...] },
    //   pricing:    { min, max, per_unit, suppliers: [...] }
    // }
  },

  // ── GET /posts/api/upload/ ────────────────────────────────────
  // Returns upload queue and status summary
  getUploadStatus: () => api.get('/upload/'),

  // ── POST /posts/api/upload/ ───────────────────────────────────
  // Updates upload queue/status
  updateUploadStatus: (data) => api.post('/upload/', data),

  // ── GET /posts/api/results/ ───────────────────────────────────
  // Returns latest result ID and summary list
  getResults: () => api.get('/results/'),

  // ── GET /posts/api/results/<id>/ ──────────────────────────────
  // Returns one normalized result payload
  getResultById: (id) => api.get(`/results/${id}/`),

  // ── POST /posts/api/scan-inventory/ ───────────────────────────
  // Saves a processed scan as an inventory item
  saveToInventory: (payload) => api.post('/scan-inventory/', payload),
}
