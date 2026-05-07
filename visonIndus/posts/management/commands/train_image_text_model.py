from __future__ import annotations

import json
from pathlib import Path

import torch
from django.core.management.base import BaseCommand, CommandError
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from transformers import BlipForConditionalGeneration, BlipProcessor


class JsonlImageCaptionDataset(Dataset):
    """JSONL dataset with one {"image": "path", "text": "caption"} row per image."""

    def __init__(self, dataset_path: str, processor: BlipProcessor, image_root: str | None = None) -> None:
        self.dataset_path = Path(dataset_path)
        self.processor = processor
        self.image_root = Path(image_root) if image_root else self.dataset_path.parent
        self.rows = self._load_rows()

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> dict[str, torch.Tensor]:
        row = self.rows[index]
        image_path = Path(row["image"])
        if not image_path.is_absolute():
            image_path = self.image_root / image_path
        image = Image.open(image_path).convert("RGB")
        encoding = self.processor(
            images=image,
            text=row["text"],
            padding="max_length",
            truncation=True,
            max_length=64,
            return_tensors="pt",
        )
        item = {key: value.squeeze(0) for key, value in encoding.items()}
        labels = item["input_ids"].clone()
        labels[labels == self.processor.tokenizer.pad_token_id] = -100
        item["labels"] = labels
        return item

    def _load_rows(self) -> list[dict[str, str]]:
        if not self.dataset_path.exists():
            raise CommandError(f"Dataset file does not exist: {self.dataset_path}")
        rows = []
        with self.dataset_path.open("r", encoding="utf-8") as dataset_file:
            for line_number, line in enumerate(dataset_file, start=1):
                if not line.strip():
                    continue
                row = json.loads(line)
                if not row.get("image") or not row.get("text"):
                    raise CommandError(f"Line {line_number} must contain 'image' and 'text'.")
                rows.append({"image": str(row["image"]), "text": str(row["text"])})
        if not rows:
            raise CommandError("Dataset is empty.")
        return rows


class Command(BaseCommand):
    help = "Fine-tune the BLIP image-to-text model on a JSONL image/caption dataset."

    def add_arguments(self, parser):
        parser.add_argument("--dataset", required=True, help="Path to JSONL file with image/text rows.")
        parser.add_argument("--image-root", help="Base directory for relative image paths in the JSONL file.")
        parser.add_argument("--output-dir", default="trained_models/blip-industrial", help="Where to save the model.")
        parser.add_argument("--model-id", default="Salesforce/blip-image-captioning-base", help="Base BLIP model.")
        parser.add_argument("--epochs", type=int, default=1)
        parser.add_argument("--batch-size", type=int, default=1)
        parser.add_argument("--gradient-accumulation-steps", type=int, default=8)
        parser.add_argument("--learning-rate", type=float, default=5e-5)
        parser.add_argument("--device", default="cuda", choices=["cuda", "cpu"])
        parser.add_argument(
            "--freeze-vision-encoder",
            action="store_true",
            default=True,
            help="Keep the image encoder frozen to fit 6 GB GPUs. Enabled by default.",
        )
        parser.add_argument(
            "--train-vision-encoder",
            action="store_false",
            dest="freeze_vision_encoder",
            help="Unfreeze the image encoder. Not recommended for 6 GB VRAM.",
        )

    def handle(self, *args, **options):
        requested_device = options["device"]
        device = "cuda" if requested_device == "cuda" and torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        if requested_device == "cuda" and device == "cpu":
            self.stdout.write(self.style.WARNING("CUDA was requested but is not available; training on CPU."))

        processor = BlipProcessor.from_pretrained(options["model_id"])
        model = BlipForConditionalGeneration.from_pretrained(
            options["model_id"],
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
        ).to(device)
        model.train()

        if options["freeze_vision_encoder"]:
            for parameter in model.vision_model.parameters():
                parameter.requires_grad = False

        dataset = JsonlImageCaptionDataset(
            dataset_path=options["dataset"],
            processor=processor,
            image_root=options.get("image_root"),
        )
        dataloader = DataLoader(dataset, batch_size=options["batch_size"], shuffle=True)
        optimizer = torch.optim.AdamW(
            (parameter for parameter in model.parameters() if parameter.requires_grad),
            lr=options["learning_rate"],
        )
        scaler = torch.cuda.amp.GradScaler(enabled=device == "cuda")
        accumulation_steps = max(1, options["gradient_accumulation_steps"])

        optimizer.zero_grad(set_to_none=True)
        for epoch in range(options["epochs"]):
            running_loss = 0.0
            for step, batch in enumerate(dataloader, start=1):
                batch = {key: value.to(device) for key, value in batch.items()}
                with torch.cuda.amp.autocast(enabled=device == "cuda"):
                    outputs = model(**batch)
                    loss = outputs.loss / accumulation_steps
                scaler.scale(loss).backward()
                running_loss += float(loss.detach().cpu()) * accumulation_steps

                if step % accumulation_steps == 0 or step == len(dataloader):
                    scaler.step(optimizer)
                    scaler.update()
                    optimizer.zero_grad(set_to_none=True)
                    if device == "cuda":
                        torch.cuda.empty_cache()

            average_loss = running_loss / max(1, len(dataloader))
            self.stdout.write(f"epoch={epoch + 1} average_loss={average_loss:.4f}")

        output_dir = Path(options["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(output_dir)
        processor.save_pretrained(output_dir)
        self.stdout.write(self.style.SUCCESS(f"Saved fine-tuned image-text model to {output_dir}"))
        self.stdout.write(
            "Use it with: export HF_IMAGE_TEXT_MODEL='{}' HF_ENABLE_LOCAL_IMAGE_TEXT=true HF_IMAGE_TEXT_PREFER_LOCAL=true".format(
                output_dir
            )
        )
