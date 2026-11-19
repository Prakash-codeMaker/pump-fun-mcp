# pump-fun-mcp has no dependencies, so the image is just Node plus the source.
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY bin ./bin
COPY lib ./lib

# The server speaks MCP over stdio, so it must stay attached to stdin.
ENTRYPOINT ["node", "bin/pump-fun-mcp.js"]
