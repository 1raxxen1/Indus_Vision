from django.contrib import admin

from .models import Analytics


@admin.register(Analytics)
class AnalyticsAdmin(admin.ModelAdmin):
    list_display = ("id", "period_start", "period_end", "total_uploads", "successful_scans", "failed_scans")
    list_filter = ("period_start", "period_end")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "period_end"
    fieldsets = (
        ("Period", {"fields": (("period_start", "period_end"),)}),
        ("Scan Metrics", {"fields": (("total_uploads", "successful_scans", "failed_scans"), "avg_processing_time_ms")}),
        ("Metadata", {"fields": ("metadata",), "classes": ("collapse",)}),
        ("Dates", {"fields": (("created_at", "updated_at"),), "classes": ("collapse",)}),
    )
