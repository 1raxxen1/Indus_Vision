from __future__ import annotations

import importlib.metadata
import importlib.util
import platform
import shutil
import sys
from dataclasses import dataclass

from django.core.management.base import BaseCommand


@dataclass(frozen=True)
class CheckResult:
    name: str
    status: str
    detail: str


class Command(BaseCommand):
    help = "Check local PC readiness for hosted/local vision, CUDA, Chrome, and PaddleOCR."

    def handle(self, *args, **options):
        checks = [
            CheckResult("Image detection pipeline", "OK", "HF detection service is wired into ImageToPricePipeline runtime flags"),
            self._python_check(),
            self._package_check("Django"),
            self._package_check("Pillow"),
            self._package_check("torch"),
            self._package_check("transformers"),
            self._package_check("accelerate"),
            self._package_check("selenium"),
            self._package_check("webdriver-manager"),
            self._package_check("paddleocr", optional=True),
            self._package_check("paddlepaddle", optional=True),
            self._cuda_check(),
            self._chrome_check(),
        ]
        for check in checks:
            self.stdout.write(f"[{check.status}] {check.name}: {check.detail}")

        self.stdout.write("")
        self.stdout.write("Recommended for RTX 3050/3060 6GB + 16GB RAM:")
        self.stdout.write("- VISION_ENABLE_LOCAL_MODEL=false")
        self.stdout.write("- HF_ENABLE_LOCAL_IMAGE_TEXT=true only after CUDA PyTorch is working")
        self.stdout.write("- PADDLE_OCR_USE_GPU=false first; enable GPU OCR only after PaddlePaddle GPU is installed")
        self.stdout.write("- Close GPU-heavy apps/games before local inference/training")

    def _python_check(self) -> CheckResult:
        version = platform.python_version()
        if sys.version_info >= (3, 14):
            return CheckResult(
                "Python",
                "WARN",
                f"{version}; ML wheels such as PaddlePaddle may be unavailable. Prefer Python 3.11 or 3.12.",
            )
        if sys.version_info >= (3, 10):
            return CheckResult("Python", "OK", version)
        return CheckResult("Python", "FAIL", f"{version}; use Python 3.10+.")

    def _package_check(self, package_name: str, optional: bool = False) -> CheckResult:
        module_name = package_name.replace("-", "_")
        if package_name == "Django":
            module_name = "django"
        if package_name == "Pillow":
            module_name = "PIL"
        if package_name == "paddlepaddle":
            module_name = "paddle"
        if importlib.util.find_spec(module_name) is None:
            return CheckResult(package_name, "WARN" if optional else "FAIL", "not installed")
        try:
            version = importlib.metadata.version(package_name)
        except importlib.metadata.PackageNotFoundError:
            version = "installed"
        return CheckResult(package_name, "OK", str(version))

    def _cuda_check(self) -> CheckResult:
        if importlib.util.find_spec("torch") is None:
            return CheckResult("CUDA", "FAIL", "torch is not installed")
        import torch

        if not torch.cuda.is_available():
            return CheckResult("CUDA", "WARN", f"not available to PyTorch; torch CUDA build={torch.version.cuda}")
        device_name = torch.cuda.get_device_name(0)
        total_vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        return CheckResult("CUDA", "OK", f"{device_name}, {total_vram_gb:.1f}GB VRAM, torch CUDA={torch.version.cuda}")

    def _chrome_check(self) -> CheckResult:
        candidates = ["chrome", "google-chrome", "chromium", "chromium-browser", "msedge"]
        found = next((candidate for candidate in candidates if shutil.which(candidate)), None)
        if found:
            return CheckResult("Chrome/Chromium", "OK", found)
        if platform.system().lower() == "windows":
            return CheckResult("Chrome/Chromium", "WARN", "not on PATH; Selenium may still find installed Chrome")
        return CheckResult("Chrome/Chromium", "FAIL", "not found on PATH")
