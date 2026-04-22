from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

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
