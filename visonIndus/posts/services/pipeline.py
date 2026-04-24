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

        return {
            "extraction": extraction,
            "pricing": pricing,
            "status": "completed" if extraction else "failed",
        }
