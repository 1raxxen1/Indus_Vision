import base64
import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from unittest.mock import MagicMock, patch

from posts.services.llama_extractor import LlamaExtractorService
from posts.services.selenium_pricing import SeleniumPricingService
from results_app.models import Result
from uploads_app.models import Upload


class ProcessImageApiTests(TestCase):
    def test_process_image_is_csrf_exempt_for_frontend_uploads(self):
        image = SimpleUploadedFile(
            "sample.png",
            b"fake-image-binary",
            content_type="image/png",
        )
        csrf_client = Client(enforce_csrf_checks=True)
        response = csrf_client.post(
            "/posts/api/process-image/",
            data={"image": image},
        )

        self.assertEqual(response.status_code, 200)

    def test_process_image_requires_file_upload(self):
        response = self.client.post(
            "/posts/api/process-image/",
            data={"image_name": "motor.png"},
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload["status"], "invalid_request")

    def test_process_image_persists_upload_and_result(self):
        image = SimpleUploadedFile(
            "sample.png",
            b"fake-image-binary",
            content_type="image/png",
        )
        response = self.client.post(
            "/posts/api/process-image/",
            data={"image": image},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(Upload.objects.count(), 1)
        self.assertEqual(Result.objects.count(), 1)

        upload = Upload.objects.first()
        result = Result.objects.first()
        self.assertEqual(upload.status, "completed")
        self.assertEqual(result.upload_id, upload.id)
        self.assertEqual(payload["upload"]["id"], upload.id)
        self.assertEqual(payload["result"]["id"], result.id)

    def test_process_image_multi_upload_creates_multiple_results(self):
        image_one = SimpleUploadedFile(
            "sample1.png",
            b"fake-image-binary-one",
            content_type="image/png",
        )
        image_two = SimpleUploadedFile(
            "sample2.png",
            b"fake-image-binary-two",
            content_type="image/png",
        )
        response = self.client.post(
            "/posts/api/process-image/",
            data={"images": [image_one, image_two]},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["processed_count"], 2)
        self.assertEqual(Upload.objects.count(), 2)
        self.assertEqual(Result.objects.count(), 2)

    def test_process_image_accepts_base64_json_payload(self):
        sample_png_bytes = b"\x89PNG\r\n\x1a\nfakepngcontent"
        encoded = base64.b64encode(sample_png_bytes).decode("utf-8")
        response = self.client.post(
            "/posts/api/process-image/",
            data=json.dumps({"images_base64": [encoded]}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["processed_count"], 1)
        self.assertEqual(Upload.objects.count(), 1)
        self.assertEqual(Result.objects.count(), 1)

    @patch("posts.views.ImageToPricePipeline.run", side_effect=RuntimeError("pipeline crashed"))
    def test_process_image_pipeline_error_marks_upload_failed(self, _mock_run):
        image = SimpleUploadedFile(
            "sample.png",
            b"fake-image-binary",
            content_type="image/png",
        )
        response = self.client.post(
            "/posts/api/process-image/",
            data={"image": image},
        )

        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["failed_count"], 1)
        upload = Upload.objects.first()
        self.assertEqual(upload.status, "failed")
        self.assertEqual(Result.objects.count(), 0)

    def test_result_detail_api_returns_persisted_payload(self):
        image = SimpleUploadedFile(
            "sample.png",
            b"fake-image-binary",
            content_type="image/png",
        )
        process_response = self.client.post(
            "/posts/api/process-image/",
            data={"image": image},
        )
        result_id = process_response.json()["result"]["id"]

        response = self.client.get(f"/posts/api/results/{result_id}/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["scanId"], result_id)
        self.assertIn("pricing", payload)
        self.assertIn("ocr", payload)


class SeleniumPricingServiceTests(TestCase):
    def test_extract_first_price_from_inr_text(self):
        service = SeleniumPricingService()
        price = service._extract_first_price(
            [
                "Offer price ₹ 12,499",
                "Another source INR 15,000",
            ]
        )
        self.assertEqual(price, 12499.0)

    def test_lookup_prices_returns_driver_unavailable_payload_when_webdriver_missing(self):
        service = SeleniumPricingService()
        extracted_payload = {
            "product": {
                "name": "Servo Motor",
                "model_number": "SV-100",
            }
        }

        with patch("posts.services.selenium_pricing.SELENIUM_AVAILABLE", False):
            result = service.lookup_prices(extracted_payload)

        self.assertEqual(result["status"], "driver_unavailable")
        self.assertEqual(len(result["prices"]), len(SeleniumPricingService.SOURCES))


class LlamaExtractorServiceTests(TestCase):
    @patch("posts.services.llama_extractor.PIL_AVAILABLE", True)
    @patch("posts.services.llama_extractor.TRANSFORMERS_AVAILABLE", True)
    @patch("posts.services.llama_extractor.Image")
    def test_runtime_model_path_uses_text_and_image_inputs(self, mock_image_module):
        mock_image = MagicMock()
        mock_image.convert.return_value = "rgb-image"
        mock_image_module.open.return_value = mock_image

        service = LlamaExtractorService()
        processor = MagicMock()
        processor.apply_chat_template.return_value = "chat prompt"
        processor.return_value = {"input_ids": MagicMock(shape=(1, 3))}
        processor.decode.return_value = (
            '{"product":{"name":"Servo Motor","model_number":"SV-100","manufacturer":"Acme"},'
            '"technical_datasheet":{"voltage":"24V","power":"10W","dimensions":"10x5x3","raw_text":"SV-100"},'
            '"confidence":0.93}'
        )
        model = MagicMock()
        model.generate.return_value = [[101, 102, 103, 104, 105]]

        service._processor = processor
        service._model = model

        payload = service.extract_structured_data(
            image_name="servo.jpg",
            image_path="/tmp/servo.jpg",
        )

        processor.assert_called_once_with(
            text="chat prompt",
            images="rgb-image",
            return_tensors="pt",
        )
        self.assertEqual(payload["product"]["name"], "Servo Motor")
        self.assertEqual(payload["status"], "completed")
