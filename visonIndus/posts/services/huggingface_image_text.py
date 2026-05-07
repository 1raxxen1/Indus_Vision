from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from PIL import Image
import torch
from transformers import BlipForConditionalGeneration, BlipProcessor


@dataclass
class HuggingFaceImageTextConfig:
    """Configuration for hosted/local image-to-text captioning."""

    model_id: str = os.getenv("HF_IMAGE_TEXT_MODEL", "Salesforce/blip-image-captioning-base")
    api_token: str | None = os.getenv("HF_API_TOKEN") or os.getenv("HUGGINGFACE_API_TOKEN")
    api_url: str | None = os.getenv("HF_IMAGE_TEXT_URL")
    timeout_seconds: int = int(os.getenv("HF_IMAGE_TEXT_TIMEOUT", "30"))
    hosted_enabled: bool = os.getenv("HF_ENABLE_IMAGE_TEXT", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    local_enabled: bool = os.getenv("HF_ENABLE_LOCAL_IMAGE_TEXT", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    device: str = os.getenv("HF_IMAGE_TEXT_DEVICE", "cuda")
    max_new_tokens: int = int(os.getenv("HF_IMAGE_TEXT_MAX_NEW_TOKENS", "64"))
    prefer_local: bool = os.getenv("HF_IMAGE_TEXT_PREFER_LOCAL", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


class HuggingFaceImageTextService:
    """Generates image captions via hosted Hugging Face API or local BLIP.

    `Salesforce/blip-image-captioning-base` is intentionally the default because
    it is small enough for a 6 GB RTX 3060 Mobile when loaded locally with fp16.
    """

    def __init__(self, config: HuggingFaceImageTextConfig | None = None) -> None:
        self.config = config or HuggingFaceImageTextConfig()
        self._processor = None
        self._model = None
        self._runtime_error = ""

    def generate(self, image_path: str | None, image_name: str = "") -> dict[str, Any]:
        if not image_path:
            return self._runtime_payload(status="image_not_provided", image_name=image_name)
        if not Path(image_path).exists():
            return self._runtime_payload(status="image_not_found", image_name=image_name)

        if self.config.prefer_local:
            local_payload = self._generate_local(image_path=image_path, image_name=image_name)
            if local_payload["status"] == "completed" or not self.config.hosted_enabled:
                return local_payload
            return self._generate_hosted(image_path=image_path, image_name=image_name, local_error=local_payload)

        hosted_payload = self._generate_hosted(image_path=image_path, image_name=image_name)
        if hosted_payload["status"] == "completed" or not self.config.local_enabled:
            return hosted_payload
        return self._generate_local(image_path=image_path, image_name=image_name, hosted_error=hosted_payload)

    def _generate_hosted(
        self,
        image_path: str,
        image_name: str,
        local_error: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self.config.hosted_enabled:
            return self._runtime_payload(status="hosted_disabled", image_name=image_name, local_error=local_error)
        if not self.config.api_token and not self.config.api_url:
            return self._runtime_payload(status="api_token_not_configured", image_name=image_name, local_error=local_error)

        try:
            payload = self._call_inference_api(image_path=image_path)
        except HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            return self._runtime_payload(
                status="api_error",
                image_name=image_name,
                error=f"HTTP {exc.code}: {error_body}",
                local_error=local_error,
            )
        except (OSError, URLError, TimeoutError) as exc:
            return self._runtime_payload(
                status="request_failed",
                image_name=image_name,
                error=str(exc),
                local_error=local_error,
            )
        except json.JSONDecodeError as exc:
            return self._runtime_payload(
                status="invalid_json_response",
                image_name=image_name,
                error=str(exc),
                local_error=local_error,
            )

        caption = self._caption_from_payload(payload)
        return self._runtime_payload(
            status="completed" if caption else "empty_response",
            image_name=image_name,
            caption=caption,
            raw_response=payload,
            mode="hosted_api",
            local_error=local_error,
        )

    def _generate_local(
        self,
        image_path: str,
        image_name: str,
        hosted_error: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self.config.local_enabled:
            return self._runtime_payload(status="local_disabled", image_name=image_name, hosted_error=hosted_error)

        try:
            self._lazy_load_local_model()
            image = Image.open(image_path).convert("RGB")
            inputs = self._processor(images=image, return_tensors="pt").to(self._device())
            with torch.inference_mode():
                generated_ids = self._model.generate(**inputs, max_new_tokens=self.config.max_new_tokens)
            caption = self._processor.decode(generated_ids[0], skip_special_tokens=True).strip()
        except (OSError, RuntimeError, ValueError) as exc:
            self._runtime_error = str(exc)
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            return self._runtime_payload(
                status="local_inference_failed",
                image_name=image_name,
                error=str(exc),
                mode="local_cuda" if self._device() == "cuda" else "local_cpu",
                hosted_error=hosted_error,
            )

        return self._runtime_payload(
            status="completed",
            image_name=image_name,
            caption=caption,
            mode="local_cuda" if self._device() == "cuda" else "local_cpu",
            hosted_error=hosted_error,
        )

    def _lazy_load_local_model(self) -> None:
        if self._processor is not None and self._model is not None:
            return
        self._processor = BlipProcessor.from_pretrained(self.config.model_id)
        dtype = torch.float16 if self._device() == "cuda" else torch.float32
        self._model = BlipForConditionalGeneration.from_pretrained(
            self.config.model_id,
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
        ).to(self._device())
        self._model.eval()

    def _call_inference_api(self, image_path: str) -> Any:
        with open(image_path, "rb") as image_file:
            image_bytes = image_file.read()

        headers = {"Content-Type": "application/octet-stream"}
        if self.config.api_token:
            headers["Authorization"] = f"Bearer {self.config.api_token}"

        request = Request(
            url=self._endpoint_url(),
            data=image_bytes,
            headers=headers,
            method="POST",
        )
        with urlopen(request, timeout=self.config.timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))

    def _caption_from_payload(self, payload: Any) -> str:
        if isinstance(payload, list) and payload and isinstance(payload[0], dict):
            return str(payload[0].get("generated_text") or payload[0].get("caption") or "").strip()
        if isinstance(payload, dict):
            return str(payload.get("generated_text") or payload.get("caption") or payload.get("text") or "").strip()
        return ""

    def _runtime_payload(
        self,
        status: str,
        image_name: str,
        caption: str = "",
        error: str = "",
        raw_response: Any = None,
        mode: str = "hosted_api",
        hosted_error: dict[str, Any] | None = None,
        local_error: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "status": status,
            "model": self.config.model_id,
            "endpoint": self._endpoint_url(),
            "image_name": image_name,
            "caption": caption,
            "error": error,
            "raw_response": raw_response,
            "hosted_error": hosted_error,
            "local_error": local_error,
            "runtime": {
                "provider": "huggingface",
                "task": "image-to-text",
                "mode": mode,
                "hosted_enabled": self.config.hosted_enabled,
                "local_enabled": self.config.local_enabled,
                "prefer_local": self.config.prefer_local,
                "token_configured": bool(self.config.api_token),
                "requested_device": self.config.device,
                "used_device": self._device(),
                "cuda_available": torch.cuda.is_available(),
                "timeout_seconds": self.config.timeout_seconds,
            },
        }

    def _endpoint_url(self) -> str:
        if self.config.api_url:
            return self.config.api_url
        return f"https://api-inference.huggingface.co/models/{quote(self.config.model_id, safe='/')}"

    def _device(self) -> str:
        return "cuda" if self.config.device == "cuda" and torch.cuda.is_available() else "cpu"
