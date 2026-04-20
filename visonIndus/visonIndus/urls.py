"""
URL configuration for visonIndus project.
"""
from django.contrib import admin
from django.urls import include, path

from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.homepage),
    path('about/', views.about),
    path('posts/', include('posts.urls')),
    path('accounts/', include('accounts_app.urls')),
    path('dashboard/', include('dashboard_app.urls')),
    path('uploads/', include('uploads_app.urls')),
    path('results/', include('results_app.urls')),
    path('inventory/', include('inventory_app.urls')),
    path('analytics/', include('analytics_app.urls')),
    path('app-settings/', include('app_settings.urls')),
]
