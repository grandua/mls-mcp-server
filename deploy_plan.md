# AI AGENT PROMPT: DEPLOY DOCKER IMAGE TO AWS APP RUNNER

You are tasked with deploying a Node.js Docker application to AWS App Runner. Follow these precise technical steps:

## REQUIRED ENVIRONMENT VARIABLES
- AWS_REGION="us-east-2"
- APP_NAME="mls-mcp-server"
- ECR_REPO_NAME="mls-mcp-server"
- PORT=8080
- NODE_ENV=production

## DEPLOYMENT SEQUENCE

### 0. VERIFY PREREQUISITES
```bash
# Check if AWS CLI is installed
if (Get-Command aws -ErrorAction SilentlyContinue) {
    aws --version
    echo "AWS CLI is installed"
} else {
    echo "AWS CLI is not installed. Installing..."
    
    # Download AWS CLI installer
    Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile "$env:TEMP\AWSCLIV2.msi"
    
    # Install AWS CLI
    Start-Process -FilePath msiexec.exe -ArgumentList "/i","$env:TEMP\AWSCLIV2.msi","/quiet","/norestart" -Wait
    
    # Verify installation
    aws --version
    
    # Configure AWS (will prompt for access key, secret key, region)
    aws configure
}

# Check if Docker is installed
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker --version
    echo "Docker is installed"
} else {
    echo "Docker needs to be installed. Please install Docker Desktop for Windows."
    exit 1
}
```

### 0.5 VERIFY FLOWISEAI CONFIGURATION
```powershell
# 1. Verify Dockerfile exposes port 8080
if (-not (Select-String -Path ".\mls-mcp-server\Dockerfile" -Pattern "EXPOSE 8080")) {
    Write-Error "Dockerfile missing 'EXPOSE 8080'"
    exit 1
}

# 2. Verify server.ts uses PORT environment variable 
if (-not (Select-String -Path ".\mls-mcp-server\src\server.ts" -Pattern "listen\(.*process\.env\.PORT")) {
    Write-Error "server.ts not configured to use PORT environment variable"
    exit 1
}

### 1. CREATE IAM ROLE
```bash
aws iam create-role --role-name AppRunnerECRAccessRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow", 
      "Principal": {"Service": "build.apprunner.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}'

aws iam attach-role-policy --role-name AppRunnerECRAccessRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
```

### 2. CREATE ECR REPOSITORY
```bash
aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION
```

### 3. AUTHENTICATE DOCKER TO ECR
```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### 4. BUILD AND PUSH DOCKER IMAGE
```bash
# Build image
cd /path/to/mls-mcp-server
docker build -t $ECR_REPO_NAME .

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Tag and push
docker tag ${ECR_REPO_NAME}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
```

### 5. DEPLOY TO APP RUNNER
```bash
# Create app configuration
cat > app.yaml << EOF
VersionLabel: v1
ServiceName: $APP_NAME
SourceConfiguration:
  ImageRepository:
    ImageIdentifier: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
    ImageConfiguration:
      Port: 8080
    ImageRepositoryType: ECR
  AutoDeploymentsEnabled: true
  AuthenticationConfiguration:
    RoleArn: arn:aws:iam::${AWS_ACCOUNT_ID}:role/AppRunnerECRAccessRole
InstanceConfiguration:
  Cpu: 1 vCPU
  Memory: 2 GB
EOF

# Create App Runner service
aws apprunner create-service --cli-input-yaml file://app.yaml
```

### 6. CONFIGURE CUSTOM DOMAIN (OPTIONAL)
```bash
SERVICE_ARN=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='$APP_NAME'].ServiceArn" --output text)
aws apprunner associate-custom-domain --service-arn $SERVICE_ARN --domain-name your-domain.com
```

### 7. CONFIGURE MONITORING
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name ${APP_NAME}-HighCPU \
  --alarm-description "High CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/AppRunner \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=$APP_NAME \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

### 8. TECHNICAL REQUIREMENTS
- Ensure Dockerfile exposes port 8080
- Ensure application listens on PORT environment variable
- Verify Docker image can run standalone before deployment
- Configure Node.js application to handle graceful shutdowns

### 9. TROUBLESHOOTING COMMANDS
```bash
# Get service logs
aws apprunner list-services
aws apprunner list-operations --service-arn <service-arn>

# Test Docker image locally
docker run -p 8080:8080 -e NODE_ENV=production -e PORT=8080 $ECR_REPO_NAME

# Update existing service
aws apprunner update-service --service-arn $SERVICE_ARN --source-configuration '{...}'
