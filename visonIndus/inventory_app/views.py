from django.http import JsonResponse
from django.views.decorators.http import require_GET

@require_GET
def health(request):
    return JsonResponse({"app": "inventory_app", "status": "ok"})
