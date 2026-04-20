from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base model with created/updated timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Dashboard(TimeStampedModel):
    """Per-user dashboard preferences and quick stats."""

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


class LoginActivity(TimeStampedModel):
    """Tracks login events for the login page and audits."""

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


class Upload(TimeStampedModel):
    """Stores uploaded product images for processing."""

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


class Result(TimeStampedModel):
    """Parsed technical data and price results for an upload."""

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


class InventoryScan(TimeStampedModel):
    """Inventory entries generated from scan results."""

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


class Analytics(TimeStampedModel):
    """Stores summarized analytics snapshots shown in analytics page."""

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


class UserSetting(TimeStampedModel):
    """Settings values for app users."""

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
    """Global administrative settings and feature flags."""

    key = models.CharField(max_length=80, unique=True)
    value = models.JSONField(default=dict, blank=True)
    description = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.key
