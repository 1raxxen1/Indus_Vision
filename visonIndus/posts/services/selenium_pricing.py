from typing import Any


class SeleniumPricingService:
    """Skeleton service for Selenium based price extraction."""

    def lookup_prices(self, extracted_payload: dict[str, Any]) -> dict[str, Any]:
        """
        Placeholder for real Selenium workflow.

        Replace this method with:
        1) vendor selection based on product/model_number
        2) Selenium WebDriver navigation and waits
        3) page parsing + normalized price output
        """
        product = extracted_payload.get("product", {})
        model_number = product.get("model_number", "TODO")

        return {
            "query": {
                "product_name": product.get("name", "TODO"),
                "model_number": model_number,
            },
            "prices": [
                {
                    "source": "TODO vendor",
                    "currency": "USD",
                    "price": None,
                    "availability": "TODO",
                    "url": "https://example.com/todo",
                }
            ],
            "status": "skeleton",
        }
