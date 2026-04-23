// inventoryService.js
// GET /posts/api/scan-inventory/ — inventory scan totals

import api from './api'

export const inventoryService = {

  // Fetch inventory summary and item list
  getScanInventory: () => api.get('/scan-inventory/'),

  // Expected response:
  // {
  //   total_items:    1284,
  //   total_value:    240000,
  //   low_stock:      3,
  //   out_of_stock:   1,
  //   items: [
  //     { id, name, part_number, category, quantity,
  //       unit_price, total_value, status, last_scan }
  //   ]
  // }
}