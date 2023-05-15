import type Listener from '../Listener';
import SettingsRepository, { SettingField } from '#structures/repositories/SettingsRepository';
import Database from '#root/setup/Database';
import { Settings } from '#structures/entities/Settings';
import type { MessageReaction, User } from 'discord.js';
import EmbedBuilder from '#structures/EmbedBuilder';

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
        const guild = client.guilds.cache.get(guildId!)!;
        const channelId = await this.settingsRepository.getGuildSetting(guild.id, SettingField.ModTasksChannel);
        const channel = channelId ? guild.channels.cache.get(channelId) : null;
        const rightEmoji = messageReaction.emoji.name && ['Check', '✅'].includes(messageReaction.emoji.name);

        if (!channel || message.channelId !== channelId || !rightEmoji) {
            return;
        }

        const logsChannelId = await this.settingsRepository.getGuildSetting(guild.id, SettingField.LogsChannel);
        const logsChannel = logsChannelId ? guild.channels.cache.get(logsChannelId) : null;
        const [taskEmbed] = message.embeds;

        await message.delete();

        if (logsChannel && logsChannel.isTextBased() && taskEmbed) {
            await logsChannel.send({ embeds: [
                new EmbedBuilder()
                    .setTitle(`${taskEmbed.title} completed!`)
                    .setDescription(`**Task:** ${taskEmbed.description}\n\n**Completed by:** ${user.tag} ${user}`),
            ] });
        }
    }
}
