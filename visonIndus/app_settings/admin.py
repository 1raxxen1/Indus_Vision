from django.contrib import admin

from .models import AdminSetting, UserSetting


@admin.register(UserSetting)
class UserSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "theme", "language", "timezone", "notifications_enabled", "updated_at")
    list_filter = ("theme", "language", "notifications_enabled")
    search_fields = ("user__username", "timezone")


@admin.register(AdminSetting)
class AdminSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "key", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("key", "description")
