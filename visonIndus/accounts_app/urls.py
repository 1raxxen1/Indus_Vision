from django.urls import path

from . import views

urlpatterns = [
    path("", views.health, name="accounts_app-health"),
    path("login/", views.login_api, name="accounts_app-login"),
    path("register/", views.register_api, name="accounts_app-register"),
    path("profile/", views.profile_api, name="accounts_app-profile"),
    path("password/", views.password_api, name="accounts_app-password"),
]
