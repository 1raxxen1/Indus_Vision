from django.contrib import admin

from .models import Upload
from results_app.models import Result


@admin.register(Upload)
class UploadAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "source_name", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("source_name", "user__username")
    actions = ("create_manual_result",)

    @admin.action(description="Create placeholder AI result for selected uploads")
    def create_manual_result(self, request, queryset):
        created = 0
        skipped = 0
        for upload in queryset:
            if hasattr(upload, "result"):
                skipped += 1
                continue
            Result.objects.create(
                upload=upload,
                model_output={
                    "product": {
                        "name": upload.source_name or "Manually added component",
                        "model_number": "LOCAL-MANUAL",
                        "manufacturer": "Local Entry",
                    },
                    "technical_datasheet": {
                        "voltage": "Unknown",
                        "power": "Unknown",
                        "dimensions": "Unknown",
                        "raw_text": "Manual result created from Django admin action.",
                    },
                    "confidence": 0.5,
                    "status": "manual",
                    "runtime": {
                        "mode": "manual_admin_entry",
                        "runtime_status": "manual",
                        "runtime_error": "",
                        "transformers_available": False,
                        "pillow_available": True,
                        "requested_device": "n/a",
                        "used_device": "n/a",
                    },
                },
                technical_datasheet={
                    "raw_text": "Manual result created from local/admin workflow.",
                },
                price_details={
                    "status": "manual",
                    "prices": [],
                },
                confidence_score=50,
            )
            upload.status = "completed"
            upload.save(update_fields=["status", "updated_at"])
            created += 1

        if created:
            self.message_user(request, f"Created {created} manual result(s).")
        if skipped:
            self.message_user(request, f"Skipped {skipped} upload(s) that already had results.")
