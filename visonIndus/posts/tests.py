import base64
import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from unittest.mock import patch

from posts.services.selenium_pricing import SeleniumPricingService
from results_app.models import Result
from uploads_app.models import Upload


class ProcessImageApiTests(TestCase):
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
