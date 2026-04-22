# Django API Endpoints for Frontend Integration

Base URL: `http://127.0.0.1:8000`

## Primary React API

| Feature | Method | Endpoint |
|---|---|---|
| API index | GET | `/posts/api/` |
| Login metrics | GET | `/posts/api/login/` |
| Dashboard metrics | GET | `/posts/api/dashboard/` |
| Upload metrics | GET, POST | `/posts/api/upload/` |
| Results metrics | GET | `/posts/api/results/` |
| Scan inventory metrics | GET | `/posts/api/scan-inventory/` |
| Analytics metrics | GET | `/posts/api/analytics/` |
| Settings metrics | GET | `/posts/api/settings/` |
| Admin metrics | GET | `/posts/api/admin/` |
| Image pipeline (Llama + Selenium skeleton) | POST | `/posts/api/process-image/` |

### `POST /posts/api/process-image/`
Accepts:
- `multipart/form-data` with `image` file, or
- form field `image_name`

Returns:
- `message`
- `input.image_name`
- `output.extraction`
- `output.pricing`

## Health Endpoints (per app)

| App | Method | Endpoint |
|---|---|---|
| accounts_app | GET | `/accounts/` |
| dashboard_app | GET | `/dashboard/` |
| uploads_app | GET | `/uploads/` |
| results_app | GET | `/results/` |
| inventory_app | GET | `/inventory/` |
| analytics_app | GET | `/analytics/` |
| app_settings | GET | `/app-settings/` |
