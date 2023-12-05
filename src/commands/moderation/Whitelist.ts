import type { ChatInputCommandInteraction, ModalActionRowComponentBuilder } from 'discord.js';
import { AliasPiece, Command, CommandOptions } from '@sapphire/framework';
import Logger from '@lilywonhalf/pretty-logger';
import WhitelistedUserRepository from '#structures/repositories/WhitelistedUserRepository';
import Database from '#root/setup/Database';
import { WhitelistedUser } from '#structures/entities/WhitelistedUser';
import InteractionUtil from '#root/util/InteractionUtil';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { MINUTE } from '#root/util/DateTime';
import { RequiredEntityData } from '@mikro-orm/core';

export default class extends Command {
    private whitelistedUserRepository: WhitelistedUserRepository;

    public constructor(context: AliasPiece.Context, options: CommandOptions) {
        super(context, options);

        this.whitelistedUserRepository = new Database().em.getRepository(WhitelistedUser);
    }

    public override async chatInputRun(interaction: ChatInputCommandInteraction): Promise<void> {
        switch (interaction.options.getSubcommand().toLowerCase()) {
            case 'add':
                this.runAdd(interaction).catch(Logger.exception);
                break;

            case 'remove':
                this.runRemove(interaction).catch(Logger.exception);
                break;

            default:
                await InteractionUtil.reply(interaction, {
                    title: 'Excuse me?',
                    description: 'You executed a subcommand that does not exist. This is not supposed to be possible.',
                });
        }
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(command =>
            command
                .setName('whitelist')
                .setDescription('To manage the list of whitelisted users on this server')
                .setDMPermission(false)
                .setDefaultMemberPermissions(0)
                .addSubcommand(input => input
                    .setName('add')
                    .setDescription('Add user IDs to the whitelist')
                )
                .addSubcommand(input => input
                    .setName('remove')
                    .setDescription('Remove a user ID from the whitelist')
                    .addStringOption(option => InteractionUtil.snowflakeOption(
                        option,
                        'user-id',
                        'ID of the user to remove from the whitelist'
                    ).setRequired(true))
                )
        );
    }

    private async runAdd(interaction: ChatInputCommandInteraction): Promise<void> {
        const baseId = `whitelist-add-${interaction.id}-`;
        const modal = new ModalBuilder().setCustomId(`${baseId}-modal`).setTitle('My Modal');
        const idListInput = new TextInputBuilder()
            .setCustomId(`${baseId}-id-list`)
            .setLabel(`Enter the list of user IDs to whitelist`)
            .setStyle(TextInputStyle.Paragraph);
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(idListInput);

        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        const modalResponse = await interaction.awaitModalSubmit({
            filter: interaction => interaction.customId === `${baseId}-modal`,
            time: 5 * MINUTE,
        }).catch(() => null);

        const whitelistedUsers = await this.whitelistedUserRepository.getByGuild(interaction.guildId!);
        const whitelistedUserIds = whitelistedUsers?.map(whitelistedUser => whitelistedUser.userId) ?? [];

        const idListString = modalResponse?.fields.getTextInputValue(`${baseId}-id-list`).trim();
        const idList = (idListString ? idListString.match(/\d{16,19}/gu) ?? [] : []).filter(
            id => !whitelistedUserIds.includes(id)
        );

        if (idList.length < 1) {
            await InteractionUtil.reply(modalResponse!, {
                title: 'Error',
                description: 'No user IDs were provided or all the provided IDs are already whitelisted on this server.',
            }, true);

            return;
        }

        const qb = this.whitelistedUserRepository.createQueryBuilder();
        const dataToInsert = idList.map(id => {
            return {
                userId: id,
                guildId: interaction.guildId,
                whitelistedBy: interaction.user.id,
                createdOn: new Date(),
            } as RequiredEntityData<WhitelistedUser>;
        });

        await qb.insert(dataToInsert).execute();

        await InteractionUtil.reply(modalResponse!, {
            title: 'Success',
            description: `${dataToInsert.length} user(s) whitelisted successfully!`,
        });
    }

    private async runRemove(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const userId = interaction.options.getString('user-id', true);
        const whitelistedUser = await this.whitelistedUserRepository.findOne(
            { userId, guildId: interaction.guild!.id }
        );

        if (!whitelistedUser) {
            await InteractionUtil.reply(interaction, {
                title: 'Error 404',
                description: `This user is not currently whitelisted on this server.`,
            }, true);

            return;
        }

        await this.whitelistedUserRepository.getEntityManager().removeAndFlush(whitelistedUser);

        await InteractionUtil.reply(interaction, {
            title: 'Success',
            description: `The user has been successfully removed from this server's whitelist.`,
        });
    }
}
