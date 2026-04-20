from django.db import models

from core.models import TimeStampedModel


class Analytics(TimeStampedModel):
    period_start = models.DateField()
    period_end = models.DateField()
    total_uploads = models.PositiveIntegerField(default=0)
    successful_scans = models.PositiveIntegerField(default=0)
    failed_scans = models.PositiveIntegerField(default=0)
    avg_processing_time_ms = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-period_end"]

    def __str__(self):
        return f"Analytics {self.period_start} to {self.period_end}"
