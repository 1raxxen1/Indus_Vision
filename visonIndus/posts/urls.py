from django.urls import path

from . import views

urlpatterns = [
    # legacy/basic routes
    path('', views.post_list, name='posts-home'),
    path('login/', views.login_page, name='posts-login'),
    path('dashboard/', views.dashboard_page, name='posts-dashboard'),
    path('upload/', views.upload_page, name='posts-upload'),
    path('results/', views.results_page, name='posts-results'),
    path('scan-inventory/', views.scan_inventory_page, name='posts-scan-inventory'),
    path('analytics/', views.analytics_page, name='posts-analytics'),
    path('settings/', views.settings_page, name='posts-settings'),
    path('admin/', views.admin_page, name='posts-admin'),

    # react/api routes
    path('api/', views.api_index, name='posts-api-index'),
    path('api/login/', views.login_page, name='posts-api-login'),
    path('api/dashboard/', views.dashboard_page, name='posts-api-dashboard'),
    path('api/upload/', views.upload_page, name='posts-api-upload'),
    path('api/results/', views.results_page, name='posts-api-results'),
    path('api/scan-inventory/', views.scan_inventory_page, name='posts-api-scan-inventory'),
    path('api/analytics/', views.analytics_page, name='posts-api-analytics'),
    path('api/settings/', views.settings_page, name='posts-api-settings'),
    path('api/admin/', views.admin_page, name='posts-api-admin'),
    path('api/process-image/', views.process_image_api, name='posts-api-process-image'),
]
