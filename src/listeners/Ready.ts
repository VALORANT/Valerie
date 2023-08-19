import Logger from '@lilywonhalf/pretty-logger';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, ListenerOptions } from '@sapphire/framework';
import { Events } from 'discord.js';

@ApplyOptions<ListenerOptions>({
    event: Events.ClientReady,
})
export default class extends Listener {
    public run(): void {
        const { client } = this.container;
        const nbGuilds = client.guilds.cache.size;

        Logger.info(`Logged in as ${client.user!.username}#${client.user!.discriminator}`);
        Logger.info(`Serving in ${nbGuilds} guild${nbGuilds > 1 ? 's' : ''}`);
    }
}
