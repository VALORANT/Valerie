import type Listener from '../Listener';
import SettingsRepository, { SettingField } from '#structures/repositories/SettingsRepository';
import Database from '#root/setup/Database';
import { Settings } from '#structures/entities/Settings';
import type { MessageReaction, User } from 'discord.js';
import EmbedBuilder from '#structures/EmbedBuilder';
import type ModTaskRepository from '#structures/repositories/ModTaskRepository';
import { ModTask } from '#structures/entities/ModTask';

export default class MessageReactionAdd implements Listener {
    private settingsRepository: SettingsRepository;
    private modTaskRepository: ModTaskRepository;

    public constructor() {
        this.settingsRepository = new Database().em.getRepository(Settings);
        this.modTaskRepository = new Database().em.getRepository(ModTask);
    }

    public async run(messageReaction: MessageReaction, user: User): Promise<void> {
        if (messageReaction.partial) {
            await messageReaction.fetch();
        }

        const { client, message } = messageReaction;
        const isInGuild = message?.guildId && client.guilds.cache.has(message?.guildId);
        const shouldListen = !user.bot && message.author?.id === client.user.id

        if (!shouldListen || !isInGuild) {
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
        await this.modTaskRepository.updateTriggerByMessageId(message.id);

        if (logsChannel && logsChannel.isTextBased() && taskEmbed) {
            await logsChannel.send({ embeds: [
                new EmbedBuilder()
                    .setTitle(`${taskEmbed.title} completed!`)
                    .setDescription(`**Task:** ${taskEmbed.description}\n\n**Completed by:** ${user.tag} ${user}`),
            ] });
        }
    }
}
