from django.contrib import admin

from .models import Result


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("id", "upload", "confidence_score", "runtime_mode", "processing_time_ms", "created_at")
    search_fields = ("upload__source_name",)
    readonly_fields = ("runtime_mode",)

    def runtime_mode(self, obj):
        return (obj.model_output or {}).get("runtime", {}).get("mode", "unknown")
