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

    def run(self, image_name: str) -> dict[str, Any]:
        extraction = self.extractor.extract_structured_data(image_name=image_name)
        pricing = self.pricing.lookup_prices(extracted_payload=extraction)

        return {
            "extraction": extraction,
            "pricing": pricing,
            "status": "skeleton",
        }
