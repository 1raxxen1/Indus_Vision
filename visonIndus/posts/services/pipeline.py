from __future__ import annotations

import re
from typing import Any

from .huggingface_detection import HuggingFaceDetectionService
from .huggingface_image_text import HuggingFaceImageTextService
from .huggingface_vision_labels import HuggingFaceVisionLabelsService
from .huggingface_ocr import HuggingFaceOCRService
from .llama_extractor import LlamaExtractorService
from .paddle_ocr import PaddleOCRService
from .selenium_pricing import SeleniumPricingService


class ImageToPricePipeline:
    """Orchestrates image extraction, Hugging Face vision signals, OCR, and pricing."""

    UNKNOWN_VALUES = {"", "unknown", "todo", "n/a", "none", "null"}
    GENERIC_PRODUCT_NAMES = {"", "industrial component", "detected component", "unknown", "uploaded component"}
    SPEC_PATTERNS: dict[str, re.Pattern] = {
        "horsepower": re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:hp|h\.p\.|horse\s*power)\b", re.IGNORECASE),
        "power_kw": re.compile(r"\b(\d+(?:\.\d+)?)\s*kW\b", re.IGNORECASE),
        "voltage": re.compile(r"\b(\d{2,4}(?:\.\d+)?)\s*V(?:AC|DC)?\b", re.IGNORECASE),
        "rpm": re.compile(r"\b(\d{3,5})\s*(?:RPM|R/MIN|R\.P\.M\.)\b", re.IGNORECASE),
        "frequency": re.compile(r"\b(50|60)\s*Hz\b", re.IGNORECASE),
        "current": re.compile(r"\b(\d+(?:\.\d+)?)\s*A\b", re.IGNORECASE),
        "phase": re.compile(r"\b(1|3|single|three)\s*(?:phase|ph|φ)\b", re.IGNORECASE),
        "ip_rating": re.compile(r"\bIP\s*\d{2}\b", re.IGNORECASE),
        "insulation_class": re.compile(r"\b(?:INS\.?\s*)?(?:CLASS\s*)?([A-H])\s*(?:CLASS)?\b", re.IGNORECASE),
        "frame_size": re.compile(r"\b(?:FRAME|FR)\s*[:\-]?\s*([A-Z0-9\-]+)\b", re.IGNORECASE),
    }

    def __init__(
        self,
        extractor: LlamaExtractorService | None = None,
        pricing: SeleniumPricingService | None = None,
        hf_detector: HuggingFaceDetectionService | None = None,
        hf_image_text: HuggingFaceImageTextService | None = None,
        hf_vision_labels: HuggingFaceVisionLabelsService | None = None,
        hf_ocr: HuggingFaceOCRService | None = None,
        ocr: PaddleOCRService | None = None,
    ) -> None:
        self.extractor = extractor or LlamaExtractorService()
        self.pricing = pricing or SeleniumPricingService()
        self.hf_detector = hf_detector or HuggingFaceDetectionService()
        self.hf_image_text = hf_image_text or HuggingFaceImageTextService()
        self.hf_vision_labels = hf_vision_labels or HuggingFaceVisionLabelsService()
        self.hf_ocr = hf_ocr or HuggingFaceOCRService()
        self.ocr = ocr or PaddleOCRService()

    def run(
        self,
        image_name: str,
        image_path: str | None = None,
        include_pricing: bool = True,
    ) -> dict[str, Any]:
        extraction = self.extractor.extract_structured_data(image_name=image_name, image_path=image_path)
        huggingface_detection = self.hf_detector.detect(image_path=image_path, image_name=image_name)
        huggingface_image_text = self.hf_image_text.generate(image_path=image_path, image_name=image_name)
        huggingface_vision_labels = self.hf_vision_labels.classify(image_path=image_path, image_name=image_name)
        huggingface_ocr = self.hf_ocr.extract_text(image_path=image_path, image_name=image_name)
        paddle_ocr = self.ocr.extract_text(image_path=image_path, image_name=image_name)
        # Use PaddleOCR if available and successful, otherwise fallback to HF OCR
        ocr_result = paddle_ocr if paddle_ocr and paddle_ocr.get("status") == "completed" else huggingface_ocr
        self._merge_vision_signals(
            extraction=extraction,
            detection=huggingface_detection,
            image_text=huggingface_image_text,
            vision_labels=huggingface_vision_labels,
            ocr=ocr_result,
        )
        pricing = self.pricing.lookup_prices(extracted_payload=extraction) if include_pricing else self._pricing_skipped()
        runtime = extraction.get("runtime", {})

        return {
            "extraction": extraction,
            "huggingface_detection": huggingface_detection,
            "huggingface_image_text": huggingface_image_text,
            "huggingface_vision_labels": huggingface_vision_labels,
            "huggingface_ocr": huggingface_ocr,
            "paddle_ocr": paddle_ocr,
            "pricing": pricing,
            "runtime_flags": {
                "ai_mode": runtime.get("mode", "unknown"),
                "ai_runtime_status": runtime.get("runtime_status", "unknown"),
                "ai_runtime_error": runtime.get("runtime_error", ""),
                "huggingface_detection_status": huggingface_detection.get("status", "unknown"),
                "huggingface_detection_model": huggingface_detection.get("model", "unknown"),
                "huggingface_top_detection": huggingface_detection.get("top_detection"),
                "huggingface_image_text_status": huggingface_image_text.get("status", "unknown"),
                "huggingface_image_text_model": huggingface_image_text.get("model", "unknown"),
                "huggingface_caption": huggingface_image_text.get("caption", ""),
                "huggingface_vision_labels_status": huggingface_vision_labels.get("status", "unknown"),
                "huggingface_vision_labels_model": huggingface_vision_labels.get("model", "unknown"),
                "huggingface_top_labels": [label.get("label") for label in huggingface_vision_labels.get("top_labels", [])],
                "huggingface_ocr_status": huggingface_ocr.get("status", "unknown"),
                "huggingface_ocr_model": huggingface_ocr.get("model", "unknown"),
                "huggingface_ocr_text_count": len(huggingface_ocr.get("texts", [])),
                "paddle_ocr_status": paddle_ocr.get("status", "unknown") if paddle_ocr else "not_used",
                "paddle_ocr_text_count": len(paddle_ocr.get("texts", [])) if paddle_ocr else 0,
                "dependencies": {
                    "transformers_available": runtime.get("transformers_available", False),
                    "pillow_available": runtime.get("pillow_available", False),
                },
                "device": {
                    "requested": runtime.get("requested_device", "unknown"),
                    "used": runtime.get("used_device", "unknown"),
                },
                "pricing_status": pricing.get("status", "unknown"),
            },
            "status": "completed" if extraction else "failed",
        }

    def compile_outputs(self, processed_results: list[dict[str, Any]]) -> dict[str, Any]:
        """Compile multiple per-image outputs into one product/spec/pricing payload."""
        source_outputs = [row.get("output", {}) for row in processed_results if row.get("output")]
        extractions = [output.get("extraction", {}) for output in source_outputs if output.get("extraction")]
        compiled_extraction = self._compile_extractions(extractions=extractions, processed_results=processed_results)
        pricing = self.pricing.lookup_prices(extracted_payload=compiled_extraction)
        runtime_flags = self._compiled_runtime_flags(compiled_extraction=compiled_extraction, pricing=pricing)
        return {
            "extraction": compiled_extraction,
            "pricing": pricing,
            "runtime_flags": runtime_flags,
            "source_image_count": len(processed_results),
            "source_result_ids": [row.get("result", {}).get("id") for row in processed_results if row.get("result")],
            "status": "completed" if compiled_extraction else "failed",
        }

    def _merge_vision_signals(
        self,
        extraction: dict[str, Any],
        detection: dict[str, Any],
        image_text: dict[str, Any],
        vision_labels: dict[str, Any],
        ocr: dict[str, Any],
    ) -> None:
        extraction["huggingface_detection"] = detection
        extraction["huggingface_image_text"] = image_text
        extraction["huggingface_vision_labels"] = vision_labels
        extraction["paddle_ocr"] = ocr

        ocr_texts = [str(text).strip() for text in ocr.get("texts", []) if str(text).strip()]
        if ocr_texts:
            extraction["ocr_texts"] = ocr_texts
            technical = extraction.setdefault("technical_datasheet", {})
            raw_text = str(technical.get("raw_text") or "").strip()
            technical["raw_text"] = f"{raw_text}\nPaddleOCR: {' '.join(ocr_texts)}".strip()

        caption = str(image_text.get("caption") or "").strip()
        if caption and not self._is_irrelevant_caption(caption):
            technical = extraction.setdefault("technical_datasheet", {})
            raw_text = str(technical.get("raw_text") or "").strip()
            technical["raw_text"] = f"{raw_text}\nHF image caption: {caption}".strip()

        if vision_labels.get("labels"):
            technical = extraction.setdefault("technical_datasheet", {})
            raw_text = str(technical.get("raw_text") or "").strip()
            labels_text = ", ".join(str(label).strip() for label in vision_labels.get("labels", []) if str(label).strip())
            if labels_text:
                technical["raw_text"] = f"{raw_text}\nHF vision labels: {labels_text}".strip()

        self._merge_motor_specs(extraction)
        top_detection = detection.get("top_detection") or {}
        product = extraction.setdefault("product", {})
        current_name = str(product.get("name") or "").strip().lower()

        # Prefer detection if available, otherwise use vision labels
        if detection.get("status") == "completed" and top_detection and current_name in self.GENERIC_PRODUCT_NAMES:
            product["name"] = str(top_detection.get("label") or "Detected component").title()
            extraction["confidence"] = top_detection.get("score") or extraction.get("confidence", 0)
        elif vision_labels.get("status") == "completed" and vision_labels.get("top_labels") and current_name in self.GENERIC_PRODUCT_NAMES:
            # Use top vision label as fallback, but filter out obviously irrelevant ones
            top_label = vision_labels["top_labels"][0]["label"] if vision_labels["top_labels"] else None
            if top_label and not self._is_irrelevant_label(top_label):
                product["name"] = top_label.title()
                extraction["confidence"] = vision_labels["top_labels"][0]["score"] if vision_labels["top_labels"] else 0

    def _compile_extractions(
        self,
        extractions: list[dict[str, Any]],
        processed_results: list[dict[str, Any]],
    ) -> dict[str, Any]:
        product_payloads = [payload.get("product", {}) for payload in extractions if isinstance(payload.get("product"), dict)]
        technical_payloads = [
            payload.get("technical_datasheet", {})
            for payload in extractions
            if isinstance(payload.get("technical_datasheet"), dict)
        ]
        ocr_texts = self._unique_texts(
            text
            for payload in extractions
            for text in payload.get("ocr_texts", [])
        )
        captions = self._unique_texts(
            payload.get("huggingface_image_text", {}).get("caption")
            for payload in extractions
        )
        detection_labels = self._unique_texts(
            detection.get("label")
            for payload in extractions
            for detection in payload.get("huggingface_detection", {}).get("detections", [])
        )
        vision_labels = self._unique_texts(
            payload.get("huggingface_vision_labels", {}).get("labels")
            for payload in extractions
        )
        raw_text_parts = self._unique_texts(
            [*(technical.get("raw_text") for technical in technical_payloads), *ocr_texts, *captions, *vision_labels]
        )
        raw_text = "\n".join(raw_text_parts)
        compiled = {
            "model": "multi-image-compiled-vision-pipeline",
            "image_name": "multi_image_compilation",
            "source_images": [
                {
                    "input": row.get("input", {}),
                    "upload": row.get("upload", {}),
                    "result": row.get("result", {}),
                }
                for row in processed_results
            ],
            "product": {
                "name": self._first_specific_product_name(product_payloads, detection_labels, vision_labels, captions),
                "model_number": self._first_populated(product.get("model_number") for product in product_payloads),
                "manufacturer": self._first_populated(product.get("manufacturer") for product in product_payloads),
            },
            "technical_datasheet": {
                "voltage": self._first_populated(technical.get("voltage") for technical in technical_payloads),
                "power": self._first_populated(technical.get("power") for technical in technical_payloads),
                "dimensions": self._first_populated(technical.get("dimensions") for technical in technical_payloads),
                "raw_text": raw_text,
            },
            "ocr_texts": ocr_texts,
            "captions": captions,
            "vision_labels": vision_labels,
            "detection_labels": detection_labels,
            "confidence": max([self._normalized_confidence(payload.get("confidence", 0)) for payload in extractions] or [0]),
            "status": "compiled",
            "runtime": {
                "mode": "multi_image_compiled",
                "runtime_status": "compiled",
                "source_image_count": len(processed_results),
            },
        }
        self._merge_motor_specs(compiled)
        return compiled

    def _merge_motor_specs(self, extraction: dict[str, Any]) -> None:
        technical = extraction.setdefault("technical_datasheet", {})
        text = " ".join(
            str(value)
            for value in [
                technical.get("raw_text", ""),
                *extraction.get("ocr_texts", []),
                *extraction.get("captions", []),
            ]
            if value
        )
        specs = self._extract_specs_from_text(text)
        if specs:
            extraction["motor_specs"] = {**extraction.get("motor_specs", {}), **specs}
            technical.setdefault("voltage", specs.get("voltage", technical.get("voltage", "Unknown")))
            technical.setdefault("power", specs.get("horsepower") or specs.get("power_kw") or technical.get("power", "Unknown"))

    def _extract_specs_from_text(self, text: str) -> dict[str, str]:
        specs: dict[str, str] = {}
        for key, pattern in self.SPEC_PATTERNS.items():
            match = pattern.search(text or "")
            if not match:
                continue
            if key == "ip_rating":
                specs[key] = match.group(0).replace(" ", "").upper()
            elif key == "phase":
                specs[key] = self._normalize_phase(match.group(1))
            elif key == "insulation_class":
                specs[key] = f"Class {match.group(1).upper()}"
            else:
                unit = {
                    "horsepower": "HP",
                    "power_kw": "kW",
                    "voltage": "V",
                    "rpm": "RPM",
                    "frequency": "Hz",
                    "current": "A",
                }.get(key, "")
                specs[key] = f"{match.group(1)} {unit}".strip()
        return specs

    def _compiled_runtime_flags(self, compiled_extraction: dict[str, Any], pricing: dict[str, Any]) -> dict[str, Any]:
        runtime = compiled_extraction.get("runtime", {})
        return {
            "ai_mode": runtime.get("mode", "multi_image_compiled"),
            "ai_runtime_status": runtime.get("runtime_status", "compiled"),
            "source_image_count": runtime.get("source_image_count", 0),
            "paddle_ocr_text_count": len(compiled_extraction.get("ocr_texts", [])),
            "huggingface_caption_count": len(compiled_extraction.get("captions", [])),
            "pricing_status": pricing.get("status", "unknown"),
        }

    def _pricing_skipped(self) -> dict[str, Any]:
        return {
            "query": {"product_name": "", "model_number": "", "query_text": ""},
            "prices": [],
            "summary": {"lowest_price": None, "highest_price": None, "sources_checked": 0},
            "status": "skipped_for_multi_image_compilation",
        }

    def _first_populated(self, values) -> str:
        for value in values:
            if value is None:
                continue
            normalized = str(value).strip()
            if normalized.lower() not in self.UNKNOWN_VALUES:
                return normalized
        return "Unknown"

    def _first_specific_product_name(
        self,
        product_payloads: list[dict[str, Any]],
        detection_labels: list[str],
        vision_labels: list[str],
        captions: list[str],
    ) -> str:
        for product in product_payloads:
            name = str(product.get("name") or "").strip()
            if name.lower() not in self.GENERIC_PRODUCT_NAMES:
                return name
        for label in detection_labels:
            if label.lower() not in self.GENERIC_PRODUCT_NAMES:
                return label.title()
        for label in vision_labels:
            if label.lower() not in self.GENERIC_PRODUCT_NAMES and not self._is_irrelevant_label(label):
                return label.title()
        for caption in captions:
            if "motor" in caption.lower():
                return "Electric Motor"
        return "Industrial Component"

    def _unique_texts(self, values) -> list[str]:
        seen = set()
        rows: list[str] = []
        for value in values:
            if value is None:
                continue
            text = str(value).strip()
            if not text or text.lower() in seen:
                continue
            seen.add(text.lower())
            rows.append(text)
        return rows

    def _normalized_confidence(self, confidence: Any) -> float:
        try:
            value = float(confidence)
        except (TypeError, ValueError):
            return 0.0
        if value <= 1:
            value *= 100
        return max(0.0, min(100.0, value))

    def _is_irrelevant_label(self, label: str) -> bool:
        """Check if a vision label is likely irrelevant for industrial component detection."""
        irrelevant_keywords = {
            "revolver", "six-gun", "six-shooter", "hatchet", "oboe", "hautboy", "hautbois",
            "bassoon", "whistle", "flag", "stripe", "musical instrument", "weapon", "gun"
        }
        label_lower = label.lower()
        return any(keyword in label_lower for keyword in irrelevant_keywords)

    def _is_irrelevant_caption(self, caption: str) -> bool:
        """Check if a caption is likely hallucinated and irrelevant for industrial components."""
        irrelevant_keywords = {
            "flag", "stripe", "musical", "instrument", "weapon", "gun", "hatchet", "revolver"
        }
        caption_lower = caption.lower()
        return any(keyword in caption_lower for keyword in irrelevant_keywords)
