from django.contrib import admin

from .models import LoginActivity


@admin.register(LoginActivity)
class LoginActivityAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "user", "ip_address", "successful", "created_at")
    list_filter = ("successful", "created_at")
    search_fields = ("email", "user__username", "ip_address")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Login", {"fields": (("email", "user"), ("successful", "ip_address"), "user_agent")}),
        ("Dates", {"fields": (("created_at", "updated_at"),), "classes": ("collapse",)}),
    )
