---
id: aws-network
title: AWS Network Diagram
sidebar_position: 6
---

# AWS Network Diagram

![AWS Network Diagram](/img/diagrams/aws-network.svg)

This is the pure network/security-group view of the VPC (`10.0.0.0/16`, eu-north-1) — for compute, async processing, monitoring, and the build pipeline, see the [AWS Infrastructure](./aws-infra) page instead. Traffic enters via the Internet Gateway into the public subnet (`10.0.1.0/24`, route table `0.0.0.0/0 → IGW`), reaching the ALB (security group: inbound 80/443 from `0.0.0.0/0`) and then EC2 (security group: inbound 3001 from the ALB security group only). EC2 reaches RDS in the private subnet (`10.0.2.0/24`, no `0.0.0.0/0` route; security group: inbound 5432 from the EC2 security group only) and also has outbound 443 to the internet for Gemini, SSM, and ECR pulls. Route53 and CloudFront are both drawn as planned/blocked (no domain registered yet; CloudFront blocked by the verification gate). EC2 stays public rather than sitting behind a NAT Gateway to stay in the AWS Free Tier, while the layered, stateful security groups (ALB←internet, EC2←ALB-only, RDS←EC2-only) still prevent a request from skipping a layer.
