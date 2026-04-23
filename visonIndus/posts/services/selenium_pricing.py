from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import quote_plus

from typing import Any

try:
    from selenium import webdriver
    from selenium.common.exceptions import TimeoutException, WebDriverException
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import WebDriverWait
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
except ImportError:  # pragma: no cover - executed only when selenium extras are unavailable
    webdriver = None  # type: ignore[assignment]
    TimeoutException = Exception  # type: ignore[assignment]
    WebDriverException = Exception  # type: ignore[assignment]
    Options = None  # type: ignore[assignment]
    Service = None  # type: ignore[assignment]
    By = None  # type: ignore[assignment]
    EC = None  # type: ignore[assignment]
    WebDriverWait = None  # type: ignore[assignment]
    ChromeDriverManager = None  # type: ignore[assignment]
    SELENIUM_AVAILABLE = False


@dataclass(frozen=True)
class PricingSource:
    name: str
    search_url_template: str
    selectors: tuple[str, ...]


class SeleniumPricingService:
    """Selenium service for pricing extraction from common Indian vendors."""

    SOURCES: tuple[PricingSource, ...] = (
        PricingSource(
            name="Amazon India",
            search_url_template="https://www.amazon.in/s?k={query}",
            selectors=("span.a-price-whole", "span.a-offscreen"),
        ),
        PricingSource(
            name="IndiaMART",
            search_url_template="https://dir.indiamart.com/search.mp?ss={query}",
            selectors=(".price", ".price-unit", "[class*='price']"),
        ),
        PricingSource(
            name="Robu.in",
            search_url_template="https://robu.in/?s={query}&post_type=product",
            selectors=(".price", ".woocommerce-Price-amount"),
        ),
        PricingSource(
            name="Moglix",
            search_url_template="https://www.moglix.com/search/{query}",
            selectors=(".price", "[class*='price']"),
        ),
    )
    PRICE_PATTERN = re.compile(r"(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)

    def __init__(self, timeout_seconds: int = 12) -> None:
        self.timeout_seconds = timeout_seconds

    def lookup_prices(self, extracted_payload: dict[str, Any]) -> dict[str, Any]:
        product = extracted_payload.get("product", {})
        query = self._build_query(product)

        if not SELENIUM_AVAILABLE:
            return self._driver_failure_response(
                product=product,
                query=query,
                error=RuntimeError("selenium/webdriver-manager not installed"),
            )

        try:
            driver = self._build_driver()
        except Exception as exc:  # noqa: BLE001 - fallback to structured response
            return self._driver_failure_response(product=product, query=query, error=exc)

        prices: list[dict[str, Any]] = []
        try:
            for source in self.SOURCES:
                prices.append(self._lookup_single_source(driver=driver, source=source, query=query))
        finally:
            driver.quit()

        numeric_prices = [item["price"] for item in prices if isinstance(item.get("price"), (int, float))]
        return {
            "query": {
                "product_name": product.get("name", "Unknown product"),
                "model_number": product.get("model_number", ""),
                "query_text": query,
            },
            "prices": prices,
            "summary": {
                "lowest_price": min(numeric_prices) if numeric_prices else None,
                "highest_price": max(numeric_prices) if numeric_prices else None,
                "sources_checked": len(self.SOURCES),
            },
            "status": "completed" if numeric_prices else "no_prices_found",
        }

    def _lookup_single_source(self, driver: webdriver.Chrome, source: PricingSource, query: str) -> dict[str, Any]:
        search_url = source.search_url_template.format(query=quote_plus(query))
        try:
            driver.get(search_url)
            WebDriverWait(driver, self.timeout_seconds).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            return self._empty_source_row(source=source, search_url=search_url, availability="timeout")
        except WebDriverException:
            return self._empty_source_row(source=source, search_url=search_url, availability="driver_error")

        text_candidates = self._collect_text_candidates(driver=driver, selectors=source.selectors)
        text_candidates.append(driver.page_source)
        price = self._extract_first_price(text_candidates)

        return {
            "source": source.name,
            "currency": "INR",
            "price": price,
            "availability": "found" if price is not None else "not_found",
            "url": search_url,
        }

    def _collect_text_candidates(self, driver: webdriver.Chrome, selectors: tuple[str, ...]) -> list[str]:
        collected: list[str] = []
        for selector in selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                collected.extend(element.text for element in elements if element.text)
            except WebDriverException:
                continue
        return collected

    def _extract_first_price(self, texts: list[str]) -> float | None:
        for text in texts:
            match = self.PRICE_PATTERN.search(text)
            if match:
                normalized = match.group(1).replace(",", "")
                try:
                    return float(normalized)
                except ValueError:
                    continue
        return None

    def _build_query(self, product: dict[str, Any]) -> str:
        parts = [product.get("name", ""), product.get("model_number", "")]
        query = " ".join(str(part).strip() for part in parts if part).strip()
        return query or "industrial component"

    def _build_driver(self) -> webdriver.Chrome:
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-gpu")

        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)

    def _empty_source_row(self, source: PricingSource, search_url: str, availability: str) -> dict[str, Any]:
        return {
            "source": source.name,
            "currency": "INR",
            "price": None,
            "availability": availability,
            "url": search_url,
        }

    def _driver_failure_response(
        self,
        product: dict[str, Any],
        query: str,
        error: Exception,
    ) -> dict[str, Any]:
        return {
            "query": {
                "product_name": product.get("name", "Unknown product"),
                "model_number": product.get("model_number", ""),
                "query_text": query,
            },
            "prices": [
                {
                    "source": source.name,
                    "currency": "INR",
                    "price": None,
                    "availability": "driver_unavailable",
                    "url": source.search_url_template.format(query=quote_plus(query)),
                }
                for source in self.SOURCES
            ],
            "status": "driver_unavailable",
            "error": str(error),
        }
