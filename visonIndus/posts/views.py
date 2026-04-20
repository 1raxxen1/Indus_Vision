from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_http_methods

from .models import (
    AdminSetting,
    Analytics,
    Dashboard,
    InventoryScan,
    LoginActivity,
    Result,
    Upload,
    UserSetting,
)


@require_GET
def post_list(request):
    """Backwards-compatible endpoint for the existing route."""
    return JsonResponse(
        {
            "message": "Posts service is active.",
            "available_endpoints": [
                "/posts/login/",
                "/posts/dashboard/",
                "/posts/upload/",
                "/posts/results/",
                "/posts/scan-inventory/",
                "/posts/analytics/",
                "/posts/settings/",
                "/posts/admin/",
            ],
        }
    )


@require_GET
def api_index(request):
    """API discovery endpoint for React frontend integration."""
    return JsonResponse(
        {
            "message": "Posts React API endpoints",
            "endpoints": {
                "login": "/posts/api/login/",
                "dashboard": "/posts/api/dashboard/",
                "upload": "/posts/api/upload/",
                "results": "/posts/api/results/",
                "scan_inventory": "/posts/api/scan-inventory/",
                "analytics": "/posts/api/analytics/",
                "settings": "/posts/api/settings/",
                "admin": "/posts/api/admin/",
            },
        }
    )


@require_GET
def login_page(request):
    return JsonResponse(
        {
            "total_login_events": LoginActivity.objects.count(),
            "failed_login_events": LoginActivity.objects.filter(successful=False).count(),
        }
    )


@require_GET
def dashboard_page(request):
    return JsonResponse(
        {
            "dashboards": Dashboard.objects.count(),
            "uploads": Upload.objects.count(),
            "results": Result.objects.count(),
        }
    )


@require_http_methods(["GET", "POST"])
def upload_page(request):
    return JsonResponse(
        {
            "method": request.method,
            "queued_uploads": Upload.objects.filter(status="queued").count(),
            "processing_uploads": Upload.objects.filter(status="processing").count(),
            "completed_uploads": Upload.objects.filter(status="completed").count(),
            "failed_uploads": Upload.objects.filter(status="failed").count(),
        }
    )


@require_GET
def results_page(request):
    return JsonResponse(
        {
            "total_results": Result.objects.count(),
            "latest_result_id": Result.objects.order_by("-id").values_list("id", flat=True).first(),
        }
    )


@require_GET
def scan_inventory_page(request):
    return JsonResponse(
        {
            "inventory_scans": InventoryScan.objects.count(),
            "total_quantity": sum(InventoryScan.objects.values_list("quantity", flat=True)),
        }
    )


@require_GET
def analytics_page(request):
    latest_snapshot = Analytics.objects.order_by("-period_end").first()
    return JsonResponse(
        {
            "analytics_snapshots": Analytics.objects.count(),
            "latest_period": (
                f"{latest_snapshot.period_start} to {latest_snapshot.period_end}"
                if latest_snapshot
                else None
            ),
        }
    )


@require_GET
def settings_page(request):
    return JsonResponse(
        {
            "user_settings": UserSetting.objects.count(),
            "admin_settings": AdminSetting.objects.filter(is_active=True).count(),
        }
    )


@require_GET
def admin_page(request):
    return JsonResponse(
        {
            "admin_settings": AdminSetting.objects.count(),
            "active_admin_settings": AdminSetting.objects.filter(is_active=True).count(),
        }
    )
