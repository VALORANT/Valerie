import type { ChatInputCommandInteraction, TextBasedChannel } from 'discord.js';
import { ApplicationCommandType } from 'discord.js';
import type { MessageContextMenuCommandInteraction } from 'discord.js';
import { Command } from '@sapphire/framework';
import type { MultipleInteractionCommand } from '#structures/types/Command';
import InteractionUtil from '#root/util/InteractionUtil';
import EmbedBuilder from '#structures/EmbedBuilder';
import { SettingField } from '#structures/repositories/SettingsRepository';
import type SettingsRepository from '#structures/repositories/SettingsRepository';
import Database from '#root/setup/Database';
import { Settings } from '#structures/entities/Settings';
import type { GuildMessage } from '#structures/types/Message';
import { AliasPiece, CommandOptions } from '@sapphire/framework';

export default class NudgeCommand extends Command {
    private settingsRepository: SettingsRepository;

    public constructor(context: AliasPiece.Context, options: CommandOptions) {
        super(context, options);

        this.settingsRepository = new Database().em.getRepository(Settings);
    }

    public override async chatInputRun(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        // eslint-disable-next-line max-len
        const messageLinkRegex = /^https:\/\/(?:[^.]+\.)?discord.com\/channels\/\d{16,19}\/(?<channelId>\d{16,19})\/(?<messageId>\d{16,19})$/iu;
        const guild = interaction.guild!;
        const messageLink = interaction.options.getString('message-link', true);
        const matches = messageLink.match(messageLinkRegex);
        const { channelId, messageId } = matches ? matches.groups! : { channelId: null, messageId: null };

        if (!channelId || !messageId) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'The message link you entered does not seem to be valid.',
            }, true);

            return;
        }

        const channel = guild.channels.cache.get(channelId) as TextBasedChannel | undefined;
        const message = (await channel?.messages.fetch(messageId).catch(() => null)) as GuildMessage;

        if (!channelId || !messageId || !message?.guild) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'The message seems to have been deleted.',
            }, true);

            return;
        }

        return this.doRun(interaction, message);
    }

    public override contextMenuRun(interaction: MessageContextMenuCommandInteraction): Promise<void> {
        return this.doRun(interaction, interaction.targetMessage as GuildMessage);
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(command =>
            command
                .setName('nudge')
                .setDescription('To give a reminder of the rules to a member in case they sent a message that infringes them')
                .setDMPermission(false)
                .setDefaultMemberPermissions(0)
                .addStringOption(option => option
                    .setName('message-link')
                    .setDescription('The link to the message that infringes the rules')
                    .setRequired(true)
                )
        );

        registry.registerContextMenuCommand(command =>
            command
                .setName('nudge')
                .setDMPermission(false)
                .setDefaultMemberPermissions(0)
                .setType(ApplicationCommandType.Message)
        );
    }

    private async doRun(interaction: MultipleInteractionCommand, message: GuildMessage): Promise<void> {
        const { guild, url: messageLink } = message;
        const user = message.author;
        const member = await guild.members.fetch(user.id).catch(() => null);
        const logsChannelId = await this.settingsRepository.getGuildSetting(guild.id, SettingField.LogsChannel);
        const logsChannel = logsChannelId ? guild.channels.cache.get(logsChannelId) : null;
        const moderationRoleId = await this.settingsRepository.getGuildSetting(guild.id, SettingField.EmergencyRole);
        const moderationRole = moderationRoleId ? guild.roles.cache.get(moderationRoleId) : null;
        const authorIcon = moderationRole && moderationRole.iconURL() ? moderationRole.iconURL() : guild.iconURL();
        const embed = new EmbedBuilder()
            .setAuthor({ iconURL: authorIcon ?? undefined, name: `The ${guild.name} moderation team` })
            .setDescription(`
                **A message you posted in the ${guild.name} server has caught the attention of moderators.**

                While this is not a violation, please be mindful of our rules and help us in keeping this community safe and welcome!

                [Click here to go to your message.](${messageLink})
            `)
            .setColor(0xff4655);

        if (!member) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'The member who posted the message does not seem to be on the server anymore.',
            }, true);

            return;
        }

        await member.send({ embeds: [embed] }).then(async () => {
            await InteractionUtil.reply(interaction, {
                title: `Success`,
                description: `The nudge has been sent to the user in DMs.`,
            });

            if (logsChannel && logsChannel.isTextBased()) {
                await logsChannel.send({ embeds: [
                    new EmbedBuilder()
                        .setTitle(`Nudge sent`)
                        .setDescription(`
                            **Moderator:** ${interaction.user.tag} ${interaction.user}
                            **Member:** ${member.user.tag} ${member}
                            **Message:** ${messageLink}
                        `),
                ] });
            }
        }).catch(() => {
            return InteractionUtil.reply(interaction, {
                title: `Error`,
                description: `The nudge could not be sent to the member. They probably do not accept DMs.`,
            }, true);
        });
    }
}
