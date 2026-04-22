from django.urls import path
from . import views

urlpatterns = [
    path("", views.health, name="uploads_app-health"),
]
