@echo off

docker rm -f mls-mcp-server-instance
docker run -p 3000:3000 --name mls-mcp-server-instance mls-mcp-server