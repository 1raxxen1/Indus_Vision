from django.contrib import admin

from .models import Upload


@admin.register(Upload)
class UploadAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "source_name", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("source_name", "user__username")
