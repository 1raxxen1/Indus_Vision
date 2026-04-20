from django.db import models

from core.models import TimeStampedModel
from uploads_app.models import Upload


class Result(TimeStampedModel):
    upload = models.OneToOneField(
        Upload,
        on_delete=models.CASCADE,
        related_name="result",
    )
    model_output = models.JSONField(default=dict, blank=True)
    technical_datasheet = models.JSONField(default=dict, blank=True)
    price_details = models.JSONField(default=dict, blank=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    processing_time_ms = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Result for upload #{self.upload_id}"
