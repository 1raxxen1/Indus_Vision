from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Upload(TimeStampedModel):
    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="uploads",
    )
    image = models.FileField(upload_to="uploads/%Y/%m/%d")
    source_name = models.CharField(max_length=180, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued")

    def __str__(self):
        return f"Upload #{self.id} - {self.status}"
