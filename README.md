# Indus_Vision

Industrial hardware visual detection system with real-time pricing lookup.

## End-to-end pipeline (implemented)

`/posts/api/process-image/` now executes this chain:
1. **Upload** image(s) via multipart form-data (`image`/`images`) or JSON base64 payload.
2. **Extraction** using `LlamaExtractorService` (local Llama Vision is disabled by default to avoid a large first-run download, then safe fallback).
3. **Hosted image detection** using the Hugging Face Inference API (`HuggingFaceDetectionService`) as an additional detection signal.
4. **Image-to-text captioning** using `HuggingFaceImageTextService` with hosted API by default and optional local CUDA BLIP inference for small GPUs.
5. **PaddleOCR** text extraction when optional Paddle dependencies are installed.
6. **Selenium pricing lookup** across marketplace sources.
7. **Presentation payload** normalized for frontend cards (detection/OCR/pricing/storage).
8. **Storage** in `Upload` and `Result` tables.

## API quick test

```bash
curl -X POST http://127.0.0.1:8000/posts/api/process-image/ \
  -F "image=@/path/to/component.jpg"
```

## Runtime model wiring

Environment variables:
- `VISION_ENABLE_LOCAL_MODEL` (default `false`; set to `true` only when you want to download/run the large local Llama Vision model)
- `VISION_MODEL_ID` (default: `unsloth/Llama-3.2-11B-Vision-Instruct-bnb-4bit`)
- `VISION_ADAPTER_PATH` (optional local fine-tuned adapter/model path)
- `VISION_DEVICE` (`cuda` or `cpu`)
- `VISION_MAX_NEW_TOKENS` (default `256`)
- `HF_ENABLE_IMAGE_DETECTION` (default `true`)
- `HF_API_TOKEN` or `HUGGINGFACE_API_TOKEN` (required for the public Hugging Face Inference API; optional when `HF_IMAGE_DETECTION_URL` points to an endpoint that does not require bearer auth)
- `HF_IMAGE_DETECTION_MODEL` (default: `facebook/detr-resnet-50`)
- `HF_IMAGE_DETECTION_URL` (optional fully-qualified custom Inference Endpoint URL)
- `HF_IMAGE_DETECTION_TIMEOUT` (default `30` seconds)
- `HF_ENABLE_IMAGE_TEXT` (default `true`)
- `HF_IMAGE_TEXT_MODEL` (default: `Salesforce/blip-image-captioning-base`, recommended free image-to-text model for this app)
- `HF_IMAGE_TEXT_URL` (optional fully-qualified custom Inference Endpoint URL)
- `HF_IMAGE_TEXT_TIMEOUT` (default `30` seconds)
- `HF_ENABLE_LOCAL_IMAGE_TEXT` (default `false`; set to `true` to run BLIP locally)
- `HF_IMAGE_TEXT_PREFER_LOCAL` (default `false`; set to `true` to use the downloaded local BLIP model before the hosted API)
- `HF_IMAGE_TEXT_DEVICE` (`cuda` or `cpu`; defaults to `cuda`)
- `HF_IMAGE_TEXT_MAX_NEW_TOKENS` (default `64`)
- `PADDLE_OCR_ENABLED` (default `true`; returns `dependency_missing` until optional OCR dependencies are installed)
- `PADDLE_OCR_LANG` (default `en`)
- `PADDLE_OCR_USE_GPU` (default `false`; start with CPU OCR on 6 GB GPUs to save VRAM)
- `PADDLE_OCR_MAX_SIDE_LEN` (default `1280`; downscales large images before OCR to reduce RAM)
- `PADDLE_OCR_DET_LIMIT_SIDE_LEN` (default `960`)
- `PADDLE_OCR_MIN_CONFIDENCE` (default `0.35`)
- `SELENIUM_PRICING_ENABLED` (default `true`; set `false` to avoid Chrome/Selenium memory use during local AI testing)

If model dependencies are not available, extractor returns deterministic fallback JSON so the full pipeline remains testable. If Hugging Face detection/captioning is disabled or unavailable, the pipeline still completes with runtime statuses in the response.

### Hugging Face token setup

Keep your Hugging Face token local. Do **not** paste it into source files or commit it. Copy `.env.example` to `.env`, put your token in `HF_API_TOKEN`, and Django will load it automatically from either the repository root or `visonIndus/.env`:

```powershell
Copy-Item .env.example .env
notepad .env
```

If a token has been shared in chat, rotate/revoke it in Hugging Face settings and use a new one locally.

### RTX 3050/3060 6 GB Mobile setup

For your RTX 3050/3060 6 GB Mobile, use the hosted Hugging Face APIs or the local BLIP image-to-text model. Do **not** enable the default 11B Llama Vision model on 6 GB VRAM unless you replace it with a much smaller/quantized model.

Recommended local CUDA captioning setup:

```bash
export HF_API_TOKEN="your_huggingface_token"
export HF_IMAGE_TEXT_MODEL="Salesforce/blip-image-captioning-base"
export HF_ENABLE_LOCAL_IMAGE_TEXT=true
export HF_IMAGE_TEXT_PREFER_LOCAL=true
export HF_IMAGE_TEXT_DEVICE=cuda
export VISION_ENABLE_LOCAL_MODEL=false
export PADDLE_OCR_USE_GPU=false
export SELENIUM_PRICING_ENABLED=false  # optional while testing AI locally
```

`Salesforce/blip-image-captioning-base` is the recommended free Hugging Face image-to-text model here because it is popular, much smaller than BLIP-2/Llama Vision models, and practical for a 6 GB GPU with fp16 inference. Hosted usage still depends on Hugging Face account/API limits.

### Multi-image compilation

You can upload multiple images in one request using the `images` form-data field or `images_base64` JSON array. The backend processes each image, then returns a `compiled_output` that merges all available signals into one product/specification payload and runs pricing once on the compiled data. This is useful for industrial parts where one photo shows the object and another close-up shows the nameplate/spec label.

Example:

```bash
curl -X POST http://127.0.0.1:8000/posts/api/process-image/ \
  -F "images=@motor-front.jpg" \
  -F "images=@motor-nameplate.jpg"
```

The compiled response includes:
- `compiled_output.extraction.product`
- `compiled_output.extraction.ocr_texts`
- `compiled_output.extraction.motor_specs` (for values such as HP, voltage, RPM, phase, frequency, current, IP rating when visible in OCR/captions)
- `compiled_output.pricing`
- `compiled_display` for frontend cards

### PaddleOCR setup

PaddleOCR is optional because PaddlePaddle wheels are more version-sensitive than the rest of the stack. Install it separately from `requirements-ocr.txt` after the main app is working:

```bash
pip install -r requirements-ocr.txt
```

For your current Python `3.14.4`, `paddleocr` is visible on PyPI but `paddlepaddle` may not have a matching wheel yet. If `pip install paddlepaddle` reports no matching distribution, create a Python 3.11 or 3.12 virtual environment for OCR/GPU work. Start with CPU OCR to keep VRAM free for BLIP:

```bash
export PADDLE_OCR_ENABLED=true
export PADDLE_OCR_USE_GPU=false
export PADDLE_OCR_LANG=en
```

On Windows PowerShell, use `$env:NAME="value"` instead of `export NAME=value`.

Check your PC readiness at any time with:

```bash
cd visonIndus
python manage.py check_pc_readiness
```

### Training image-to-text on your dataset

Create a JSONL file where each line has an image path and target caption/text:

```jsonl
{"image": "relay/relay_001.jpg", "text": "industrial relay module with screw terminals"}
{"image": "motors/motor_001.jpg", "text": "small 24 volt DC motor with gearbox"}
```

Fine-tune BLIP with 6 GB-friendly defaults (batch size 1, fp16 on CUDA, frozen vision encoder):

```bash
cd visonIndus
python manage.py train_image_text_model \
  --dataset ../data/industrial_captions.jsonl \
  --image-root ../data/images \
  --output-dir ../trained_models/blip-industrial \
  --epochs 1 \
  --batch-size 1 \
  --gradient-accumulation-steps 8 \
  --device cuda
```

Then run the trained model locally:

```bash
export HF_IMAGE_TEXT_MODEL="../trained_models/blip-industrial"
export HF_ENABLE_LOCAL_IMAGE_TEXT=true
export HF_IMAGE_TEXT_PREFER_LOCAL=true
export HF_IMAGE_TEXT_DEVICE=cuda
```


## Will frontend work out of the box with Nginx?

Short answer: **Nginx alone is not enough for Django**, but it is enough for serving the built React app.

Use this production layout:
- **Nginx**: serves React static files (`frontend/dist`) and proxies API requests.
- **Gunicorn (or Uvicorn)**: runs Django app on localhost (e.g. `127.0.0.1:8000`).

So on the VM you typically run:
1. `npm run build` in `frontend/` (one-time per release).
2. Nginx serves the build output.
3. Gunicorn serves Django backend.
4. Nginx forwards `/posts/api/*` to Gunicorn.

### Nginx sample config

```nginx
server {
    listen 80;
    server_name _;

    root /opt/Indus_Vision/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /posts/api/ {
        proxy_pass http://127.0.0.1:8000/posts/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /media/ {
        alias /opt/Indus_Vision/visonIndus/media/;
    }

    location /static/ {
        alias /opt/Indus_Vision/visonIndus/static/;
    }
}
```

### Frontend API base URL

Frontend now defaults to relative API path `/posts/api`, so it works behind Nginx reverse proxy out-of-the-box.
If needed, override with `VITE_API_BASE_URL` at build time.

## Azure VM sizing guidance for your Llama 3.2 Vision setup

For inference + Selenium + Django on one VM:

- **Recommended (production-like):** `Standard_NC24ads_A100_v4` (1x A100 80GB)
  - Best fit for 11B vision models + LoRA adapters + room for batch testing.
- **Cost-optimized test:** `Standard_NC8as_T4_v3` (1x T4 16GB)
  - Works for 4-bit inference with careful batch/token limits.
- **CPU-only fallback:** `Standard_D8s_v5`
  - Use only for API plumbing tests (not practical for true vision LLM latency).

> If you plan to *train* LoRA adapters on the VM, prefer A100-class GPU (40GB+ VRAM).

## Deploying on Azure VM (Ubuntu)

1. Provision VM (GPU image preferred), open ports 22 and 8000 (or reverse proxy 80/443).
2. SSH into VM and install system deps:
   ```bash
   sudo apt update
   sudo apt install -y python3.12-venv python3-pip git chromium-browser
   ```
3. Clone and set up app:
   ```bash
   git clone <your-repo-url> Indus_Vision
   cd Indus_Vision
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Configure env:
   ```bash
   export DJANGO_SETTINGS_MODULE=visonIndus.settings
   export VISION_MODEL_ID="unsloth/Llama-3.2-11B-Vision-Instruct-bnb-4bit"
   export VISION_ADAPTER_PATH="/opt/models/your-finetuned-adapter"   # optional
   export VISION_DEVICE="cuda"
   ```
5. Run migrations + start server:
   ```bash
   cd visonIndus
   python manage.py migrate
   python manage.py runserver 0.0.0.0:8000
   ```
6. Validate pipeline:
   ```bash
   curl -X POST http://<vm-public-ip>:8000/posts/api/process-image/ -F "image=@test.jpg"
   ```

## Notes for your Kaggle/Unsloth fine-tuned model

- Your notebook code is suitable for creating a LoRA adapter checkpoint.
- Copy resulting adapter directory to VM (e.g. `/opt/models/your-finetuned-adapter`).
- Set `VISION_ADAPTER_PATH` to that folder so backend uses your tuned model in extraction.


## PR troubleshooting: "Binary files are not supported"


### Windows PowerShell note

If you run patch commands in **PowerShell**, bash syntax like `&&` and `<<'EOF'` will fail with parser errors.
Use PowerShell-safe syntax instead:

```powershell
Set-Location (git rev-parse --show-toplevel)
@'
diff--git a/.gitignore b/.gitignore
...patch content...
'@ | git apply --3way
```

Or run the original bash command inside Git Bash/WSL:

```powershell
bash -lc 'cd "$(git rev-parse --show-toplevel)" && git apply --3way < patch.diff'
```


If your PR tool shows this error, run:

```bash
git diff --numstat <base-branch>...HEAD
```

Any row with `-` in place of line counts is treated as binary.
For text files, convert to UTF-8 and recommit:

```bash
python - <<'PY2'
from pathlib import Path
p = Path('path/to/file')
text = p.read_text(encoding='utf-16')
p.write_text(text, encoding='utf-8')
PY2
```

Then amend and force-push your branch.
