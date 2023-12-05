import SettingsRepository, { SettingField } from '#structures/repositories/SettingsRepository';
import Database from '#root/setup/Database';
import { Settings } from '#structures/entities/Settings';
import type WhitelistedUserRepository from '#structures/repositories/WhitelistedUserRepository';
import { WhitelistedUser } from '#structures/entities/WhitelistedUser';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, ListenerOptions } from '@sapphire/framework';
import { Events, GuildMember } from 'discord.js';
import Logger from '@lilywonhalf/pretty-logger';

@ApplyOptions<ListenerOptions>({
    event: Events.GuildMemberAdd,
})
export default class extends Listener {
    private settingsRepository: SettingsRepository;
    private whitelistedUserRepository: WhitelistedUserRepository;

    public constructor(context: Listener.Context, options?: ListenerOptions) {
        super(context, options);

        this.settingsRepository = new Database().em.getRepository(Settings);
        this.whitelistedUserRepository = new Database().em.getRepository(WhitelistedUser);
    }

    public async run(member: GuildMember): Promise<void> {
        const { guild: { id: guildId }, id: userId } = member;
        const isWhitelistEnabled = (await this.settingsRepository.getGuildSetting(
            guildId,
            SettingField.WhitelistEnabled
        )) ?? false;

        if (!isWhitelistEnabled) {
            return;
        }

        const isWhitelisted = await this.whitelistedUserRepository.findOne({ userId, guildId });

        if (isWhitelisted) {
            Logger.info(`${member.user.tag} (${member.id}) is whitelisted.`);
            Logger.debug(isWhitelisted);

            return;
        }

        Logger.info(`${member.user.tag} (${member.id}) is not whitelisted, kicking.`);
        await member.kick('Member is not whitelisted.').catch(Logger.error);
    }
}
