from django.contrib import admin

from .models import AdminSetting, UserSetting


@admin.register(UserSetting)
class UserSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "theme", "language", "timezone", "notifications_enabled", "updated_at")
    list_filter = ("theme", "language", "notifications_enabled")
    search_fields = ("user__username", "user__email", "timezone")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("User", {"fields": ("user",)}),
        ("Preferences", {"fields": (("theme", "language", "timezone"), "notifications_enabled", "preferences")}),
        ("Dates", {"fields": (("created_at", "updated_at"),), "classes": ("collapse",)}),
    )


@admin.register(AdminSetting)
class AdminSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "key", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("key", "description")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Setting", {"fields": (("key", "is_active"), "description")}),
        ("Value", {"fields": ("value",)}),
        ("Dates", {"fields": (("created_at", "updated_at"),), "classes": ("collapse",)}),
    )
