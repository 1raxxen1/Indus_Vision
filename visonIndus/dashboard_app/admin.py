from django.contrib import admin

from .models import Dashboard


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "greeting", "last_seen", "updated_at")
    search_fields = ("user__username", "greeting")
