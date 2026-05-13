from __future__ import annotations

import json
import os
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from PIL import Image
import torch
from dotenv import load_dotenv
from transformers import VisionEncoderDecoderModel, ViTImageProcessor, AutoTokenizer

# Suppress non-critical transformers warnings
warnings.filterwarnings('ignore', message='.*attention mask.*')
warnings.filterwarnings('ignore', message='.*torch_dtype.*')
warnings.filterwarnings('ignore', message='.*max_new_tokens.*max_length.*')

# Load .env file to get fresh environment variables
load_dotenv()


@dataclass
class HuggingFaceImageTextConfig:
    """Configuration for hosted/local image-to-text captioning."""

    model_id: str | None = None
    api_token: str | None = None
    api_url: str | None = None
    timeout_seconds: int | None = None
    hosted_enabled: bool | None = None
    local_enabled: bool | None = None
    device: str | None = None
    max_new_tokens: int | None = None
    prefer_local: bool | None = None

    def __post_init__(self) -> None:
        """Initialize from environment variables at instantiation time (after Django loads .env)."""
        if self.model_id is None:
            self.model_id = os.getenv("HF_IMAGE_TEXT_MODEL", "nlpconnect/vit-gpt2-image-captioning")
        if self.api_token is None:
            self.api_token = os.getenv("HF_API_TOKEN") or os.getenv("HUGGINGFACE_API_TOKEN")
        if self.api_url is None:
            self.api_url = os.getenv("HF_IMAGE_TEXT_URL")
        if self.timeout_seconds is None:
            self.timeout_seconds = int(os.getenv("HF_IMAGE_TEXT_TIMEOUT", "30"))
        if self.hosted_enabled is None:
            self.hosted_enabled = os.getenv("HF_ENABLE_IMAGE_TEXT", "true").strip().lower() in {
                "1",
                "true",
                "yes",
                "on",
            }
        if self.local_enabled is None:
            self.local_enabled = os.getenv("HF_ENABLE_LOCAL_IMAGE_TEXT", "false").strip().lower() in {
                "1",
                "true",
                "yes",
                "on",
            }
        if self.device is None:
            self.device = os.getenv("HF_IMAGE_TEXT_DEVICE", "cuda")
        if self.max_new_tokens is None:
            self.max_new_tokens = int(os.getenv("HF_IMAGE_TEXT_MAX_NEW_TOKENS", "64"))
        if self.prefer_local is None:
            self.prefer_local = os.getenv("HF_IMAGE_TEXT_PREFER_LOCAL", "false").strip().lower() in {
                "1",
                "true",
                "yes",
                "on",
            }


class HuggingFaceImageTextService:
    """Generates image captions via hosted Hugging Face API first, with optional local BLIP fallback.

    The service uses a free hosted model by default and only loads local BLIP when
    `HF_ENABLE_LOCAL_IMAGE_TEXT=true` and a compatible CUDA/CPU environment is available.
    """

    def __init__(self, config: HuggingFaceImageTextConfig | None = None) -> None:
        self.config = config or HuggingFaceImageTextConfig()
        self._processor = None
        self._model = None
        self._tokenizer = None
        self._runtime_error = ""

    def generate(self, image_path: str | None, image_name: str = "") -> dict[str, Any]:
        if not image_path:
            return self._runtime_payload(status="image_not_provided", image_name=image_name)
        if not Path(image_path).exists():
            return self._runtime_payload(status="image_not_found", image_name=image_name)

        if self.config.hosted_enabled:
            hosted_payload = self._generate_hosted(image_path=image_path, image_name=image_name)
            if hosted_payload["status"] == "completed" or not self.config.local_enabled:
                return hosted_payload
            return self._generate_local(image_path=image_path, image_name=image_name, hosted_error=hosted_payload)

        if self.config.local_enabled:
            return self._generate_local(image_path=image_path, image_name=image_name)

        return self._runtime_payload(
            status="no_inference_path_configured",
            image_name=image_name,
            error="No hosted or local image-text inference is enabled.",
        )

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
            pixel_values = self._processor(images=image, return_tensors="pt").pixel_values.to(self._device())
            with torch.inference_mode():
                # Suppress transformers warnings during inference
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore')
                    generated_ids = self._model.generate(pixel_values, max_new_tokens=self.config.max_new_tokens)
            caption = self._tokenizer.decode(generated_ids[0], skip_special_tokens=True).strip()
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
        # Load the Vision Encoder-Decoder model locally (vit-gpt2-image-captioning).
        # This model works with torch < 2.6 when loaded with use_safetensors=True.
        # Uses ViT encoder + GPT2 decoder for image-to-text generation.
        self._processor = ViTImageProcessor.from_pretrained(self.config.model_id)
        dtype = torch.float16 if self._device() == "cuda" else torch.float32
        # Suppress transformers warnings during model loading
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            self._model = VisionEncoderDecoderModel.from_pretrained(
                self.config.model_id,
                torch_dtype=dtype,
                low_cpu_mem_usage=True,
                use_safetensors=True,
            ).to(self._device())
        self._tokenizer = AutoTokenizer.from_pretrained(self.config.model_id)
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
