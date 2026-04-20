from django.contrib import admin

from .models import Analytics


@admin.register(Analytics)
class AnalyticsAdmin(admin.ModelAdmin):
    list_display = ("id", "period_start", "period_end", "total_uploads", "successful_scans", "failed_scans")
    list_filter = ("period_start", "period_end")
