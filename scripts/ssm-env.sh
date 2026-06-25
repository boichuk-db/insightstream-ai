#!/bin/bash
# Fetch all /insightstream/prod/ parameters from SSM and export as env vars
eval $(aws ssm get-parameters-by-path \
  --path "/insightstream/prod/" \
  --with-decryption \
  --region eu-north-1 \
  --query 'Parameters[*].[Name,Value]' \
  --output text | \
  awk '{split($1,a,"/"); printf "export %s=%s\n", a[length(a)], $2}')
