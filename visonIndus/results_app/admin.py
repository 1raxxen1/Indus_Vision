from django.contrib import admin

from .models import Result


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("id", "upload", "confidence_score", "processing_time_ms", "created_at")
    search_fields = ("upload__source_name",)
