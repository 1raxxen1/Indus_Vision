from django.urls import path
from . import views

urlpatterns = [
    path("", views.health, name="accounts_app-health"),
]
