from __future__ import annotations

import importlib
import importlib.util
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image


@dataclass
class PaddleOCRConfig:
    """Runtime configuration for optional PaddleOCR text extraction."""

    enabled: bool = os.getenv("PADDLE_OCR_ENABLED", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    lang: str = os.getenv("PADDLE_OCR_LANG", "en")
    use_gpu: bool = os.getenv("PADDLE_OCR_USE_GPU", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    max_side_len: int = int(os.getenv("PADDLE_OCR_MAX_SIDE_LEN", "1280"))
    det_limit_side_len: int = int(os.getenv("PADDLE_OCR_DET_LIMIT_SIDE_LEN", "960"))
    min_confidence: float = float(os.getenv("PADDLE_OCR_MIN_CONFIDENCE", "0.35"))


class PaddleOCRService:
    """Optional PaddleOCR wrapper with low-memory image resizing.

    PaddleOCR is not imported at module import time so the pipeline remains usable
    when OCR dependencies are not installed or are not available for the current
    Python/CUDA version.
    """

    def __init__(self, config: PaddleOCRConfig | None = None) -> None:
        self.config = config or PaddleOCRConfig()
        self._ocr = None
        self._runtime_error = ""

    def extract_text(self, image_path: str | None, image_name: str = "") -> dict[str, Any]:
        if not self.config.enabled:
            return self._runtime_payload(status="disabled", image_name=image_name)
        if not image_path:
            return self._runtime_payload(status="image_not_provided", image_name=image_name)
        if not Path(image_path).exists():
            return self._runtime_payload(status="image_not_found", image_name=image_name)
        if importlib.util.find_spec("paddleocr") is None or importlib.util.find_spec("paddle") is None:
            return self._runtime_payload(status="dependency_missing", image_name=image_name)

        prepared_path = self._prepare_image(image_path)
        try:
            self._lazy_load_ocr()
            raw_result = self._run_ocr(prepared_path)
            rows = self._normalize_result(raw_result)
        except (OSError, RuntimeError, TypeError, ValueError) as exc:
            self._runtime_error = str(exc)
            return self._runtime_payload(status="ocr_failed", image_name=image_name, error=str(exc))
        finally:
            if prepared_path != image_path:
                Path(prepared_path).unlink(missing_ok=True)

        filtered_rows = [row for row in rows if row["confidence"] >= self.config.min_confidence]
        return self._runtime_payload(
            status="completed",
            image_name=image_name,
            texts=[row["text"] for row in filtered_rows],
            lines=filtered_rows,
            raw_response=raw_result,
        )

    def _lazy_load_ocr(self) -> None:
        if self._ocr is not None:
            return
        paddleocr_module = importlib.import_module("paddleocr")
        paddleocr_class = getattr(paddleocr_module, "PaddleOCR")
        candidate_kwargs = [
            {
                "lang": self.config.lang,
                "use_gpu": self.config.use_gpu,
                "use_angle_cls": False,
                "show_log": False,
                "det_limit_side_len": self.config.det_limit_side_len,
            },
            {
                "lang": self.config.lang,
                "device": "gpu" if self.config.use_gpu else "cpu",
                "use_doc_orientation_classify": False,
                "use_doc_unwarping": False,
                "use_textline_orientation": False,
            },
            {"lang": self.config.lang},
        ]
        last_error = None
        for kwargs in candidate_kwargs:
            try:
                self._ocr = paddleocr_class(**kwargs)
                return
            except TypeError as exc:
                last_error = exc
        raise RuntimeError(f"Unable to initialize PaddleOCR with supported arguments: {last_error}")

    def _run_ocr(self, image_path: str) -> Any:
        if hasattr(self._ocr, "ocr"):
            return self._ocr.ocr(image_path, cls=False)
        if hasattr(self._ocr, "predict"):
            return self._ocr.predict(image_path)
        raise RuntimeError("Unsupported PaddleOCR runtime: missing ocr/predict method.")

    def _prepare_image(self, image_path: str) -> str:
        with Image.open(image_path) as image:
            width, height = image.size
            longest_side = max(width, height)
            if longest_side <= self.config.max_side_len:
                return image_path

            scale = self.config.max_side_len / longest_side
            resized = image.convert("RGB").resize(
                (max(1, int(width * scale)), max(1, int(height * scale))),
                Image.Resampling.LANCZOS,
            )
            temp_file = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
            temp_file.close()
            resized.save(temp_file.name, format="JPEG", quality=90, optimize=True)
            return temp_file.name

    def _normalize_result(self, raw_result: Any) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        self._walk_result(raw_result, rows)
        return rows

    def _walk_result(self, value: Any, rows: list[dict[str, Any]]) -> None:
        if isinstance(value, dict):
            text = value.get("text") or value.get("transcription") or value.get("rec_text")
            confidence = value.get("score") or value.get("confidence") or value.get("rec_score")
            if isinstance(text, str):
                rows.append(
                    {
                        "text": text.strip(),
                        "confidence": self._coerce_confidence(confidence),
                        "box": value.get("box") or value.get("dt_polys") or value.get("points"),
                    }
                )
                return
            for child in value.values():
                self._walk_result(child, rows)
            return

        if isinstance(value, (list, tuple)):
            if len(value) >= 2 and isinstance(value[1], (list, tuple)) and len(value[1]) >= 2:
                text_candidate, confidence_candidate = value[1][0], value[1][1]
                if isinstance(text_candidate, str):
                    rows.append(
                        {
                            "text": text_candidate.strip(),
                            "confidence": self._coerce_confidence(confidence_candidate),
                            "box": value[0],
                        }
                    )
                    return
            for child in value:
                self._walk_result(child, rows)

    def _runtime_payload(
        self,
        status: str,
        image_name: str,
        texts: list[str] | None = None,
        lines: list[dict[str, Any]] | None = None,
        error: str = "",
        raw_response: Any = None,
    ) -> dict[str, Any]:
        text_rows = texts or []
        return {
            "status": status,
            "image_name": image_name,
            "texts": text_rows,
            "joined_text": " ".join(text_rows).strip(),
            "lines": self._make_json_safe(lines or []),
            "error": error,
            "raw_response": self._make_json_safe(raw_response),
            "runtime": {
                "provider": "paddleocr",
                "enabled": self.config.enabled,
                "lang": self.config.lang,
                "use_gpu": self.config.use_gpu,
                "dependency_present": importlib.util.find_spec("paddleocr") is not None
                and importlib.util.find_spec("paddle") is not None,
                "max_side_len": self.config.max_side_len,
                "det_limit_side_len": self.config.det_limit_side_len,
                "min_confidence": self.config.min_confidence,
            },
        }

    def _make_json_safe(self, value: Any) -> Any:
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, dict):
            return {str(key): self._make_json_safe(child) for key, child in value.items()}
        if isinstance(value, (list, tuple)):
            return [self._make_json_safe(child) for child in value]
        if hasattr(value, "tolist"):
            return self._make_json_safe(value.tolist())
        return str(value)

    def _coerce_confidence(self, value: Any) -> float:
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            return 0.0
        if confidence > 1:
            confidence /= 100
        return max(0.0, min(1.0, confidence))
