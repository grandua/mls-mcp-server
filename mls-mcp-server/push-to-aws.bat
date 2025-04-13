@echo off

:: Configuration
set AWS_REGION=us-east-2
set ECR_REPOSITORY=mls-mcp-server
set IMAGE_TAG=latest
set AWS_ACCOUNT_ID=286284257424

:: Login to AWS ECR
aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com

:: Tag the image
docker tag mls-mcp-server:%IMAGE_TAG% %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY%:%IMAGE_TAG%

:: Push the image
docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY%:%IMAGE_TAG%

echo Image successfully pushed to AWS ECR
