import Database from '#root/setup/Database';
import type WhitelistedUserRepository from '#structures/repositories/WhitelistedUserRepository';
import { WhitelistedUser } from '#structures/entities/WhitelistedUser';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, ListenerOptions } from '@sapphire/framework';
import { Events, GuildMember } from 'discord.js';

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

        await this.whitelistedUserRepository.nativeDelete({ userId, guildId });
    }
}
