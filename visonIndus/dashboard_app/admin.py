from django.contrib import admin

from .models import Dashboard


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "greeting", "last_seen", "updated_at")
    search_fields = ("user__username", "user__email", "greeting")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Dashboard", {"fields": ("user", "greeting", "last_seen")}),
        ("Widgets", {"fields": ("widgets",), "classes": ("collapse",)}),
        ("Dates", {"fields": (("created_at", "updated_at"),), "classes": ("collapse",)}),
    )
