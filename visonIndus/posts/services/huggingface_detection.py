from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


@dataclass
class HuggingFaceDetectionConfig:
    """Runtime configuration for Hugging Face hosted image detection."""

    model_id: str = os.getenv("HF_IMAGE_DETECTION_MODEL", "facebook/detr-resnet-50")
    api_token: str | None = os.getenv("HF_API_TOKEN") or os.getenv("HUGGINGFACE_API_TOKEN")
    api_url: str | None = os.getenv("HF_IMAGE_DETECTION_URL")
    timeout_seconds: int = int(os.getenv("HF_IMAGE_DETECTION_TIMEOUT", "30"))
    enabled: bool = os.getenv("HF_ENABLE_IMAGE_DETECTION", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


class HuggingFaceDetectionService:
    """Calls the Hugging Face Inference API for image object detection.

    The service is intentionally isolated from the local Llama extractor so an
    application can use a hosted detector as an additional signal without
    requiring local GPU model downloads.
    """

    def __init__(self, config: HuggingFaceDetectionConfig | None = None) -> None:
        self.config = config or HuggingFaceDetectionConfig()

    def detect(self, image_path: str | None, image_name: str = "") -> dict[str, Any]:
        if not self.config.enabled:
            return self._runtime_payload(status="disabled", image_name=image_name)
        if not image_path:
            return self._runtime_payload(status="image_not_provided", image_name=image_name)
        if not Path(image_path).exists():
            return self._runtime_payload(status="image_not_found", image_name=image_name)
        if not self.config.api_token and not self.config.api_url:
            return self._runtime_payload(status="api_token_not_configured", image_name=image_name)

        try:
            response_payload = self._call_inference_api(image_path=image_path)
        except HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            return self._runtime_payload(
                status="api_error",
                image_name=image_name,
                error=f"HTTP {exc.code}: {error_body}",
            )
        except (OSError, URLError, TimeoutError) as exc:
            return self._runtime_payload(status="request_failed", image_name=image_name, error=str(exc))
        except json.JSONDecodeError as exc:
            return self._runtime_payload(status="invalid_json_response", image_name=image_name, error=str(exc))

        detections = self._normalize_detections(response_payload)
        return self._runtime_payload(
            status="completed",
            image_name=image_name,
            detections=detections,
            raw_response=response_payload,
        )

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

    def _endpoint_url(self) -> str:
        if self.config.api_url:
            return self.config.api_url
        return f"https://api-inference.huggingface.co/models/{quote(self.config.model_id, safe='/')}"

    def _normalize_detections(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, dict) and isinstance(payload.get("detections"), list):
            rows = payload["detections"]
        elif isinstance(payload, list):
            rows = payload
        else:
            rows = []

        detections = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            label = row.get("label") or row.get("class") or row.get("entity")
            score = self._coerce_score(row.get("score"))
            detections.append(
                {
                    "label": label or "unknown",
                    "score": score,
                    "confidence": round(score * 100, 2),
                    "box": row.get("box") or row.get("bbox"),
                }
            )
        return sorted(detections, key=lambda item: item["score"], reverse=True)

    def _runtime_payload(
        self,
        status: str,
        image_name: str,
        error: str = "",
        detections: list[dict[str, Any]] | None = None,
        raw_response: Any = None,
    ) -> dict[str, Any]:
        detection_rows = detections or []
        return {
            "status": status,
            "model": self.config.model_id,
            "endpoint": self._endpoint_url(),
            "image_name": image_name,
            "detections": detection_rows,
            "top_detection": detection_rows[0] if detection_rows else None,
            "error": error,
            "raw_response": raw_response,
            "runtime": {
                "provider": "huggingface",
                "enabled": self.config.enabled,
                "token_configured": bool(self.config.api_token),
                "timeout_seconds": self.config.timeout_seconds,
            },
        }

    def _coerce_score(self, value: Any) -> float:
        try:
            score = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, score))
