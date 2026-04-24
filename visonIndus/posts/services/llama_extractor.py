from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from PIL import Image
    PIL_AVAILABLE = True
except Exception:  # pragma: no cover - optional runtime dependency
    Image = None  # type: ignore[assignment]
    PIL_AVAILABLE = False

try:
    import torch
    from transformers import AutoProcessor, MllamaForConditionalGeneration

    TRANSFORMERS_AVAILABLE = True
except Exception:  # pragma: no cover - optional runtime dependency
    torch = None  # type: ignore[assignment]
    AutoProcessor = None  # type: ignore[assignment]
    MllamaForConditionalGeneration = None  # type: ignore[assignment]
    TRANSFORMERS_AVAILABLE = False


@dataclass
class ExtractorRuntimeConfig:
    model_id: str = os.getenv("VISION_MODEL_ID", "unsloth/Llama-3.2-11B-Vision-Instruct-bnb-4bit")
    adapter_path: str | None = os.getenv("VISION_ADAPTER_PATH")
    backup_model_id: str | None = os.getenv("VISION_BACKUP_MODEL_ID")
    enable_backup_model: bool = os.getenv("VISION_ENABLE_BACKUP_MODEL", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    max_new_tokens: int = int(os.getenv("VISION_MAX_NEW_TOKENS", "256"))
    device: str = os.getenv("VISION_DEVICE", "cuda")


class LlamaExtractorService:
    """Image -> structured JSON extraction using Llama 3.2 Vision.

    The service prefers loading a local fine-tuned adapter/base model when provided,
    and gracefully falls back to a deterministic lightweight extractor if model
    dependencies are unavailable.
    """

    def __init__(self, model_name: str = "llama3.2-vision", config: ExtractorRuntimeConfig | None = None) -> None:
        self.model_name = model_name
        self.config = config or ExtractorRuntimeConfig()
        self._model = None
        self._processor = None
        self._backup_model = None
        self._backup_processor = None
        self._runtime_status = "not_loaded"
        self._runtime_error = ""

    def extract_structured_data(self, image_name: str, image_path: str | None = None) -> dict[str, Any]:
        primary_runtime_result = self._extract_with_runtime_model(
            image_name=image_name,
            image_path=image_path,
            source_type="primary",
        )
        if primary_runtime_result is not None:
            return primary_runtime_result

        fallback_result = self._fallback_extraction(image_name=image_name, image_path=image_path)
        backup_runtime_result = self._extract_with_backup_runtime_model(image_name=image_name, image_path=image_path)
        if backup_runtime_result is None:
            return fallback_result

        return self._select_best_payload(fallback_result, backup_runtime_result)

    def _extract_with_runtime_model(
        self,
        image_name: str,
        image_path: str | None,
        source_type: str,
    ) -> dict[str, Any] | None:
        if not image_path:
            self._runtime_status = "image_not_provided"
            return None
        if not TRANSFORMERS_AVAILABLE:
            self._runtime_status = "missing_transformers_dependency"
            return None
        if not PIL_AVAILABLE:
            self._runtime_status = "missing_pillow_dependency"
            return None

        try:
            self._lazy_load_runtime(source_type=source_type)
        except Exception as exc:  # noqa: BLE001
            self._runtime_status = "model_load_failed"
            self._runtime_error = str(exc)
            return None

        model, processor = self._runtime_components(source_type=source_type)
        if not model or not processor:
            self._runtime_status = "model_unavailable"
            return None

        try:
            image = Image.open(image_path).convert("RGB")
            prompt = (
                "Identify the industrial/electronic component in this image and return JSON only with keys: "
                "product{name,model_number,manufacturer}, technical_datasheet{voltage,power,dimensions,raw_text}, "
                "confidence."
            )
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": prompt},
                    ],
                }
            ]
            chat_text = processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = processor(
                text=chat_text,
                images=image,
                return_tensors="pt",
            )

            if self.config.device == "cuda" and torch is not None and torch.cuda.is_available():
                inputs = {key: value.to("cuda") for key, value in inputs.items()}

            generated = model.generate(**inputs, max_new_tokens=self.config.max_new_tokens)
            generated_tokens = generated[0]
            input_length = inputs["input_ids"].shape[-1] if "input_ids" in inputs else 0
            completion_tokens = generated_tokens[input_length:] if input_length else generated_tokens
            decoded = processor.decode(completion_tokens, skip_special_tokens=True)
            payload = self._parse_json_from_text(decoded)
            if payload:
                model_source = self._model_source_for_type(source_type)
                payload.setdefault("model", model_source)
                payload.setdefault("image_name", image_name)
                payload.setdefault("status", "completed")
                payload["runtime"] = self._build_runtime_payload(
                    mode=f"{source_type}_runtime_model",
                    model_source=model_source,
                )
                return payload
        except Exception as exc:  # noqa: BLE001
            self._runtime_status = "inference_failed"
            self._runtime_error = str(exc)
            return None
        return None

    def _extract_with_backup_runtime_model(self, image_name: str, image_path: str | None) -> dict[str, Any] | None:
        if not self.config.enable_backup_model or not self.config.backup_model_id:
            return None
        return self._extract_with_runtime_model(image_name=image_name, image_path=image_path, source_type="backup")

    def _lazy_load_runtime(self, source_type: str) -> None:
        if source_type == "backup":
            if self._backup_model is not None and self._backup_processor is not None:
                return
            model_source = self._model_source_for_type(source_type)
            self._backup_processor = AutoProcessor.from_pretrained(model_source)
            self._backup_model = MllamaForConditionalGeneration.from_pretrained(
                model_source,
                torch_dtype=torch.float16 if torch is not None else None,
                device_map="auto",
            )
            self._runtime_status = "backup_loaded"
            self._runtime_error = ""
            return

        if self._model is not None and self._processor is not None:
            return
        model_source = self._model_source_for_type(source_type)
        self._processor = AutoProcessor.from_pretrained(model_source)
        self._model = MllamaForConditionalGeneration.from_pretrained(
            model_source,
            torch_dtype=torch.float16 if torch is not None else None,
            device_map="auto",
        )
        self._runtime_status = "loaded"
        self._runtime_error = ""

    def _runtime_components(self, source_type: str):
        if source_type == "backup":
            return self._backup_model, self._backup_processor
        return self._model, self._processor

    def _model_source_for_type(self, source_type: str) -> str:
        if source_type == "backup":
            return self.config.backup_model_id or self.config.model_id
        return self.config.adapter_path or self.config.model_id

    def _fallback_extraction(self, image_name: str, image_path: str | None) -> dict[str, Any]:
        inferred_name = self._guess_component_name(image_name=image_name, image_path=image_path)
        return {
            "model": self.model_name,
            "image_name": image_name,
            "product": {
                "name": inferred_name,
                "model_number": self._guess_model_number(image_name),
                "manufacturer": "Unknown",
            },
            "technical_datasheet": {
                "voltage": "Unknown",
                "power": "Unknown",
                "dimensions": "Unknown",
                "raw_text": f"Fallback extraction from filename: {Path(image_name).name}",
            },
            "confidence": 0.35,
            "status": "fallback",
            "runtime": self._build_runtime_payload(
                mode="fallback",
                model_source=self._model_source_for_type("primary"),
            ),
        }

    def _build_runtime_payload(self, mode: str, model_source: str) -> dict[str, Any]:
        device_used = (
            "cuda"
            if self.config.device == "cuda" and torch is not None and torch.cuda.is_available()
            else "cpu"
        )
        return {
            "mode": mode,
            "transformers_available": TRANSFORMERS_AVAILABLE,
            "pillow_available": PIL_AVAILABLE,
            "runtime_status": self._runtime_status,
            "runtime_error": self._runtime_error,
            "model_source": model_source,
            "requested_device": self.config.device,
            "used_device": device_used,
            "backup_enabled": self.config.enable_backup_model,
            "backup_model_source": self.config.backup_model_id,
        }

    def _select_best_payload(self, primary_payload: dict[str, Any], backup_payload: dict[str, Any]) -> dict[str, Any]:
        primary_score = self._payload_quality_score(primary_payload)
        backup_score = self._payload_quality_score(backup_payload)
        if backup_score >= primary_score:
            backup_payload["selection"] = {
                "chosen": "backup",
                "backup_score": backup_score,
                "primary_score": primary_score,
            }
            return backup_payload
        primary_payload["selection"] = {
            "chosen": "primary",
            "backup_score": backup_score,
            "primary_score": primary_score,
        }
        return primary_payload

    def _payload_quality_score(self, payload: dict[str, Any]) -> float:
        confidence = self._normalized_confidence(payload.get("confidence", 0))
        completeness = self._schema_completeness(payload)
        return confidence * 0.7 + completeness * 0.3

    def _normalized_confidence(self, confidence: Any) -> float:
        try:
            value = float(confidence)
        except (TypeError, ValueError):
            return 0.0
        if value <= 1:
            value *= 100
        return max(0.0, min(100.0, value))

    def _schema_completeness(self, payload: dict[str, Any]) -> float:
        product = payload.get("product", {}) if isinstance(payload.get("product"), dict) else {}
        technical = (
            payload.get("technical_datasheet", {})
            if isinstance(payload.get("technical_datasheet"), dict)
            else {}
        )
        fields = [
            product.get("name"),
            product.get("model_number"),
            product.get("manufacturer"),
            technical.get("voltage"),
            technical.get("power"),
            technical.get("dimensions"),
            technical.get("raw_text"),
        ]
        populated = sum(1 for value in fields if value and str(value).strip() and str(value).strip().lower() != "unknown")
        return (populated / len(fields)) * 100

    def _guess_component_name(self, image_name: str, image_path: str | None) -> str:
        corpus = " ".join(part for part in [image_name, image_path or ""] if part).lower()
        if "solenoid" in corpus:
            return "Solenoid"
        if "resistor" in corpus:
            return "Resistor"
        if "capacitor" in corpus:
            return "Capacitor"
        if "relay" in corpus:
            return "Relay"
        return "Industrial Component"

    def _guess_model_number(self, image_name: str) -> str:
        match = re.search(r"([A-Za-z]{1,4}-?\d{2,6}[A-Za-z0-9-]*)", image_name)
        return match.group(1) if match else "Unknown"

    def _parse_json_from_text(self, text: str) -> dict[str, Any] | None:
        direct = text.strip()
        for candidate in [direct, *re.findall(r"\{[\s\S]*\}", text)]:
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue
        return None
