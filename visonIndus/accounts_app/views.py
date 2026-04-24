from __future__ import annotations

import json

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import LoginActivity


def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _log_login_attempt(request, email: str, user, successful: bool):
    # LoginActivity.user is non-null in current schema, so use a service user for failed attempts.
    if user is None:
        user_model = get_user_model()
        user, _ = user_model.objects.get_or_create(
            username="failed_login",
            defaults={"email": "failed_login@local.invalid", "password": make_password(None)},
        )

    LoginActivity.objects.create(
        user=user,
        email=email or "unknown@local.invalid",
        successful=successful,
        ip_address=_get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:1024],
    )


@require_GET
def health(request):
    return JsonResponse({"app": "accounts_app", "status": "ok"})


@csrf_exempt
@require_http_methods(["POST"])
def login_api(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "error": "Invalid JSON payload"}, status=400)

    username_or_email = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username_or_email or not password:
        return JsonResponse({"success": False, "error": "Username/email and password are required"}, status=400)

    user = authenticate(username=username_or_email, password=password)

    if user is None and "@" in username_or_email:
        user_model = get_user_model()
        matched_user = user_model.objects.filter(email__iexact=username_or_email).first()
        if matched_user:
            user = authenticate(username=matched_user.username, password=password)

    if user is None:
        _log_login_attempt(request, username_or_email, None, False)
        return JsonResponse({"success": False, "error": "Invalid credentials"}, status=401)

    _log_login_attempt(request, user.email or username_or_email, user, True)
    return JsonResponse(
        {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def register_api(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "error": "Invalid JSON payload"}, status=400)

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return JsonResponse({"success": False, "error": "username, email, and password are required"}, status=400)

    user_model = get_user_model()
    if user_model.objects.filter(username__iexact=username).exists():
        return JsonResponse({"success": False, "error": "Username already exists"}, status=409)
    if user_model.objects.filter(email__iexact=email).exists():
        return JsonResponse({"success": False, "error": "Email already exists"}, status=409)

    try:
        validate_password(password)
    except ValidationError as exc:
        return JsonResponse({"success": False, "error": " ".join(exc.messages)}, status=400)

    user = user_model.objects.create_user(username=username, email=email, password=password)
    return JsonResponse(
        {
            "success": True,
            "message": "Account created successfully",
            "user": {"id": user.id, "username": user.username, "email": user.email},
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def profile_api(request):
    if request.method == "GET":
        # Lightweight default profile for frontend bootstrapping
        username = request.GET.get("username", "")
        user_model = get_user_model()
        user = user_model.objects.filter(username=username).first() if username else None
        return JsonResponse(
            {
                "name": user.username if user else "",
                "email": user.email if user else "",
            }
        )

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    email = (data.get("email") or "").strip().lower()
    name = (data.get("name") or "").strip()
    if not email or not name:
        return JsonResponse({"error": "name and email are required"}, status=400)

    user_model = get_user_model()
    user = user_model.objects.filter(email__iexact=email).first()
    if user is None:
        return JsonResponse({"error": "User not found"}, status=404)

    user.username = name
    user.email = email
    user.save(update_fields=["username", "email"])
    return JsonResponse({"success": True, "name": user.username, "email": user.email})


@csrf_exempt
@require_http_methods(["POST"])
def password_api(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    email = (data.get("email") or "").strip().lower()

    if not current_password or not new_password or not email:
        return JsonResponse({"error": "email, current_password and new_password are required"}, status=400)

    user_model = get_user_model()
    user = user_model.objects.filter(email__iexact=email).first()
    if user is None:
        return JsonResponse({"error": "User not found"}, status=404)

    if not user.check_password(current_password):
        return JsonResponse({"error": "Current password is incorrect"}, status=400)

    try:
        validate_password(new_password, user=user)
    except ValidationError as exc:
        return JsonResponse({"error": " ".join(exc.messages)}, status=400)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return JsonResponse({"success": True})
