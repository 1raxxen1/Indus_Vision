from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class LoginActivity(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="login_activities",
    )
    email = models.EmailField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    successful = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "success" if self.successful else "failed"
        return f"{self.email} ({status})"
