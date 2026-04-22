# Frontend API List

Base URL prefix for core app routes: `/posts/api/`

## Posts API endpoints
- `GET /posts/api/` — API discovery/index.
- `GET /posts/api/login/` — Login activity summary.
- `GET /posts/api/dashboard/` — Dashboard summary counts.
- `GET|POST /posts/api/upload/` — Upload queue/status summary.
- `GET /posts/api/results/` — Result summary + latest result id.
- `GET /posts/api/scan-inventory/` — Inventory scan totals.
- `GET /posts/api/analytics/` — Analytics snapshot summary.
- `GET /posts/api/settings/` — User/admin settings summary.
- `GET /posts/api/admin/` — Admin settings summary.
- `POST /posts/api/process-image/` — Persists uploaded image to DB/storage, runs skeleton image-to-price pipeline, and stores a `Result` record.
  - Required form-data: `image` (file).
  - Optional form-data: `image_name` (falls back to uploaded filename when omitted).

## Non-API site routes (useful for frontend navigation)
- `GET /` — Homepage.
- `GET /about/` — About page.
- `GET /posts/` — Posts service status.
- `GET /posts/login/`
- `GET /posts/dashboard/`
- `GET /posts/upload/`
- `GET /posts/results/`
- `GET /posts/scan-inventory/`
- `GET /posts/analytics/`
- `GET /posts/settings/`
- `GET /posts/admin/`

## App health endpoints
- `GET /accounts/`
- `GET /dashboard/`
- `GET /uploads/`
- `GET /results/`
- `GET /inventory/`
- `GET /analytics/`
- `GET /app-settings/`
