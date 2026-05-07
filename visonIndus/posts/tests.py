import base64
import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from unittest.mock import MagicMock, patch

from posts.services.huggingface_detection import HuggingFaceDetectionConfig, HuggingFaceDetectionService
from posts.services.huggingface_image_text import HuggingFaceImageTextConfig, HuggingFaceImageTextService
from posts.services.llama_extractor import ExtractorRuntimeConfig, LlamaExtractorService
from posts.services.paddle_ocr import PaddleOCRConfig, PaddleOCRService
from posts.services.pipeline import ImageToPricePipeline
from posts.services.selenium_pricing import SeleniumPricingService
from inventory_app.models import InventoryScan
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
        self.assertTrue(payload["is_multi_image_compilation"])
        self.assertIn("compiled_output", payload)
        self.assertIn("compiled_display", payload)
        self.assertEqual(payload["compiled_output"]["source_image_count"], 2)
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

    def test_results_page_normalizes_fractional_confidence_for_history(self):
        image = SimpleUploadedFile(
            "sample.png",
            b"fake-image-binary",
            content_type="image/png",
        )
        self.client.post("/posts/api/process-image/", data={"image": image})

        response = self.client.get("/posts/api/results/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        first = payload["results"][0]
        self.assertGreaterEqual(first["confidence"], 0)
        self.assertLessEqual(first["confidence"], 100)

    def test_scan_inventory_post_saves_result_as_inventory_item(self):
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

        response = self.client.post(
            "/posts/api/scan-inventory/",
            data=json.dumps({"result_id": result_id, "quantity": 2}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["status"], "saved")
        self.assertEqual(InventoryScan.objects.count(), 1)
        scan = InventoryScan.objects.first()
        self.assertEqual(scan.quantity, 2)
        self.assertEqual(scan.upload_id, Result.objects.get(id=result_id).upload_id)


class HuggingFaceDetectionServiceTests(TestCase):
    def test_detect_skips_public_api_when_token_is_missing(self):
        service = HuggingFaceDetectionService(
            HuggingFaceDetectionConfig(api_token=None, api_url=None)
        )

        with patch.object(service, "_call_inference_api") as mock_call:
            result = service.detect(image_path=__file__, image_name="sample.png")

        mock_call.assert_not_called()
        self.assertEqual(result["status"], "api_token_not_configured")
        self.assertFalse(result["runtime"]["token_configured"])

    def test_detect_normalizes_huggingface_object_detection_response(self):
        service = HuggingFaceDetectionService(
            HuggingFaceDetectionConfig(api_token="test-token", api_url="https://example.test/hf")
        )

        with patch.object(
            service,
            "_call_inference_api",
            return_value=[
                {"label": "relay", "score": 0.74, "box": {"xmin": 1, "ymin": 2, "xmax": 3, "ymax": 4}},
                {"label": "switch", "score": 0.91, "box": {"xmin": 5, "ymin": 6, "xmax": 7, "ymax": 8}},
            ],
        ):
            result = service.detect(image_path=__file__, image_name="sample.png")

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["top_detection"]["label"], "switch")
        self.assertEqual(result["top_detection"]["confidence"], 91.0)


class HuggingFaceImageTextServiceTests(TestCase):
    def test_generate_skips_public_api_when_token_is_missing_and_local_is_disabled(self):
        service = HuggingFaceImageTextService(
            HuggingFaceImageTextConfig(
                api_token=None,
                api_url=None,
                hosted_enabled=True,
                local_enabled=False,
            )
        )

        with patch.object(service, "_call_inference_api") as mock_call:
            result = service.generate(image_path=__file__, image_name="sample.png")

        mock_call.assert_not_called()
        self.assertEqual(result["status"], "api_token_not_configured")
        self.assertFalse(result["runtime"]["token_configured"])

    def test_generate_normalizes_hosted_caption_response(self):
        service = HuggingFaceImageTextService(
            HuggingFaceImageTextConfig(
                api_token="test-token",
                api_url="https://example.test/hf-image-text",
                hosted_enabled=True,
                local_enabled=False,
            )
        )

        with patch.object(
            service,
            "_call_inference_api",
            return_value=[{"generated_text": "a close-up photo of a relay"}],
        ):
            result = service.generate(image_path=__file__, image_name="sample.png")

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["caption"], "a close-up photo of a relay")
        self.assertEqual(result["runtime"]["task"], "image-to-text")


class PaddleOCRServiceTests(TestCase):
    def test_extract_text_reports_dependency_missing_without_crashing(self):
        service = PaddleOCRService(PaddleOCRConfig(enabled=True))

        with patch("posts.services.paddle_ocr.importlib.util.find_spec", return_value=None):
            result = service.extract_text(image_path=__file__, image_name="sample.png")

        self.assertEqual(result["status"], "dependency_missing")
        self.assertEqual(result["texts"], [])

    def test_normalizes_legacy_paddleocr_result_shape(self):
        service = PaddleOCRService(PaddleOCRConfig(enabled=True))
        raw_result = [[[[0, 0], [1, 0], [1, 1], [0, 1]], ["OMRON", 0.92]]]

        rows = service._normalize_result(raw_result)

        self.assertEqual(rows[0]["text"], "OMRON")
        self.assertEqual(rows[0]["confidence"], 0.92)

    def test_normalizes_paddleocr_dict_result_shape(self):
        service = PaddleOCRService(PaddleOCRConfig(enabled=True))
        raw_result = {"rec_text": "24VDC", "rec_score": 0.88, "dt_polys": [[0, 0], [1, 1]]}

        rows = service._normalize_result(raw_result)

        self.assertEqual(rows[0]["text"], "24VDC")
        self.assertEqual(rows[0]["confidence"], 0.88)


class ImageToPricePipelineTests(TestCase):
    def test_huggingface_detection_enriches_fallback_extraction(self):
        extractor = MagicMock()
        extractor.extract_structured_data.return_value = {
            "product": {"name": "Industrial Component", "model_number": "Unknown", "manufacturer": "Unknown"},
            "technical_datasheet": {},
            "confidence": 0.35,
            "runtime": {"mode": "fallback"},
        }
        pricing = MagicMock()
        pricing.lookup_prices.return_value = {"status": "skipped", "prices": []}
        hf_detector = MagicMock()
        hf_detector.detect.return_value = {
            "status": "completed",
            "model": "facebook/detr-resnet-50",
            "top_detection": {"label": "relay", "score": 0.82},
            "detections": [{"label": "relay", "score": 0.82, "confidence": 82.0, "box": None}],
        }
        hf_image_text = MagicMock()
        hf_image_text.generate.return_value = {
            "status": "completed",
            "model": "Salesforce/blip-image-captioning-base",
            "caption": "a relay module with terminal blocks",
        }
        ocr = MagicMock()
        ocr.extract_text.return_value = {
            "status": "completed",
            "texts": ["OMRON", "24VDC"],
            "joined_text": "OMRON 24VDC",
        }

        output = ImageToPricePipeline(
            extractor=extractor,
            pricing=pricing,
            hf_detector=hf_detector,
            hf_image_text=hf_image_text,
            ocr=ocr,
        ).run(image_name="relay.png", image_path="/tmp/relay.png")

        self.assertEqual(output["extraction"]["product"]["name"], "Relay")
        self.assertEqual(output["runtime_flags"]["huggingface_detection_status"], "completed")
        self.assertEqual(output["runtime_flags"]["huggingface_image_text_status"], "completed")
        self.assertEqual(output["runtime_flags"]["paddle_ocr_status"], "completed")
        self.assertIn("PaddleOCR", output["extraction"]["technical_datasheet"]["raw_text"])
        self.assertIn("HF image caption", output["extraction"]["technical_datasheet"]["raw_text"])
        self.assertEqual(output["extraction"]["ocr_texts"], ["OMRON", "24VDC"])
        self.assertIn("huggingface_detection", output["extraction"])
        self.assertIn("huggingface_image_text", output["extraction"])
        self.assertIn("paddle_ocr", output["extraction"])

    def test_compile_outputs_merges_specs_ocr_and_prices_once(self):
        pricing = MagicMock()
        pricing.lookup_prices.return_value = {
            "status": "completed",
            "prices": [{"source": "Vendor", "price": 1200, "availability": "in_stock"}],
            "summary": {"lowest_price": 1200, "highest_price": 1200, "sources_checked": 1},
        }
        pipeline = ImageToPricePipeline(
            extractor=MagicMock(),
            pricing=pricing,
            hf_detector=MagicMock(),
            hf_image_text=MagicMock(),
            ocr=MagicMock(),
        )
        processed_results = [
            {
                "input": {"image_name": "motor-front.jpg"},
                "result": {"id": 1},
                "output": {
                    "extraction": {
                        "product": {"name": "Industrial Component", "model_number": "Unknown", "manufacturer": "Acme"},
                        "technical_datasheet": {"raw_text": "nameplate 230V 0.5 HP 1440 RPM"},
                        "ocr_texts": ["230V", "0.5 HP"],
                        "huggingface_image_text": {"caption": "an electric motor nameplate"},
                        "huggingface_detection": {"detections": [{"label": "motor", "score": 0.8}]},
                        "confidence": 0.7,
                    }
                },
            },
            {
                "input": {"image_name": "motor-side.jpg"},
                "result": {"id": 2},
                "output": {
                    "extraction": {
                        "product": {"name": "Electric Motor", "model_number": "MTR-100", "manufacturer": "Unknown"},
                        "technical_datasheet": {"raw_text": "50Hz 1 phase"},
                        "ocr_texts": ["50Hz", "1 phase"],
                        "huggingface_image_text": {"caption": "side view of a motor"},
                        "huggingface_detection": {"detections": []},
                        "confidence": 0.9,
                    }
                },
            },
        ]

        compiled = pipeline.compile_outputs(processed_results)

        pricing.lookup_prices.assert_called_once()
        extraction = compiled["extraction"]
        self.assertEqual(extraction["product"]["name"], "Electric Motor")
        self.assertEqual(extraction["product"]["model_number"], "MTR-100")
        self.assertEqual(extraction["product"]["manufacturer"], "Acme")
        self.assertEqual(extraction["motor_specs"]["voltage"], "230 V")
        self.assertEqual(extraction["motor_specs"]["horsepower"], "0.5 HP")
        self.assertEqual(extraction["motor_specs"]["rpm"], "1440 RPM")
        self.assertEqual(compiled["runtime_flags"]["source_image_count"], 2)
        self.assertEqual(compiled["source_result_ids"], [1, 2])


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


    def test_lookup_prices_can_be_disabled_to_save_local_ram(self):
        service = SeleniumPricingService()
        service.enabled = False

        result = service.lookup_prices({"product": {"name": "Relay", "model_number": "R-1"}})

        self.assertEqual(result["status"], "disabled")
        self.assertEqual(result["prices"], [])

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
    def test_local_runtime_model_is_disabled_by_default_to_avoid_large_downloads(self):
        service = LlamaExtractorService()

        payload = service.extract_structured_data(image_name="relay.png", image_path=__file__)

        self.assertEqual(payload["runtime"]["runtime_status"], "local_model_disabled")
        self.assertFalse(payload["runtime"]["local_model_enabled"])

    @patch("posts.services.llama_extractor.PIL_AVAILABLE", True)
    @patch("posts.services.llama_extractor.TRANSFORMERS_AVAILABLE", True)
    @patch("posts.services.llama_extractor.Image")
    def test_runtime_model_path_uses_text_and_image_inputs(self, mock_image_module):
        mock_image = MagicMock()
        mock_image.convert.return_value = "rgb-image"
        mock_image_module.open.return_value = mock_image

        service = LlamaExtractorService(config=ExtractorRuntimeConfig(enable_local_model=True))
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

    @patch.object(LlamaExtractorService, "_extract_with_runtime_model", return_value=None)
    @patch.object(
        LlamaExtractorService,
        "_extract_with_backup_runtime_model",
        return_value={
            "product": {"name": "Backup Motor", "model_number": "BK-22", "manufacturer": "BackupCo"},
            "technical_datasheet": {
                "voltage": "24V",
                "power": "12W",
                "dimensions": "10x5x3",
                "raw_text": "backup extraction",
            },
            "confidence": 0.86,
            "status": "completed",
        },
    )
    def test_backup_runtime_selected_when_primary_runtime_unavailable(
        self,
        _mock_backup,
        _mock_primary,
    ):
        service = LlamaExtractorService()
        payload = service.extract_structured_data(image_name="motor.png", image_path="/tmp/motor.png")

        self.assertEqual(payload["product"]["name"], "Backup Motor")
        self.assertEqual(payload["selection"]["chosen"], "backup")
