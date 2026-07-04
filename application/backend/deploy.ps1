# GCP Step-by-Step Deployment Script for Windows PowerShell
param(
    [string]$Project = "hackaton-day-5",
    [string]$Region = "europe-west1",
    [string]$Registry = "buildwithai-repo",
    [string]$DbInstance = "buildwithai-db",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "inventapassword",
    [string]$DbName = "buildwithai",
    [switch]$Init,
    [switch]$Db,
    [switch]$Build,
    [switch]$Deploy,
    [switch]$ShowUrls,
    [switch]$Cleanup
)

# Locate gcloud executable (handles default AppData path or system PATH)
$gcloud = "gcloud"
$gcloudDefault = "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (Test-Path $gcloudDefault) {
    $gcloud = $gcloudDefault
}

Write-Host "Using gcloud path: $gcloud" -ForegroundColor Cyan

# Set active project
& $gcloud config set project $Project
$registryUrl = "${Region}-docker.pkg.dev/${Project}/${Registry}"

if ($Init) {
    Write-Host "--- STEP 1: Enabling Required Google Cloud APIs ---" -ForegroundColor Yellow
    & $gcloud services enable `
        artifactregistry.googleapis.com `
        run.googleapis.com `
        sqladmin.googleapis.com `
        compute.googleapis.com `
        cloudbuild.googleapis.com `
        aiplatform.googleapis.com

    Write-Host "--- STEP 2: Creating Artifact Registry for Containers ---" -ForegroundColor Yellow
    & $gcloud artifacts repositories create $Registry `
        --repository-format=docker `
        --location=$Region `
        --description="BuildWithAI Docker Repository"
    
    Write-Host "Initialization completed successfully!" -ForegroundColor Green
}

if ($Db) {
    Write-Host "--- STEP 3: Provisioning Cloud SQL PostgreSQL Instance (takes 4-6 minutes) ---" -ForegroundColor Yellow
    & $gcloud sql instances create $DbInstance `
        --database-version=POSTGRES_15 `
        --tier=db-f1-micro `
        --region=$Region `
        --root-password=$DbPassword

    Write-Host "Creating Database '$DbName' inside instance..." -ForegroundColor Yellow
    & $gcloud sql databases create $DbName --instance=$DbInstance
    
    Write-Host "Database provisioned successfully!" -ForegroundColor Green
}

if ($Build) {
    Write-Host "--- STEP 4: Packaging and Submitting Containers to Cloud Build ---" -ForegroundColor Yellow
    & $gcloud builds submit --config=cloudbuild.yaml `
        --substitutions=_PROJECT_ID=$Project,_REGION=$Region,_REGISTRY_NAME=$Registry
    
    Write-Host "Cloud Build completed!" -ForegroundColor Green
}

if ($Deploy) {
    Write-Host "--- STEP 5: Deploying Services to Google Cloud Run ---" -ForegroundColor Yellow

    # 1. Deploy TRIZ MCP Server
    $mcpImage = "${registryUrl}/triz-mcp-server:latest"
    Write-Host "Deploying TRIZ MCP Server..." -ForegroundColor Cyan
    & $gcloud run deploy triz-mcp-server `
        --image=$mcpImage `
        --region=$Region `
        --platform=managed `
        --ingress=all `
        --allow-unauthenticated `
        --memory=2Gi `
        --min-instances=1 `
        --set-env-vars="MCP_HOST=0.0.0.0,MCP_PORT=8080"

    # Fetch MCP Server URL
    Write-Host "Fetching TRIZ MCP Server URL..." -ForegroundColor Gray
    $mcpUrl = (& $gcloud run services describe triz-mcp-server --region=$Region --format='value(status.url)')
    Write-Host "MCP URL: $mcpUrl" -ForegroundColor Green

    # 2. Deploy ADK Agent
    $agentImage = "${registryUrl}/triz-adk-agent:latest"
    Write-Host "Deploying ADK Agent..." -ForegroundColor Cyan
    & $gcloud run deploy triz-adk-agent `
        --image=$agentImage `
        --region=$Region `
        --platform=managed `
        --ingress=all `
        --allow-unauthenticated `
        --memory=2Gi `
        --min-instances=1 `
        --set-env-vars="MCP_SERVER_URL=${mcpUrl}/mcp,GOOGLE_GENAI_USE_VERTEXAI=1,GOOGLE_CLOUD_PROJECT=${Project},GCP_PROJECT=${Project}"

    # Fetch Agent URL
    Write-Host "Fetching ADK Agent URL..." -ForegroundColor Gray
    $agentUrl = (& $gcloud run services describe triz-adk-agent --region=$Region --format='value(status.url)')
    Write-Host "Agent URL: $agentUrl" -ForegroundColor Green

    # 3. Deploy Backend
    $backendImage = "${registryUrl}/buildwithai-backend:latest"
    $dbUrl = "postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}?host=/cloudsql/${Project}:${Region}:${DbInstance}"
    Write-Host "Deploying NestJS Backend..." -ForegroundColor Cyan
    & $gcloud run deploy buildwithai-backend `
        --image=$backendImage `
        --region=$Region `
        --platform=managed `
        --allow-unauthenticated `
        --min-instances=1 `
        --add-cloudsql-instances="${Project}:${Region}:${DbInstance}" `
        --set-env-vars="DATABASE_URL=${dbUrl},ADK_AGENT_URL=${agentUrl}"

    # Fetch Backend URL
    Write-Host "Fetching Backend URL..." -ForegroundColor Gray
    $backendUrl = (& $gcloud run services describe buildwithai-backend --region=$Region --format='value(status.url)')
    Write-Host "Backend URL: $backendUrl" -ForegroundColor Green

    # 4. Deploy Frontend
    $frontendImage = "${registryUrl}/buildwithai-frontend:latest"
    Write-Host "Deploying Angular Frontend..." -ForegroundColor Cyan
    & $gcloud run deploy buildwithai-frontend `
        --image=$frontendImage `
        --region=$Region `
        --platform=managed `
        --allow-unauthenticated `
        --min-instances=1 `
        --set-env-vars="BACKEND_URL=${backendUrl}"

    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    & $MyInvocation.MyCommand.Path -ShowUrls -Project $Project -Region $Region
}

if ($ShowUrls) {
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "🌀 BUILDWITHAI - ACTIVE GCP CLOUD RUN ENDPOINTS" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    
    $front = & $gcloud run services describe buildwithai-frontend --region=$Region --format='value(status.url)'
    $back = & $gcloud run services describe buildwithai-backend --region=$Region --format='value(status.url)'
    $agent = & $gcloud run services describe triz-adk-agent --region=$Region --format='value(status.url)'
    $mcp = & $gcloud run services describe triz-mcp-server --region=$Region --format='value(status.url)'

    Write-Host "Frontend (Angular UI):  $front"
    Write-Host "Backend (NestJS API):   $back"
    Write-Host "ADK Agent (Brain):      $agent"
    Write-Host "TRIZ MCP Server (Tools): $mcp"
    Write-Host "==========================================================" -ForegroundColor Green
}

if ($Cleanup) {
    Write-Host "--- Cleaning Up Deployed Resources (Deleting everything) ---" -ForegroundColor Red
    & $gcloud run services delete buildwithai-frontend --region=$Region --quiet
    & $gcloud run services delete buildwithai-backend --region=$Region --quiet
    & $gcloud run services delete triz-adk-agent --region=$Region --quiet
    & $gcloud run services delete triz-mcp-server --region=$Region --quiet
    & $gcloud sql instances delete $DbInstance --quiet
    & $gcloud artifacts repositories delete $Registry --location=$Region --quiet
    Write-Host "Takedown completed!" -ForegroundColor Green
}
