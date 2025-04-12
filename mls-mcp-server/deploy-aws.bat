@echo off

:: USE THIS SCRIPT ONLY FOR:
:: 1. Initial service creation
:: 2. Configuration changes (ports, CPU, memory, IAM roles)
:: 3. After service deletion
::
:: For regular image updates, just use push-to-aws.bat

:: Configuration
set SERVICE_NAME=mls-mcp-service
set AWS_REGION=us-east-2
set ECR_REPOSITORY=mls-mcp-server
set IMAGE_TAG=latest

:: Check if service exists
aws apprunner describe-service --service-arn arn:aws:apprunner:%AWS_REGION%:%AWS_ACCOUNT_ID%:service/%SERVICE_NAME% >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo Updating existing service with new image...
    aws apprunner update-service \
        --service-arn arn:aws:apprunner:%AWS_REGION%:%AWS_ACCOUNT_ID%:service/%SERVICE_NAME% \
        --source-configuration "{\"ImageRepository\": {\"ImageIdentifier\": \"%AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY%:%IMAGE_TAG%\"}}"
    echo Service updated with new image
) else (
    echo Creating new service...
    aws apprunner create-service \
        --service-name %SERVICE_NAME% \
        --source-configuration "{\"AuthenticationConfiguration\": {\"AccessRoleArn\": \"arn:aws:iam::%AWS_ACCOUNT_ID%:role/apprunner-ecr-access\"},\"ImageRepository\": {\"ImageIdentifier\": \"%AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY%:%IMAGE_TAG%\",\"ImageRepositoryType\": \"ECR\",\"ImageConfiguration\": {\"Port\": \"8080\"}}}" \
        --instance-configuration "{\"Cpu\": \"1 vCPU\", \"Memory\": \"2 GB\"}"
    echo New service created
)
