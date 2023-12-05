import { randomUUID } from 'crypto';
import type {
    Interaction,
    RepliableInteraction,
    StringSelectMenuInteraction,
    MessageComponentInteraction,
    CommandInteraction,
    ContextMenuCommandInteraction,
    InteractionResponse,
    MessageCreateOptions,
    Message,
    APIEmbed,
    EmbedData,
    MessageEditOptions,
    ComponentEmojiResolvable, SlashCommandStringOption
} from 'discord.js';
import EmbedBuilder from '#structures/EmbedBuilder';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildTextBasedChannel,
    InteractionReplyOptions,
    MessageActionRowComponentBuilder,
    StringSelectMenuBuilder
} from 'discord.js';
import Logger from '@lilywonhalf/pretty-logger';
import { humanizeTimeAmount, MINUTE, SECOND } from '#root/util/DateTime';
import { MultipleInteractionCommand } from '#structures/types/Command';

export default class InteractionUtil {
    public static reply(
        interaction: RepliableInteraction,
        embedData: EmbedData | APIEmbed,
        error = false,
        ephemeral = true,
        components = []
    ): Promise<InteractionResponse | Message> {
        const options = { content: '', embeds: [new EmbedBuilder(error, embedData)], components };

        return interaction.replied || interaction.deferred
            ? interaction.editReply(options)
            : interaction.reply({ ...options, ephemeral });
    }

    public static formatInteractionForLog(interaction: Interaction): any {
        const commandInteraction = interaction as CommandInteraction;
        const selectMenuInteraction = interaction as StringSelectMenuInteraction;
        const messageComponentInteraction = interaction as MessageComponentInteraction;
        const contextMenuCommandInteraction = interaction as ContextMenuCommandInteraction;

        return {
            type: interaction.type,
            user: {
                id: interaction.user.id,
                tag: interaction.user.tag,
            },
            name: commandInteraction.commandName ?? messageComponentInteraction.customId,
            options: commandInteraction.options?.data
                ?? selectMenuInteraction.values
                ?? contextMenuCommandInteraction.targetId
                ?? null,
        };
    }

    public static async confirm(
        channel: GuildTextBasedChannel,
        toPost: MessageCreateOptions | MessageEditOptions,
        options?: WaitForConfirmOptions
    ): Promise<{ message: Message, responsePromise: Promise<boolean>}> {
        const id = `${channel.guild.id}-${Date.now()}`;
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
            new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel(options?.confirmText || 'Confirm')
                .setEmoji(options?.confirmEmoji ?? '')
                .setCustomId(`confirmButton:${id}:${randomUUID()}`),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setLabel(options?.cancelText || 'Cancel')
                .setEmoji(options?.cancelEmoji ?? '')
                .setCustomId(`cancelButton:${id}:${randomUUID()}`),
        ]);

        const message = options?.messageToEdit
            ? await options.messageToEdit.edit({ ...toPost as MessageEditOptions, components: [row] })
            : await channel.send({ ...toPost as MessageCreateOptions, components: [row] });
        const time = Math.min(options?.waitTime ?? 30 * SECOND, 14 * MINUTE);
        const collector = message.createMessageComponentCollector({ time });

        const responsePromise: Promise<boolean> = new Promise((resolve, reject) => {
            collector.on('collect', (interaction: MessageComponentInteraction) => {
                if (options?.restrictToId && options.restrictToId !== interaction.user.id) {
                    interaction
                        .reply({ content: `You are not permitted to use these buttons.`, ephemeral: true })
                        .catch(Logger.error);
                } else {
                    if (interaction.customId.startsWith(`confirmButton:${id}:`)) {
                        message.delete();
                        resolve(true);
                    } else if (interaction.customId.startsWith(`cancelButton:${id}:`)) {
                        message.delete();
                        resolve(false);
                    }
                }
            });

            collector.on('end', () => {
                if (message.deletable) {
                    message.delete().catch(() => {
                    });
                }

                if (options?.timeoutIsReject) {
                    reject(
                        new Error(`No response after ${humanizeTimeAmount(time)}`)
                    );
                } else {
                    resolve(false);
                }
            });
        });

        return { message, responsePromise };
    }

    public static async askForSelection(
        interaction: MultipleInteractionCommand,
        toPost: Omit<InteractionReplyOptions, 'components'>,
        select: StringSelectMenuBuilder,
        options?: WaitForOptions
    ): Promise<{ message: Message, responsePromise: Promise<string[]>}> {
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(select);
        const message = await interaction.reply({ ...toPost, components: [row], fetchReply: true });
        const time = Math.min(options?.waitTime ?? 30 * SECOND, 14 * MINUTE);
        const collector = message.createMessageComponentCollector({ time });

        const responsePromise: Promise<string[]> = new Promise((resolve, reject) => {
            collector.on('collect', (selectMenuInteraction: StringSelectMenuInteraction) => {
                if (options?.restrictToId && options.restrictToId !== selectMenuInteraction.user.id) {
                    selectMenuInteraction
                        .reply({ content: `You are not permitted to use this dropdown.`, ephemeral: true })
                        .catch(Logger.error);
                } else {
                    resolve(selectMenuInteraction.values);
                }
            });

            collector.on('end', () => {
                interaction.deleteReply().catch(() => {});

                if (options?.timeoutIsReject) {
                    reject(
                        new Error(`No response after ${humanizeTimeAmount(time)}`)
                    );
                } else {
                    resolve([]);
                }
            });
        });

        return { message, responsePromise };
    }

    public static snowflakeOption(
        option: SlashCommandStringOption,
        name: string,
        description: string
    ): SlashCommandStringOption {
        return option.setName(name).setDescription(description).setRequired(true).setMinLength(16).setMaxLength(19);
    }
}

export interface WaitForOptions {
    timeoutIsReject?: boolean;
    waitTime?: number;
    restrictToId?: string;
}

export interface MessageWaitForOptions extends WaitForOptions {
    messageToEdit?: Message;
}

export interface WaitForConfirmOptions extends MessageWaitForOptions {
    confirmText?: string;
    cancelText?: string;
    confirmEmoji?: ComponentEmojiResolvable;
    cancelEmoji?: ComponentEmojiResolvable;
}
