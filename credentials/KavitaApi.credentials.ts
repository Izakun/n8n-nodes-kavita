import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class KavitaApi implements ICredentialType {
	name = 'kavitaApi';

	displayName = 'Kavita API';

	icon = 'file:kavitaApi.svg' as const;

	documentationUrl = 'https://wiki.kavitareader.com/guides/misc/api';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://kavita:5000',
			required: true,
			description: 'Base URL of the Kavita server (e.g. http://kavita:5000). No trailing slash.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Kavita API key (User settings → 3rd Party Clients → API Key)',
		},
	];
}
