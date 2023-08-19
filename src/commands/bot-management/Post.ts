import { ChatInputCommandInteraction, GuildBasedChannel } from 'discord.js';
import Logger from '@lilywonhalf/pretty-logger';
import { Command } from '@sapphire/framework';
import EmbedBuilder from '#structures/EmbedBuilder';

export default class extends Command {
    public override async chatInputRun(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        if (interaction.user.id !== process.env.OWNER) {
            const embed = new EmbedBuilder(true)
                .setTitle('Unauthorized')
                .setDescription('You do not have the right to execute this command.');

            await interaction.editReply({ embeds: [embed] });

            return;
        }

        const guild = interaction.guild!;
        let replyTo = interaction.options.getString('reply-to');
        let channel: GuildBasedChannel | null = null;

        if (replyTo && !/\d{16,18}(-\d{16,18})?/u.test(replyTo)) {
            await this.sendInvalidMessageIdError(interaction);

            return;
        } else if (replyTo && /\d{16,18}-\d{16,18}/u.test(replyTo)) {
            const [channelId, messageId] = replyTo.split('-');

            if (!guild.channels.cache.has(channelId) || !guild.channels.cache.get(channelId)!.isTextBased()) {
                await this.sendInvalidMessageIdError(interaction);

                return;
            }

            replyTo = messageId;
            channel = guild.channels.cache.get(channelId)!;
        }

        if (!channel) {
            channel = (interaction.options.getChannel('channel') ?? interaction.channel) as GuildBasedChannel | null;
        }

        const repliedMessage = channel?.isTextBased() && replyTo
            ? await channel.messages.fetch(replyTo).catch(() => null)
            : null;
        const message = interaction.options.getString('message', true);

        if (!channel || !channel.isTextBased()) {
            const embed = new EmbedBuilder(true)
                .setTitle('Invalid channel')
                .setDescription('You have to specify a text-based channel');

            await interaction.editReply({ embeds: [embed] });

            return;
        }

        if (replyTo && !repliedMessage) {
            await this.sendInvalidMessageIdError(interaction);

            return;
        }

        try {
            if (repliedMessage) {
                await repliedMessage.reply(message);
            } else {
                await channel.send(message)
            }
        } catch (error) {
            Logger.exception(error as Error);
            const embed = new EmbedBuilder(true)
                .setTitle('Error')
                .setDescription(`The message could not be posted: ${error}`);

            await interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('Posted')
            .setDescription('The message has been posted');

        await interaction.editReply({ embeds: [embed] });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(command =>
            command
                .setName('post')
                .setDefaultMemberPermissions(0)
                .setDMPermission(false)
                .setDescription('You can make me post messages in a text chat!')
                .addStringOption(builder => builder
                    .setName('message')
                    .setDescription('The message you want me to post')
                    .setRequired(true)
                )
                .addChannelOption(builder => builder
                    .setName('channel')
                    .setDescription('The channel in which to post the message')
                )
                .addStringOption(builder => builder
                    .setName('reply-to')
                    .setDescription('The message ID to reply to')
                )
        );
    }

    private async sendInvalidMessageIdError(interaction: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder(true)
            .setTitle('Invalid message ID')
            .setDescription('The message ID you specified for the reply option is invalid');

        await interaction.editReply({ embeds: [embed] });
    }
}
