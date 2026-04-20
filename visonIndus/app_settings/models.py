from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class UserSetting(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_setting",
    )
    theme = models.CharField(max_length=20, default="light")
    language = models.CharField(max_length=12, default="en")
    timezone = models.CharField(max_length=64, default="UTC")
    notifications_enabled = models.BooleanField(default=True)
    preferences = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Settings({self.user})"


class AdminSetting(TimeStampedModel):
    key = models.CharField(max_length=80, unique=True)
    value = models.JSONField(default=dict, blank=True)
    description = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.key
