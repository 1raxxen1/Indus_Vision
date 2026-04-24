import base64
import json

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.http import JsonResponse
from django.db import transaction
from django.views.decorators.http import require_GET, require_http_methods
from django.views.decorators.csrf import csrf_exempt

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


def _serialize_result(result: Result) -> dict:
    model_output = result.model_output or {}
    technical_datasheet = result.technical_datasheet or {}
    pricing_payload = result.price_details or {}
    extracted_product = model_output.get("product", {})
    pricing_rows = pricing_payload.get("prices", [])

    image_url = result.upload.image.url if result.upload and result.upload.image else None
    detection_name = extracted_product.get("name") or result.upload.source_name or "Detected component"
    confidence = int(float(result.confidence_score or 0))
    raw_text = technical_datasheet.get("raw_text", "")
    ocr_tokens = [token.strip() for token in raw_text.split() if token.strip()]

    normalized_suppliers = [
        {
            "name": row.get("source", "Unknown source"),
            "price": row.get("price"),
            "unit": row.get("availability", "N/A"),
            "url": row.get("url", ""),
        }
        for row in pricing_rows
    ]
    numeric_prices = [
        float(row.get("price"))
        for row in pricing_rows
        if row.get("price") is not None and str(row.get("price")).replace(".", "", 1).isdigit()
    ]
    per_unit = numeric_prices[0] if numeric_prices else None

    return {
        "scanId": result.id,
        "scanTime": result.created_at.isoformat(),
        "imageUrl": image_url,
        "detection": {
            "name": detection_name,
            "category": "Industrial Component",
            "confidence": confidence,
            "description": f"Model extraction for {detection_name}",
            "specifications": [
                {"key": "Model number", "value": extracted_product.get("model_number", "TODO")},
                {"key": "Manufacturer", "value": extracted_product.get("manufacturer", "TODO")},
                {"key": "Voltage", "value": technical_datasheet.get("voltage", "TODO")},
                {"key": "Power", "value": technical_datasheet.get("power", "TODO")},
                {"key": "Dimensions", "value": technical_datasheet.get("dimensions", "TODO")},
            ],
        },
        "ocr": {
            "texts": ocr_tokens or ["TODO: OCR/vision text pending model integration"],
        },
        "pricing": {
            "priceMin": min(numeric_prices) if numeric_prices else None,
            "priceMax": max(numeric_prices) if numeric_prices else None,
            "perUnit": per_unit,
            "trend": "stable",
            "suppliers": normalized_suppliers,
        },
        "storage": {
            "uploadId": result.upload_id,
            "uploadStatus": result.upload.status,
        },
        "raw": {
            "model_output": model_output,
            "technical_datasheet": technical_datasheet,
            "price_details": pricing_payload,
        },
    }


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


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def authenticate_login(request):
    """Handle actual user authentication."""
    if request.method == "OPTIONS":
        return JsonResponse({}, status=204)

    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not username or not password:
        return JsonResponse({"error": "Username and password required"}, status=400)

    from django.contrib.auth import authenticate
    user = authenticate(username=username, password=password)

    if user is not None:
        # Log successful login
        LoginActivity.objects.create(
            user=user,
            email=user.email or username,
            successful=True,
            ip_address=_get_client_ip(request)
        )
        return JsonResponse({
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            }
        })
    else:
        # Log failed login attempt
        fallback_user, _ = get_user_model().objects.get_or_create(
            username="failed_login",
            defaults={"email": "failed_login@local.invalid"},
        )
        LoginActivity.objects.create(
            user=fallback_user,
            email=username,
            successful=False,
            ip_address=_get_client_ip(request)
        )
        return JsonResponse({"success": False, "error": "Invalid credentials"}, status=401)


def _get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


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
def result_detail_api(request, result_id: int):
    try:
        result = Result.objects.select_related("upload").get(id=result_id)
    except Result.DoesNotExist:
        return JsonResponse(
            {
                "error": "Result not found",
                "status": "not_found",
            },
            status=404,
        )

    return JsonResponse(_serialize_result(result))


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
    """React API endpoint for Llama -> Selenium pipeline (single or multi-image)."""
    upload_files = request.FILES.getlist("images")
    single_upload = request.FILES.get("image")

    if single_upload:
        upload_files.append(single_upload)

    if request.content_type and "application/json" in request.content_type and not upload_files:
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse(
                {"error": "Invalid JSON payload.", "status": "invalid_request"},
                status=400,
            )

        base64_images = payload.get("images_base64") or []
        single_base64_image = payload.get("image_base64")
        if single_base64_image:
            base64_images.append(single_base64_image)

        for index, encoded_image in enumerate(base64_images):
            try:
                if "," in encoded_image:
                    _, encoded_image = encoded_image.split(",", 1)
                decoded = base64.b64decode(encoded_image)
            except (ValueError, TypeError):
                return JsonResponse(
                    {
                        "error": f"Invalid base64 image payload at index {index}.",
                        "status": "invalid_request",
                    },
                    status=400,
                )

            file_name = f"base64_upload_{index + 1}.png"
            upload_files.append(ContentFile(decoded, name=file_name))

    if not upload_files:
        return JsonResponse(
            {
                "error": (
                    "Provide at least one image file in 'images' or 'image', "
                    "or pass base64 images in 'images_base64' / 'image_base64'."
                ),
                "status": "invalid_request",
            },
            status=400,
        )

    upload_user = _resolve_upload_user(request)
    pipeline = ImageToPricePipeline()
    processed_results: list[dict] = []
    failed_uploads: list[dict] = []

    for upload_file in upload_files:
        image_name = request.POST.get("image_name") or upload_file.name
        with transaction.atomic():
            upload_record = Upload.objects.create(
                user=upload_user,
                image=upload_file,
                source_name=image_name,
                status="processing",
            )

            try:
                output = pipeline.run(
                    image_name=upload_record.image.name,
                    image_path=upload_record.image.path if upload_record.image else None,
                )
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

                processed_results.append(
                    {
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
                            "details_endpoint": f"/posts/api/results/{result_record.id}/",
                        },
                        "output": output,
                        "display": _serialize_result(result_record),
                    }
                )
            except Exception as exc:  # noqa: BLE001 - keep pipeline errors isolated per image
                upload_record.status = "failed"
                upload_record.save(update_fields=["status", "updated_at"])
                failed_uploads.append(
                    {
                        "image_name": image_name,
                        "uploaded_file_name": upload_record.image.name,
                        "upload_id": upload_record.id,
                        "error": str(exc),
                    }
                )

    status = (
        "completed"
        if processed_results and not failed_uploads
        else "partial_success"
        if processed_results and failed_uploads
        else "failed"
    )
    response_status = 200 if processed_results else 500

    response_payload = {
        "message": "Images processed through upload -> extraction -> selenium pricing -> storage pipeline",
        "status": status,
        "processed_count": len(processed_results),
        "failed_count": len(failed_uploads),
        "results": processed_results,
        "failures": failed_uploads,
    }
    if len(processed_results) == 1:
        response_payload.update(processed_results[0])

    return JsonResponse(response_payload, status=response_status)
