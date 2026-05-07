from django.contrib import admin

from .models import Result


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "upload",
        "product_name",
        "confidence_score",
        "runtime_mode",
        "pricing_status",
        "created_at",
    )
    list_filter = ("created_at", "confidence_score")
    search_fields = (
        "upload__source_name",
        "model_output__product__name",
        "model_output__product__model_number",
        "model_output__ocr_texts",
    )
    readonly_fields = ("runtime_mode", "product_name", "pricing_status", "created_at", "updated_at")
    date_hierarchy = "created_at"
    fieldsets = (
        ("Summary", {"fields": (("upload", "confidence_score"), ("product_name", "runtime_mode", "pricing_status"))}),
        ("AI Output", {"fields": ("model_output",), "classes": ("collapse",)}),
        ("Technical / OCR", {"fields": ("technical_datasheet",), "classes": ("collapse",)}),
        ("Pricing", {"fields": ("price_details",), "classes": ("collapse",)}),
        ("Timing", {"fields": (("processing_time_ms", "created_at", "updated_at"),)}),
    )

    def runtime_mode(self, obj):
        return (obj.model_output or {}).get("runtime", {}).get("mode", "unknown")

    def product_name(self, obj):
        return (obj.model_output or {}).get("product", {}).get("name", "Unknown")

    def pricing_status(self, obj):
        return (obj.price_details or {}).get("status", "unknown")
