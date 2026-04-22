from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.db import transaction
from django.views.decorators.http import require_GET, require_http_methods

from accounts_app.models import LoginActivity
from analytics_app.models import Analytics
from app_settings.models import AdminSetting, UserSetting
from dashboard_app.models import Dashboard
from inventory_app.models import InventoryScan
from results_app.models import Result
from uploads_app.models import Upload
from .services import ImageToPricePipeline


def _resolve_upload_user(request):
    if request.user.is_authenticated:
        return request.user

    user_model = get_user_model()
    user, _ = user_model.objects.get_or_create(
        username="system_uploader",
        defaults={
            "email": "system_uploader@local.invalid",
        },
    )
    return user


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
                "process_image": "/posts/api/process-image/",
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


@require_http_methods(["POST"])
def process_image_api(request):
    """React API skeleton endpoint for Llama -> Selenium pipeline."""
    image_name = request.POST.get("image_name")
    upload_file = request.FILES.get("image")

    if upload_file and not image_name:
        image_name = upload_file.name

    if not image_name:
        return JsonResponse(
            {
                "error": "Provide image_name or image file in the request.",
                "status": "invalid_request",
            },
            status=400,
        )

    if not upload_file:
        return JsonResponse(
            {
                "error": "Provide an image file in form-data under 'image'.",
                "status": "invalid_request",
            },
            status=400,
        )

    upload_user = _resolve_upload_user(request)

    with transaction.atomic():
        upload_record = Upload.objects.create(
            user=upload_user,
            image=upload_file,
            source_name=image_name,
            status="processing",
        )

        pipeline = ImageToPricePipeline()
        output = pipeline.run(image_name=upload_record.image.name)

        extraction = output.get("extraction", {})
        confidence = extraction.get("confidence") or 0

        result_record = Result.objects.create(
            upload=upload_record,
            model_output=extraction,
            technical_datasheet=extraction.get("technical_datasheet", {}),
            price_details=output.get("pricing", {}),
            confidence_score=confidence,
        )

        upload_record.status = "completed"
        upload_record.save(update_fields=["status", "updated_at"])

    return JsonResponse(
        {
            "message": "Image persisted and processed with Llama + Selenium skeleton pipeline",
            "input": {
                "image_name": image_name,
                "uploaded_file_name": upload_record.image.name,
            },
            "upload": {
                "id": upload_record.id,
                "status": upload_record.status,
            },
            "result": {
                "id": result_record.id,
                "upload_id": result_record.upload_id,
            },
            "output": output,
        }
    )
