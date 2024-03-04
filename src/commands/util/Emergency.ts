import type {
    ChatInputCommandInteraction,
    User,
    Snowflake,
    TextBasedChannel,
    MessageCreateOptions, UserContextMenuCommandInteraction
} from 'discord.js';
import { MultipleInteractionCommand } from '#structures/types/Command';
import { AliasPiece, Command, CommandOptions } from '@sapphire/framework';
import InteractionUtil from '#root/util/InteractionUtil';
import type SettingsRepository from '#structures/repositories/SettingsRepository';
import { SettingField } from '#structures/repositories/SettingsRepository';
import Database from '#root/setup/Database';
import { Settings } from '#structures/entities/Settings';
import type { GuildMessage } from '#structures/types/Message';
import {
    ApplicationCommandType,
    MessageContextMenuCommandInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { CooldownManager } from '#structures/managers/CooldownManager';
import { MINUTE } from '#root/util/DateTime';

type EmergencyReasonKey = 'hate' | 'spam' | 'nsfw' | 'voice';

const EMERGENCY_REASONS: Record<EmergencyReasonKey, string> = {
    'hate': 'Racism/Hate Speech',
    'spam': 'Excessive Spam',
    'nsfw': 'NSFW Profile/Text',
    'voice': 'Voice Chat Violations',
};

const COOLDOWN_KEY = 'command_emergency';
const COOLDOWN_DURATION = MINUTE;

export default class extends Command {
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
        const messageLink = interaction.options.getString('message-link');
        const matches = messageLink ? messageLink.match(messageLinkRegex) : null;
        const { channelId, messageId } = matches ? matches.groups! : { channelId: null, messageId: null };

        if (messageLink && (!channelId || !messageId)) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'The message link you entered does not seem to be valid.',
            }, true);

            return;
        }

        const channel = channelId
            ? guild.channels.cache.get(channelId) as TextBasedChannel | undefined
            : interaction.channel as TextBasedChannel;
        const message = messageId ? (await channel?.messages.fetch(messageId).catch(() => null)) as GuildMessage : null;

        if (messageLink && (!channel || !message || !message?.guild)) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'The message seems to have been deleted.',
            }, true);

            return;
        }

        const user = interaction.options.getUser('user') ?? message?.author;

        return this.doRun(interaction, interaction.options.getString('reason', true), user, message);
    }

    public override async contextMenuRun(
        interaction: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction
    ): Promise<void> {
        const messageInteraction = interaction as MessageContextMenuCommandInteraction;
        const userInteraction = interaction as UserContextMenuCommandInteraction;

        const message = messageInteraction.targetMessage ? messageInteraction.targetMessage as GuildMessage : null;
        const user = message ? message.author : userInteraction.targetUser;
        const dropdown = new StringSelectMenuBuilder()
            .setCustomId(`emergency-${user.id}-dropdown-${Date.now()}`)
            .setPlaceholder('Select a reason')
            .setOptions(Object.keys(EMERGENCY_REASONS).map((key: string) => {
                return new StringSelectMenuOptionBuilder()
                    .setLabel(key)
                    .setValue(key)
                    .setDescription(EMERGENCY_REASONS[key as EmergencyReasonKey]);
            }));
        const { responsePromise } = await InteractionUtil.askForSelection(
            interaction,
            { content: 'Please select an emergency reason:', ephemeral: true },
            dropdown,
            { timeoutIsReject: false }
        );
        const reasonArray = await responsePromise;
        const reason = reasonArray.length > 0 ? reasonArray[0] : 'other';

        return this.doRun(interaction, reason, user, message);
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(command =>
            command
                .setName('emergency')
                .setDescription('For situations that require the urgent attendance of moderators')
                .setDMPermission(false)
                .addStringOption(option => option
                    .setName('reason')
                    .setDescription('The reason for pinging all the moderators')
                    .setRequired(true)
                    .setChoices(
                        ...Object.keys(EMERGENCY_REASONS).map((key: string) => {
                            return { name: EMERGENCY_REASONS[key as EmergencyReasonKey], value: key };
                        }),
                        {
                            name: 'Other',
                            value: 'other',
                        }
                    )
                )
                .addUserOption(option => option
                    .setName('user')
                    .setDescription('The member you are reporting, in case you are not reporting a message')
                    .setRequired(false)
                )
                .addStringOption(option => option
                    .setName('message-link')
                    .setDescription(`You can input a message link instead of a user, if it's more relevant`)
                    .setRequired(false)
                )
        );

        registry.registerContextMenuCommand(command =>
            command
                .setName('emergency')
                .setDMPermission(false)
                .setType(ApplicationCommandType.Message)
        );

        registry.registerContextMenuCommand(command =>
            command
                .setName('emergency')
                .setDMPermission(false)
                .setType(ApplicationCommandType.User)
        );
    }

    private async doRun(
        interaction: MultipleInteractionCommand,
        reason: string,
        user: User | undefined,
        message: GuildMessage | null
    ): Promise<void> {
        const { guild } = interaction;
        const vcModeratorRoleId = await this.settingsRepository.getGuildSetting(guild!.id, SettingField.VCModRole);
        const emergencyRoleId = await this.settingsRepository.getGuildSetting(guild!.id, SettingField.EmergencyRole);
        const reasonRoleMap: Record<EmergencyReasonKey, Snowflake> = {
            'hate': emergencyRoleId!,
            'spam': emergencyRoleId!,
            'nsfw': emergencyRoleId!,
            'voice': vcModeratorRoleId!,
        };

        return reason in reasonRoleMap
            ? this.pingEmergency(interaction, reason, user, reasonRoleMap[reason as EmergencyReasonKey], message)
            : this.encourageModmailDM(interaction, user, message);
    }

    private async pingEmergency(
        interaction: MultipleInteractionCommand,
        reason: string,
        user: User | undefined,
        emergencyRoleId: Snowflake,
        message: GuildMessage | null
    ): Promise<void> {
        const cooldownManager = new CooldownManager();

        if (cooldownManager.isOnCooldown(COOLDOWN_KEY)) {
            await InteractionUtil.reply(interaction, {
                title: 'On cooldown',
                description: `The emergency command was used very recently. Please do not try to ping multiple times for the same problem.`,
            }, true);

            return;
        }

        cooldownManager.setCooldown(COOLDOWN_KEY, COOLDOWN_DURATION);

        const { guild } = interaction;
        const pinger = interaction.user;
        const userName = user ? `${user}, ${user.tag}, ${user.id}` : null;
        const banCommand = `\`?ban ${user ? user.id : 'userid'} ${reason}\``;
        const emergencyChannelId = await this.settingsRepository.getGuildSetting(
            guild!.id,
            SettingField.EmergencyChannel
        );
        const emergencyChannel = guild!.channels.cache.get(emergencyChannelId!) as TextBasedChannel;
        const emergencyInfoMessage: MessageCreateOptions = {
            content: `**🚨 The emergency command was used by: ${pinger} (${pinger.tag}, ${pinger.id})**` +
                `\n**Reason:** ${EMERGENCY_REASONS[reason as EmergencyReasonKey]}` +
                (user ? `\n**Reported user:** ${userName}` : '') +
                `\n**Channel:** <#${interaction.channel!.id}>` +
                (message ? `\n**Reported message:** ${message.url}` : '') +
                `\n\n**Suggested ban command:** ${banCommand}`,
        };

        if (message) {
            emergencyInfoMessage.reply = { messageReference: message, failIfNotExists: false };
        }

        emergencyInfoMessage.content = `<@&${emergencyRoleId}>\n${emergencyInfoMessage.content}`;

        const emergencyMessage = await interaction.channel!.send(emergencyInfoMessage);
        const emergencyInfoMessageLines = emergencyInfoMessage.content.split('\n');

        delete emergencyInfoMessage.reply;

        emergencyInfoMessageLines.shift();
        emergencyInfoMessageLines.unshift(emergencyMessage.url);
        emergencyInfoMessage.content = emergencyInfoMessageLines.join('\n');

        await emergencyChannel.send(emergencyInfoMessage);

        await InteractionUtil.reply(interaction, {
            title: 'Emergency team pinged',
            description: `Thank you for your report. The emergency team was just pinged and will intervene as soon as possible.`,
        });
    }

    private async encourageModmailDM(
        interaction: MultipleInteractionCommand,
        user: User | undefined,
        message: GuildMessage | null
    ): Promise<void> {
        const userName = user ? `${user.tag}, ${user.id}` : null;
        let emergencyInfoMessage = `\`\`\`md\nHello. I would like to report a user.\n` +
            `**Reason:** [Explain the reason of your report here]\n` +
            (user ? `**Reported user:** ${userName}` : '');
        const modmailBotId = await this.settingsRepository.getGuildSetting(
            interaction.guild!.id,
            SettingField.ModmailBot
        );
        const modmailMention = modmailBotId ? `<@${modmailBotId}>` : `Modmail`;

        if (message) {
            emergencyInfoMessage = `${emergencyInfoMessage}\n**Reported message:** ${message.url}`;
        }

        emergencyInfoMessage += '```';

        await InteractionUtil.reply(interaction, {
            title: `Please report this using Modmail`,
            description: `We take reports very seriously. Please send us this report through the ${modmailMention} bot.\n` +
                `To do so, simply send a direct message to the bot like you would any other user.\n` +
                `Make sure to include this information with your report:\n\n${emergencyInfoMessage}`,
        });
    }
}
