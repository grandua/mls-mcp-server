#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const API_URL = 'https://api-demo.mlsgrid.com/v2/Property';
const API_TOKEN = 'c277cd055de42b4405c9d70a65f5e25aa116670f';

class MLSServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mls-grid-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_listings',
          description: 'Get 2 sample property listings from MLS Grid',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'get_listings') {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      try {
        const response = await axios.get(API_URL, {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Accept': 'application/json',
          },
          params: {
            '$top': 2
          }
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data.value, null, 2),
            },
          ],
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `MLS Grid API error: ${error.response?.data?.message || error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MLS Grid MCP server running on stdio');
  }
}

const server = new MLSServer();
server.run().catch(console.error);
