# from django.http import HttpResponse
from django.shortcuts import render
from django.http import HttpResponse
from django.conf import settings
import os

def homepage(request):
    # return HttpResponse("Hello World")
    return render(request , 'home.html')

def about(request):
    return render(request , 'about.html')
   # return HttpResponse("about page")

def spa_view(request):
    """Serve the React SPA index.html for all non-API routes."""
    index_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'dist', 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r') as f:
            content = f.read()
        return HttpResponse(content, content_type='text/html')
    return HttpResponse("SPA not built", status=404)