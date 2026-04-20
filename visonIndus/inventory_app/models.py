from django.conf import settings
from django.db import models

from core.models import TimeStampedModel
from uploads_app.models import Upload


class InventoryScan(TimeStampedModel):
    upload = models.ForeignKey(
        Upload,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_scans",
    )
    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_scans",
    )
    item_name = models.CharField(max_length=180)
    sku = models.CharField(max_length=80, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.item_name} ({self.quantity})"
