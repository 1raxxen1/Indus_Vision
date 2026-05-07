from django.contrib import admin
from django.utils.html import format_html

from .models import Upload
from results_app.models import Result


class ResultInline(admin.StackedInline):
    model = Result
    extra = 0
    can_delete = False
    max_num = 1
    fields = (
        ("confidence_score", "processing_time_ms"),
        "runtime_mode",
        "model_output",
        "technical_datasheet",
        "price_details",
    )
    readonly_fields = ("runtime_mode", "model_output", "technical_datasheet", "price_details")
    classes = ("collapse",)

    def runtime_mode(self, obj):
        return (obj.model_output or {}).get("runtime", {}).get("mode", "unknown")


@admin.register(Upload)
class UploadAdmin(admin.ModelAdmin):
    list_display = ("id", "thumbnail", "source_name", "user", "status", "result_summary", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("source_name", "user__username", "user__email", "result__model_output")
    readonly_fields = ("thumbnail", "created_at", "updated_at")
    date_hierarchy = "created_at"
    list_select_related = ("user",)
    inlines = (ResultInline,)
    actions = ("create_manual_result", "mark_queued", "mark_failed")
    fieldsets = (
        (
            "Upload",
            {
                "fields": (
                    ("user", "status"),
                    "source_name",
                    "image",
                    "thumbnail",
                    ("created_at", "updated_at"),
                )
            },
        ),
    )

    def thumbnail(self, obj):
        if not obj or not obj.image:
            return "No image"
        return format_html(
            '<a href="{}" target="_blank"><img src="{}" style="max-height:80px; max-width:120px; object-fit:contain;" /></a>',
            obj.image.url,
            obj.image.url,
        )

    def result_summary(self, obj):
        result = getattr(obj, "result", None)
        if not result:
            return "No result"
        product = (result.model_output or {}).get("product", {})
        runtime = (result.model_output or {}).get("runtime", {})
        return f"{product.get('name') or 'Detected'} / {runtime.get('mode', 'unknown')}"

    @admin.action(description="Mark selected uploads as queued")
    def mark_queued(self, request, queryset):
        updated = queryset.update(status="queued")
        self.message_user(request, f"Marked {updated} upload(s) as queued.")

    @admin.action(description="Mark selected uploads as failed")
    def mark_failed(self, request, queryset):
        updated = queryset.update(status="failed")
        self.message_user(request, f"Marked {updated} upload(s) as failed.")

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
                technical_datasheet={"raw_text": "Manual result created from local/admin workflow."},
                price_details={"status": "manual", "prices": []},
                confidence_score=50,
            )
            upload.status = "completed"
            upload.save(update_fields=["status", "updated_at"])
            created += 1

        if created:
            self.message_user(request, f"Created {created} manual result(s).")
        if skipped:
            self.message_user(request, f"Skipped {skipped} upload(s) that already had results.")
