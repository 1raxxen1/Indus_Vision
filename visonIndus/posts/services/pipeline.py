from typing import Any

from .llama_extractor import LlamaExtractorService
from .selenium_pricing import SeleniumPricingService


class ImageToPricePipeline:
    """Orchestrates image extraction (Llama) and pricing (Selenium)."""

    def __init__(
        self,
        extractor: LlamaExtractorService | None = None,
        pricing: SeleniumPricingService | None = None,
    ) -> None:
        self.extractor = extractor or LlamaExtractorService()
        self.pricing = pricing or SeleniumPricingService()

    def run(self, image_name: str, image_path: str | None = None) -> dict[str, Any]:
        extraction = self.extractor.extract_structured_data(image_name=image_name, image_path=image_path)
        pricing = self.pricing.lookup_prices(extracted_payload=extraction)
        runtime = extraction.get("runtime", {})

        return {
            "extraction": extraction,
            "pricing": pricing,
            "runtime_flags": {
                "ai_mode": runtime.get("mode", "unknown"),
                "ai_runtime_status": runtime.get("runtime_status", "unknown"),
                "ai_runtime_error": runtime.get("runtime_error", ""),
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
