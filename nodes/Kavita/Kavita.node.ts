import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

export class Kavita implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kavita',
		name: 'kavita',
		icon: { light: 'file:kavita.svg', dark: 'file:kavita.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Query a Kavita comics/manga server through its API',
		defaults: { name: 'Kavita' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'kavitaApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Get Libraries', value: 'getLibraries', action: 'Get the libraries' },
					{ name: 'Get Server Info', value: 'getServerInfo', action: 'Get the server info' },
					{ name: 'Search', value: 'search', action: 'Search the library' },
				],
				default: 'search',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['search'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('kavitaApi', i);
				const baseURL = (credentials.baseUrl as string).replace(/\/+$/, '');
				const operation = this.getNodeParameter('operation', i) as string;

				// Step 1: exchange the API key for a JWT.
				const auth = (await this.helpers.httpRequestWithAuthentication.call(this, 'kavitaApi', {
					method: 'POST' as IHttpRequestMethods,
					baseURL,
					url: '/api/Plugin/authenticate',
					qs: { apiKey: credentials.apiKey, pluginName: 'n8n' },
					json: true,
				} as IHttpRequestOptions)) as IDataObject;

				const jwt = auth.token as string;
				if (!jwt) {
					throw new NodeOperationError(this.getNode(), 'Kavita authentication did not return a token', {
						itemIndex: i,
					});
				}

				const call = (url: string, qs?: IDataObject) =>
					this.helpers.httpRequestWithAuthentication.call(this, 'kavitaApi', {
						method: 'GET' as IHttpRequestMethods,
						baseURL,
						url,
						qs,
						headers: { Authorization: `Bearer ${jwt}` },
						json: true,
					} as IHttpRequestOptions);

				const handlers: Record<string, () => Promise<unknown>> = {
					getLibraries: () => call('/api/Library/libraries'),
					getServerInfo: () => call('/api/Server/server-info'),
					search: () => call('/api/Search/search', { queryString: this.getNodeParameter('query', i) }),
				};

				const handler = handlers[operation];
				if (!handler) {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				const response = await handler();
				if (Array.isArray(response)) {
					for (const element of response) {
						returnData.push({ json: element as IDataObject, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
