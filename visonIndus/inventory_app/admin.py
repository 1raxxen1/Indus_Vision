from django.contrib import admin

from .models import InventoryScan


@admin.register(InventoryScan)
class InventoryScanAdmin(admin.ModelAdmin):
    list_display = ("id", "item_name", "sku", "quantity", "unit_price", "scanned_by", "created_at")
    search_fields = ("item_name", "sku", "scanned_by__username")
