#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

//demo: const API_URL = 'https://api-demo.mlsgrid.com/v2/Property';
const API_URL = 'https://api.mlsgrid.com/v2/Property';
//demo: const API_TOKEN = 'c277cd055de42b4405c9d70a65f5e25aa116670f';
const API_TOKEN = '9123d075cd1b5d9d063c9083156efb112cf913b6';

interface ListingRequest {
  priceFilter?: string;
}

interface Listing {
  ListPrice: number;
  [key: string]: any;
}

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
          description: `Fetches MLS listings with optional price filtering. \n                 LLM Instructions: Use OData syntax for filters. \n                 Examples: \n                 - 'ListPrice gt 500000' (homes over $500K)\n                 - 'ListPrice lt 300000' (homes under $300K)\n                 - 'ListPrice gt 200000 and ListPrice lt 400000' (between $200K-$400K)`,
          inputSchema: {
            type: 'object',
            properties: {
              priceFilter: {
                type: 'string',
                description: 'OData filter expression for ListPrice (e.g. "ListPrice gt 500000")'
              }
            },
            required: [],
            additionalProperties: true
          },
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'get_listings') {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      const input = request.params.arguments as ListingRequest;
      const params: any = { $top: 10 };

      try {
        const config = {
          method: 'get',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Accept': 'application/json',
          },
          params: params
        };

        const response = await axios.get(API_URL, config);
        let filteredData = response.data.value;
        if (input?.priceFilter) {
          const match = input.priceFilter.match(/ListPrice\s*(lt|gt)\s*(\d+)/);
          if (match) {
            const [_, operator, value] = match;
            const price = parseInt(value, 10);
            filteredData = filteredData.filter((listing: Listing) => {
              if (operator === 'lt') {
                return listing.ListPrice < price;
              } else {
                return listing.ListPrice > price;
              }
            });
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filteredData, null, 2),
            },
          ],
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `MLS Grid API error:\nStatus: ${error.response?.status}\nHeaders: ${JSON.stringify(error.response?.headers)}\nData: ${JSON.stringify(error.response?.data)}\nConfig: ${JSON.stringify(error.config)}`,
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
