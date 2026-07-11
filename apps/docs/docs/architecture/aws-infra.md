---
id: aws-infra
title: AWS Infrastructure
sidebar_position: 2
---

# AWS Infrastructure

![AWS Infrastructure](/img/diagrams/aws-infra.svg)

The VPC (`10.0.0.0/16`, eu-north-1) splits into public subnets (ALB, security group allows 80/443 from `0.0.0.0/0`) and a private subnet (RDS, security group allows 5432 from the EC2 security group only, no internet route). Requests flow Internet Gateway → ALB → EC2 (t3.micro, NestJS in Docker) → RDS PostgreSQL; the S3 bucket `insightstream-widget` serves `v1/widget.js` over public HTTPS. A dedicated panel tracks the AWS verification gate opened 2026-06-25: CloudFront is still blocked (re-confirmed 2026-07-10) for both the widget (S3) and the API (ALB), while API Gateway and Bedrock are marked done/unblocked, and everything else — EC2, RDS, S3, SQS, Lambda, IAM, ALB, CloudWatch, SNS, Budgets, SES, CodeBuild, Amplify — is confirmed unblocked. SES has a single verified identity, SSM Parameter Store holds all prod secrets, CloudWatch runs 3 alarms plus a dashboard feeding an SNS topic, and AWS Budgets caps spend at $5/mo with alerts at 80%/100%.
