## About MLS Grid API:
- prod URL: https://api.mlsgrid.com/v2
- Demo URL: https://api-demo.mlsgrid.com/v2
- Documentation:    [API Version 2.0 | Overview](https://docs.mlsgrid.com/api-documentation/api-version-2.0)

## Deployment and Boot Flow

### Full Build Process (Batch File Based)

1. **Preparation**:
   - Run `copy-flowise.cmd` to set up Flowise configuration files

2. **Build MCP Server**:
   - Execute `build-mcp.bat` to:
     - Install dependencies (`npm ci`)
     - Compile TypeScript to JavaScript (`npm run build`)

3. **Docker Image Creation**:
   - Run `build-docker.bat` to:
     - Build Stage 1 (Builder) image
     - Build Stage 2 (Runtime) image with Flowise
     - Set up environment variables and ports

4. **Container Execution**:
   - Use `run-docker.bat` to:
     - Start the container with proper port mappings
     - Launch Flowise service (`flowise start`)

5. **Deployment**:
   - Built image can be pushed to container registry
   - AWS App Runner or other orchestration tools can deploy the container

### AWS Deployment Batch Files

1. **push-to-aws.bat**
   - Pushes Docker image to AWS ECR
   - Should be used for regular image updates
   - Requires AWS CLI and Docker configuration

2. **deploy-aws.bat**
   - Only needed for:
     - Initial service creation
     - Configuration changes (ports, CPU, memory)
     - After service deletion
   - Not needed for regular image updates

3. **full-deploy.bat**
   - By default only runs through image build/push
   - Contains commented-out deploy step for when needed
   - Clear comments explain when to uncomment

### Local Testing

Use `run-docker.bat` to test the built Docker image locally. This runs the same image (`mls-mcp-server`) that would be deployed to AWS, ensuring consistent behavior between local and cloud environments.

Note: run-docker.bat used to use a different local image tag `mcp-flowise` before.

### Container Runtime:
1. **Exposed Ports**:
   - 8080: For AWS App Runner
   - 3000: For Flowise UI
2. **Environment Variables**:
   - `NODE_PATH=/usr/bin/node`
   - `FLOWISE_HOST=0.0.0.0`
   - `FLOWISE_PORT=3000`
3. **Startup Command**:
   - `flowise start` (starts Flowise service)

### MCP Server (server.ts) Functionality:
1. Implements Model Context Protocol server for MLS Grid API
2. Provides tool `get_listings` with OData filter capabilities
3. Connects via stdio transport
4. Handles SIGINT for graceful shutdown

### File Locations:
- **Source Code**: `/src/server.ts` (compiled to `/app/dist/server.js`)
- **Flowise Config**: `/root/.flowise/` in container
- **Build Artifacts**: `/build/dist` (intermediate build stage)
- **Runtime Location**: `/app/dist` (final deployment location)