from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Dashboard(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dashboard",
    )
    greeting = models.CharField(max_length=120, default="Welcome")
    widgets = models.JSONField(default=dict, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Dashboard({self.user})"
