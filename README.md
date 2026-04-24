# Indus_Vision

Industrial hardware visual detection system with real-time pricing lookup.

## End-to-end pipeline (implemented)

`/posts/api/process-image/` now executes this chain:
1. **Upload** image(s) via multipart form-data (`image`/`images`) or JSON base64 payload.
2. **Extraction** using `LlamaExtractorService` (tries Llama 3.2 Vision runtime first, then safe fallback).
3. **Selenium pricing lookup** across marketplace sources.
4. **Presentation payload** normalized for frontend cards (detection/OCR/pricing/storage).
5. **Storage** in `Upload` and `Result` tables.

## API quick test

```bash
curl -X POST http://127.0.0.1:8000/posts/api/process-image/ \
  -F "image=@/path/to/component.jpg"
```

## Runtime model wiring

Environment variables:
- `VISION_MODEL_ID` (default: `unsloth/Llama-3.2-11B-Vision-Instruct-bnb-4bit`)
- `VISION_ADAPTER_PATH` (optional local fine-tuned adapter/model path)
- `VISION_DEVICE` (`cuda` or `cpu`)
- `VISION_MAX_NEW_TOKENS` (default `256`)

If model dependencies are not available, extractor returns deterministic fallback JSON so the full pipeline remains testable.


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
