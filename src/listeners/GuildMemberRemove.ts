import Database from '#root/setup/Database';
import type WhitelistedUserRepository from '#structures/repositories/WhitelistedUserRepository';
import { WhitelistedUser } from '#structures/entities/WhitelistedUser';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, ListenerOptions } from '@sapphire/framework';
import { Events, GuildMember } from 'discord.js';
import Logger from '@lilywonhalf/pretty-logger';

@ApplyOptions<ListenerOptions>({
    event: Events.GuildMemberRemove,
})
export default class extends Listener {
    private whitelistedUserRepository: WhitelistedUserRepository;

    public constructor(context: Listener.Context, options?: ListenerOptions) {
        super(context, options);

        this.whitelistedUserRepository = new Database().em.getRepository(WhitelistedUser);
    }

    public async run(member: GuildMember): Promise<void> {
        const { guild: { id: guildId }, id: userId } = member;

        const whitelistedUser = await this.whitelistedUserRepository.findOne({ userId, guildId });

        if (!whitelistedUser) {
            return;
        }

        Logger.info(`${member.user.tag} (${member.id}) was removed from the whitelist.`);
        await this.whitelistedUserRepository.getEntityManager().removeAndFlush(whitelistedUser);
    }
}
