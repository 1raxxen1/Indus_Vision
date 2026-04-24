# CI/CD (No Docker)

This repository now includes two GitHub Actions workflows:

- **CI**: `.github/workflows/ci.yml`
  - Runs Django tests (`python manage.py test posts.tests`)
  - Builds frontend with Vite (`npm run build`)
- **CD**: `.github/workflows/cd.yml`
  - Triggered on push to `main` or manually (`workflow_dispatch`)
  - Deploys to a VM over SSH + `rsync`
  - Installs dependencies, runs migrations, builds frontend, restarts systemd services

## Required GitHub secrets for CD

Add these in your GitHub repo settings:

- `SSH_PRIVATE_KEY`: private key for deploy user on VM
- `DEPLOY_HOST`: VM public IP or host
- `DEPLOY_USER`: SSH user on VM
- `DEPLOY_PATH`: deploy path on VM (example: `/var/www/Indus_Vision`)

## Notes

- No Docker is used.
- Service names in CD are examples:
  - `indus-gunicorn`
  - `indus-nginx`

Update those to match your VM's systemd service names.
