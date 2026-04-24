import base64
import json

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.http import JsonResponse
from django.db import transaction
from django.db.utils import OperationalError, ProgrammingError
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

PIPELINE = ImageToPricePipeline()


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
        "runtime_flags": model_output.get("runtime", {}),
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
    try:
        results = list(Result.objects.select_related("upload").order_by("-created_at")[:100])
    except (OperationalError, ProgrammingError):
        results = []
    serialized_results = []
    for result in results:
        product = (result.model_output or {}).get("product", {})
        runtime = (result.model_output or {}).get("runtime", {})
        serialized_results.append(
            {
                "id": result.id,
                "scan_id": result.id,
                "name": product.get("name") or result.upload.source_name or "Unknown",
                "component_name": product.get("name") or result.upload.source_name or "Unknown",
                "status": "review" if runtime.get("mode") == "fallback" else "completed",
                "confidence": int(float(result.confidence_score or 0)),
                "created_at": result.created_at.isoformat(),
                "time": result.created_at.strftime("%H:%M"),
                "date": result.created_at.strftime("%Y-%m-%d"),
                "runtime_mode": runtime.get("mode", "unknown"),
                "runtime_status": runtime.get("runtime_status", "unknown"),
            }
        )

    if not serialized_results:
        try:
            uploads_without_results = list(
                Upload.objects.filter(result__isnull=True).order_by("-created_at")[:100]
            )
        except (OperationalError, ProgrammingError):
            uploads_without_results = []

        serialized_results.extend(
            {
                "id": upload.id,
                "scan_id": upload.id,
                "name": upload.source_name or "Uploaded component",
                "component_name": upload.source_name or "Uploaded component",
                "status": "review" if upload.status in {"queued", "processing"} else upload.status,
                "confidence": 0,
                "created_at": upload.created_at.isoformat(),
                "time": upload.created_at.strftime("%H:%M"),
                "date": upload.created_at.strftime("%Y-%m-%d"),
                "runtime_mode": "not_processed",
                "runtime_status": upload.status,
            }
            for upload in uploads_without_results
        )

    try:
        total_results = Result.objects.count()
        latest_result_id = Result.objects.order_by("-id").values_list("id", flat=True).first()
    except (OperationalError, ProgrammingError):
        total_results = 0
        latest_result_id = None

    return JsonResponse(
        {
            "total_results": total_results,
            "latest_result_id": latest_result_id,
            "results": serialized_results,
        }
    )


@require_GET
def result_detail_api(request, result_id: int):
    try:
        result = Result.objects.select_related("upload").get(id=result_id)
    except (Result.DoesNotExist, OperationalError, ProgrammingError):
        try:
            upload = Upload.objects.filter(id=result_id).first()
        except (OperationalError, ProgrammingError):
            upload = None
        if upload:
            return JsonResponse(
                {
                    "scanId": upload.id,
                    "scanTime": upload.created_at.isoformat(),
                    "imageUrl": upload.image.url if upload.image else None,
                    "detection": {
                        "name": upload.source_name or "Uploaded component",
                        "category": "Pending analysis",
                        "confidence": 0,
                        "description": "No AI result has been stored for this upload yet.",
                        "specifications": [],
                    },
                    "ocr": {"texts": []},
                    "pricing": {
                        "priceMin": None,
                        "priceMax": None,
                        "perUnit": None,
                        "trend": "neutral",
                        "suppliers": [],
                    },
                    "storage": {"uploadId": upload.id, "uploadStatus": upload.status},
                    "runtime_flags": {
                        "mode": "not_processed",
                        "runtime_status": upload.status,
                        "runtime_error": "",
                    },
                }
            )
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
    try:
        scans = list(InventoryScan.objects.select_related("upload").order_by("-created_at")[:200])
    except (OperationalError, ProgrammingError):
        scans = []

    items = [
        {
            "id": scan.id,
            "name": scan.item_name,
            "part_number": scan.sku or "",
            "category": "Industrial Component",
            "quantity": scan.quantity,
            "unit_price": float(scan.unit_price) if scan.unit_price is not None else 0,
            "total_value": float(scan.unit_price or 0) * scan.quantity,
            "status": "Low stock" if scan.quantity <= 2 else "In stock",
            "last_scan": scan.created_at.isoformat(),
        }
        for scan in scans
    ]

    return JsonResponse(
        {
            "inventory_scans": len(scans),
            "total_quantity": sum(scan.quantity for scan in scans),
            "total_items": len(scans),
            "total_value": sum(item["total_value"] for item in items),
            "low_stock": len([item for item in items if item["status"] == "Low stock"]),
            "out_of_stock": len([item for item in items if item["quantity"] == 0]),
            "items": items,
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


@csrf_exempt
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
                output = PIPELINE.run(
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
                        "runtime_flags": output.get("runtime_flags", {}),
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
