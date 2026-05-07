from django.contrib import admin

from .models import InventoryScan


@admin.register(InventoryScan)
class InventoryScanAdmin(admin.ModelAdmin):
    list_display = ("id", "item_name", "sku", "quantity", "unit_price", "scanned_by", "created_at")
    list_filter = ("created_at", "scanned_by")
    search_fields = ("item_name", "sku", "notes", "scanned_by__username")
    autocomplete_fields = ("upload", "scanned_by")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
    fieldsets = (
        ("Item", {"fields": (("item_name", "sku"), ("quantity", "unit_price"))}),
        ("Scan", {"fields": (("upload", "scanned_by"), "notes")}),
        ("Dates", {"fields": (("created_at", "updated_at"),), "classes": ("collapse",)}),
    )
