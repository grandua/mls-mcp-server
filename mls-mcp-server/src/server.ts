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
  propertyTypeFilter?: string;
}

interface Listing {
  PropertyType: string;
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
          description: `Fetches MLS listings using OData filter syntax.

OData Filter Examples:
- Single type: 'PropertyType eq \"Residential\"'
- Multiple types: 'PropertyType eq \"Residential\" or PropertyType eq \"Condo\"'
- Excluding types: 'PropertyType ne \"Land\"'

Note: Always use proper OData syntax including quotes for string values and proper spacing around operators.`,
          inputSchema: {
            type: 'object',
            properties: {
              propertyTypeFilter: {
                type: 'string',
                description: 'OData $filter expression for PropertyType (e.g. "PropertyType eq \"Residential\"")'
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

      if (input?.propertyTypeFilter 
        && typeof input.propertyTypeFilter === 'string' 
        && input.propertyTypeFilter.trim() !== '') {
        const filter = input.propertyTypeFilter.trim();
        if (!filter.startsWith('PropertyType')) {
          params['$filter'] = `PropertyType ${filter}`;
        } else {
          params['$filter'] = filter;
        }
      }

      try {
        const config = {
          method: 'get',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Accept': 'application/json',
          },
          params: params
        };

        const fullUrl = `${API_URL}?${new URLSearchParams(params).toString()}`;
        const response = await axios.get(API_URL, config);

        return {
          content: [
            {
              type: 'text',
              text: `API Request URL: ${fullUrl}\n\n${JSON.stringify(response.data.value, null, 2)}`,
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
