import type Listener from '../Listener';
import SettingsRepository, { SettingField } from '#structures/repositories/SettingsRepository';
import Database from '#root/setup/Database';
import { Settings } from '#structures/entities/Settings';
import type { MessageReaction, User } from 'discord.js';

export default class MessageReactionAdd implements Listener {
    private settingsRepository: SettingsRepository;

    public constructor() {
        this.settingsRepository = new Database().em.getRepository(Settings);
    }

    public async run(messageReaction: MessageReaction, user: User): Promise<void> {
        const { client, message } = messageReaction;

        if (user.id === client.user.id || !message?.guildId || !client.guilds.cache.has(message?.guildId)) {
            return;
        }

        const { guildId } = messageReaction.message;
        const channelId = await this.settingsRepository.getGuildSetting(guildId!, SettingField.ModTasksChannel);
        const channel = channelId ? client.guilds.cache.get(guildId!)!.channels.cache.get(channelId) : null;
        const rightEmoji = messageReaction.emoji.name && ['Check', '✅'].includes(messageReaction.emoji.name);

        if (!channel || message.channelId !== channelId || !rightEmoji) {
            return;
        }

        await message.delete();
    }
}
