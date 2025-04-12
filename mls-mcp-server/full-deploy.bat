@echo off

:: Full deployment workflow for initial setup or config changes
call copy-flowise.cmd
call build-mcp.bat
call build-docker.bat
call push-to-aws.bat

:: Only uncomment below for INITIAL DEPLOYMENT or CONFIG CHANGES
:: call deploy-aws.bat

echo Docker image pushed to AWS. Uncomment deploy-aws.bat if service needs creation/config update.
