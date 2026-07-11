---
id: deploy-pipeline
title: Deployment Pipeline
sidebar_position: 5
---

# Deployment Pipeline

![Deployment Pipeline](/img/diagrams/deploy-pipeline.svg)

GitHub Actions runs a fully automated CI workflow on every push/PR to `main`: lint, build (turbo), typecheck, and a parallel test job (backend Jest tests, landing tests), followed by an e2e job (migrations + Playwright) — the workflow ends at "CI/CD pipeline green", with no deploy step. Deploying to AWS is still manual and separate: build the Docker image locally, push to ECR, SSH to EC2, and run `docker-run.sh`, which sources secrets from SSM Parameter Store, pulls the image from ECR, and runs Redis plus the API container behind the ALB. CodeBuild automation (GitHub webhook → build → ECR) is provisioned and its quota was unblocked 2026-07-05 (15 concurrent builds), but it is not yet wired up to replace the manual local-build steps — a business-priority choice, not a feasibility blocker.
