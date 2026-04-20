from django.contrib import admin

from .models import (
    AdminSetting,
    Analytics,
    Dashboard,
    InventoryScan,
    LoginActivity,
    Result,
    Upload,
    UserSetting,
)


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'greeting', 'last_seen', 'updated_at')
    search_fields = ('user__username', 'greeting')


@admin.register(LoginActivity)
class LoginActivityAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'user', 'ip_address', 'successful', 'created_at')
    list_filter = ('successful', 'created_at')
    search_fields = ('email', 'user__username', 'ip_address')


@admin.register(Upload)
class UploadAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'source_name', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('source_name', 'user__username')


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ('id', 'upload', 'confidence_score', 'processing_time_ms', 'created_at')
    search_fields = ('upload__source_name',)


@admin.register(InventoryScan)
class InventoryScanAdmin(admin.ModelAdmin):
    list_display = ('id', 'item_name', 'sku', 'quantity', 'unit_price', 'scanned_by', 'created_at')
    search_fields = ('item_name', 'sku', 'scanned_by__username')


@admin.register(Analytics)
class AnalyticsAdmin(admin.ModelAdmin):
    list_display = ('id', 'period_start', 'period_end', 'total_uploads', 'successful_scans', 'failed_scans')
    list_filter = ('period_start', 'period_end')


@admin.register(UserSetting)
class UserSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'theme', 'language', 'timezone', 'notifications_enabled', 'updated_at')
    list_filter = ('theme', 'language', 'notifications_enabled')
    search_fields = ('user__username', 'timezone')


@admin.register(AdminSetting)
class AdminSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('key', 'description')
