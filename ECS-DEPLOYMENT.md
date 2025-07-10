# ECS Deployment Guide for Meme Server

This guide walks you through deploying the Puppeteer-based application on AWS ECS with Fargate.

## Prerequisites

1. AWS CLI installed and configured
2. Docker installed locally
3. AWS account with appropriate permissions
4. An AWS VPC with public subnets

## Deployment Steps

### 1. Initial Setup

First, ensure you have the required IAM roles:

```bash
# Create ECS Task Execution Role (if not exists)
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}'

# Attach managed policy
aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### 2. Run the Deployment Script

```bash
./deploy-ecs.sh
```

This script will:
- Create an ECR repository
- Build and push your Docker image
- Register the ECS task definition
- Create an ECS cluster

### 3. Create ECS Service (AWS Console)

1. Go to ECS in AWS Console
2. Select your cluster: `meme-server-cluster`
3. Click "Create Service"
4. Configure:
   - Launch type: **Fargate**
   - Task definition: **meme-server-task**
   - Service name: **meme-server-service**
   - Number of tasks: **1**

### 4. Configure Networking

1. Select your VPC
2. Choose at least 2 subnets (in different AZs)
3. Security group rules:
   - Inbound: Port 3000 from your load balancer
   - Outbound: All traffic (for internet access)

### 5. (Optional) Set up Load Balancer

For production:
1. Create an Application Load Balancer
2. Create a target group (port 3000)
3. Configure health check path: `/health`
4. Update ECS service to use the load balancer

### 6. Add Health Check Endpoint

Add this to your `src/app.ts`:

```typescript
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

## Environment Variables

You can add environment variables in the task definition or through AWS Systems Manager Parameter Store.

## Monitoring

- View logs in CloudWatch: `/ecs/meme-server`
- Monitor metrics in ECS console
- Set up CloudWatch alarms for CPU/Memory

## Updating the Application

To deploy updates:

```bash
# Build and push new image
./deploy-ecs.sh

# Force new deployment in ECS
aws ecs update-service --cluster meme-server-cluster \
  --service meme-server-service --force-new-deployment
```

## Cost Optimization

- Use Fargate Spot for non-critical workloads (up to 70% savings)
- Configure auto-scaling based on metrics
- Use scheduled scaling for predictable traffic patterns

## Troubleshooting

1. **Container fails to start**: Check CloudWatch logs
2. **Out of memory**: Increase task memory in task definition
3. **Cannot connect**: Verify security groups and network configuration
4. **Puppeteer issues**: Ensure Chromium dependencies are installed in Dockerfile