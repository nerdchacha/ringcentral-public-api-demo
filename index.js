import { config } from 'dotenv';
import { SDK } from '@ringcentral/sdk';
import { Subscriptions } from '@ringcentral/subscriptions';
config();

const { CLIENT_ID, CLIENT_SECRET, USERNAME, PASSWORD, SERVER_URL } = process.env;

const sdk = new SDK({
	server: SERVER_URL,
	clientId: CLIENT_ID,
	clientSecret: CLIENT_SECRET,
});

sdk.login({ username: USERNAME, password: PASSWORD });
const platform = sdk.platform();

platform.on(platform.events.loginError, (e) => {
	console.log(`Failed to login: ${e.message}`);
});

platform.on(platform.events.loginSuccess, runApp);

async function runApp() {
	const allExtensionRsponse = await platform.get('/restapi/v1.0/account/~/extension');
	const json = await allExtensionRsponse.json();
	const eventFilters = json.records.map(({ id }) => `/restapi/v1.0/account/~/extension/${id}/voicemail`);
	const subscriptions = new Subscriptions({ sdk });
	const subscription = subscriptions.createSubscription();
	subscription.on(subscription.events.notification, (message) => {
		if (message.body.readStatus !== 'Unread') {
			return;
		}
		const card = {
			type: 'AdaptiveCard',
			$schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
			version: '1.3',
			body: [
				{
					type: 'TextBlock',
					size: 'Medium',
					weight: 'Bolder',
					text: 'New voicemail',
					wrap: true,
				},
				{
					type: 'TextBlock',
					text: `A new voice mail for extension ${message.body.to[0].extensionNumber} has been generated`,
					wrap: true,
				},
			],
		};
		platform.post('/restapi/v1.0/glip/chats/85094531078/adaptive-cards', card);
	});
	await subscription.setEventFilters(eventFilters).register();
}
