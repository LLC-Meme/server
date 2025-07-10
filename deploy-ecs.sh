#!/bin/bash

# Configuration
AWS_REGION="ap-northeast-1"
ECR_REPOSITORY_NAME="meme-server"
ECS_CLUSTER_NAME="meme-server-cluster"
ECS_SERVICE_NAME="meme-server-service"
TASK_DEFINITION_NAME="meme-server-task"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ECS deployment process...${NC}"

# Step 1: Get AWS account ID
echo -e "${YELLOW}Getting AWS account information...${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Failed to get AWS account ID. Make sure AWS CLI is configured.${NC}"
    exit 1
fi
echo -e "${GREEN}AWS Account ID: $AWS_ACCOUNT_ID${NC}"

# Step 2: Create ECR repository if it doesn't exist
echo -e "${YELLOW}Creating ECR repository...${NC}"
aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION 2>/dev/null
if [ $? -ne 0 ]; then
    aws ecr create-repository --repository-name $ECR_REPOSITORY_NAME --region $AWS_REGION
    echo -e "${GREEN}ECR repository created${NC}"
else
    echo -e "${GREEN}ECR repository already exists${NC}"
fi

# Step 3: Get ECR login token
echo -e "${YELLOW}Logging into ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 4: Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t $ECR_REPOSITORY_NAME:latest .
if [ $? -ne 0 ]; then
    echo -e "${RED}Docker build failed${NC}"
    exit 1
fi

# Step 5: Tag and push image to ECR
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME"
echo -e "${YELLOW}Tagging and pushing image to ECR...${NC}"
docker tag $ECR_REPOSITORY_NAME:latest $ECR_URI:latest
docker push $ECR_URI:latest
if [ $? -ne 0 ]; then
    echo -e "${RED}Docker push failed${NC}"
    exit 1
fi

# Step 6: Update task definition with correct ECR URI
echo -e "${YELLOW}Updating task definition...${NC}"
sed -i.bak "s|YOUR_ECR_URI|$ECR_URI|g" ecs-task-definition.json
sed -i.bak "s|YOUR_ACCOUNT_ID|$AWS_ACCOUNT_ID|g" ecs-task-definition.json
sed -i.bak "s|us-east-1|$AWS_REGION|g" ecs-task-definition.json

# Step 7: Create CloudWatch log group
echo -e "${YELLOW}Creating CloudWatch log group...${NC}"
aws logs create-log-group --log-group-name /ecs/meme-server --region $AWS_REGION 2>/dev/null

# Step 8: Register task definition
echo -e "${YELLOW}Registering task definition...${NC}"
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json --region $AWS_REGION

# Step 9: Create ECS cluster if it doesn't exist
echo -e "${YELLOW}Creating ECS cluster...${NC}"
CLUSTER_EXISTS=$(aws ecs describe-clusters --clusters $ECS_CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].clusterName' --output text 2>/dev/null)
if [ "$CLUSTER_EXISTS" != "$ECS_CLUSTER_NAME" ]; then
    aws ecs create-cluster --cluster-name $ECS_CLUSTER_NAME --region $AWS_REGION
    echo -e "${GREEN}ECS cluster created${NC}"
else
    echo -e "${GREEN}ECS cluster already exists${NC}"
fi

echo -e "${GREEN}Deployment preparation complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Create or update ECS service in AWS Console"
echo "2. Configure load balancer and target group"
echo "3. Set up proper VPC and security groups"
echo "4. Create ECS task execution role if not exists"
echo ""
echo -e "${GREEN}ECR URI: $ECR_URI:latest${NC}"
echo -e "${GREEN}Cluster: $ECS_CLUSTER_NAME${NC}"
echo -e "${GREEN}Task Definition: $TASK_DEFINITION_NAME${NC}"

# Restore original task definition file
mv ecs-task-definition.json.bak ecs-task-definition.json