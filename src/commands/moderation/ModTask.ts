import type { ChatInputCommandInteraction, TextBasedChannel } from 'discord.js';
import { AliasPiece, Command, CommandOptions } from '@sapphire/framework';
import Logger from '@lilywonhalf/pretty-logger';
import ModTaskRepository from '#structures/repositories/ModTaskRepository';
import Database from '#root/setup/Database';
import { ModTask } from '#structures/entities/ModTask';
import InteractionUtil from '#root/util/InteractionUtil';
import { MINUTE, stringToTime } from '#root/util/DateTime';
import SettingsRepository, { SettingField } from '#structures/repositories/SettingsRepository';
import { Settings } from '#structures/entities/Settings';

export default class extends Command {
    private settingsRepository: SettingsRepository;
    private modTaskRepository: ModTaskRepository;

    public constructor(context: AliasPiece.Context, options: CommandOptions) {
        super(context, options);

        this.settingsRepository = new Database().em.getRepository(Settings);
        this.modTaskRepository = new Database().em.getRepository(ModTask);
    }

    public override async chatInputRun(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const interval = interaction.options.getString('interval');
        const modTaskChannel = await this.settingsRepository.getGuildSetting(
            interaction.guild!.id,
            SettingField.ModTasksChannel
        );
        const channel = modTaskChannel ? interaction.guild!.channels.cache.get(modTaskChannel) : null;

        if (interval && (!stringToTime(interval) || stringToTime(interval)! < MINUTE)) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'The interval you entered is incorrect. Please enter an interval that is at least one minute long.',
            }, true);

            return;
        }

        if (!channel || !channel.isTextBased()) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'This server is not configured for moderation tasks yet.',
            }, true);

            return;
        }

        switch (interaction.options.getSubcommand().toLowerCase()) {
            case 'list':
                this.runList(interaction).catch(Logger.exception);
                break;

            case 'add':
                this.runAdd(interaction, channel).catch(Logger.exception);
                break;

            case 'edit':
                this.runEdit(interaction, channel).catch(Logger.exception);
                break;

            case 'delete':
                this.runDelete(interaction, channel).catch(Logger.exception);
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
                .setName('modtask')
                .setDescription('Recurring moderation tasks to be posted in a dedicated channel')
                .setDMPermission(false)
                .setDefaultMemberPermissions(0)
                .addSubcommand(input => input
                    .setName('list')
                    .setDescription('List existing moderation tasks')
                )
                .addSubcommand(input => input
                    .setName('add')
                    .setDescription('Add a moderation task')
                    .addStringOption(option => option
                        .setName('interval')
                        .setDescription('Amount of time between each reminder (for example: 4h)')
                        .setMinLength(2)
                        .setRequired(true)
                    )
                    .addStringOption(option => option
                        .setName('label')
                        .setDescription('The description of the task')
                        .setRequired(true)
                    )
                )
                .addSubcommand(input => input
                    .setName('edit')
                    .setDescription('Modify a moderation task')
                    .addIntegerOption(option => option
                        .setName('id')
                        .setDescription('Moderation task id')
                        .setRequired(true)
                    )
                    .addStringOption(option => option
                        .setName('interval')
                        .setDescription('Amount of time between each reminder (for example: 4h)')
                        .setMinLength(2)
                    )
                    .addStringOption(option => option
                        .setName('label')
                        .setDescription('The description of the task')
                    )
                )
                .addSubcommand(input => input
                    .setName('delete')
                    .setDescription('Delete a moderation task')
                    .addIntegerOption(option => option
                        .setName('id')
                        .setDescription('Moderation task id')
                        .setRequired(true)
                    )
                )
        );
    }

    private async runList(interaction: ChatInputCommandInteraction): Promise<void> {
        const tasks = await this.modTaskRepository.getByGuild(interaction.guild!.id);

        if (!tasks || tasks.length < 1) {
            await InteractionUtil.reply(interaction, {
                title: 'Nothing to see here',
                description: 'There are no mod tasks yet!',
            });

            return;
        }

        await InteractionUtil.reply(interaction, {
            title: 'Mod task list',
            fields: tasks.map(task => {
                const { id, label, interval } = task;
                const lastTrigger = `<t:${Math.round(task.lastTrigger!.getTime() / 1000)}>`

                return {
                    name: `Task #${id}`,
                    value: `**Label:** ${label}\n**Interval:** ${interval}\n**Last execution:** ${lastTrigger}`,
                };
            }),
        });
    }

    private async runAdd(interaction: ChatInputCommandInteraction, channel: TextBasedChannel): Promise<void> {
        const task = new ModTask();

        task.guild = interaction.guild!.id;
        task.interval = interaction.options.getString('interval', true);
        task.label = interaction.options.getString('label', true);

        await this.modTaskRepository.getEntityManager().persistAndFlush(task);

        await task.postTask(channel);

        await this.modTaskRepository.getEntityManager().persistAndFlush(task);

        await InteractionUtil.reply(interaction, {
            title: 'Mod task added',
            description: `Moderation task #${task.id} saved successfully!`,
        });
    }

    private async runEdit(interaction: ChatInputCommandInteraction, channel: TextBasedChannel): Promise<void> {
        const id = interaction.options.getInteger('id', true);
        const interval = interaction.options.getString('interval');
        const label = interaction.options.getString('label');
        const task = await this.modTaskRepository.getById(id);

        if (!task || task.guild !== interaction.guild!.id) {
            await InteractionUtil.reply(interaction, {
                title: 'Error 404',
                description: `Moderation task #${id} could not be found in this server.`,
            }, true);

            return;
        }

        if (interval) {
            task.interval = interval;
        }

        if (label) {
            task.label = label;
        }

        const message = task.messageId ? await channel.messages.fetch(task.messageId).catch(() => null) : null;

        message ? await task.updateTask(message) : await task.postTask(channel);

        await this.modTaskRepository.getEntityManager().persistAndFlush(task);

        await InteractionUtil.reply(interaction, {
            title: 'Mod task edited',
            description: `Moderation task #${id} modified successfully!`,
        });
    }

    private async runDelete(interaction: ChatInputCommandInteraction, channel: TextBasedChannel): Promise<void> {
        const id = interaction.options.getInteger('id', true);
        const task = await this.modTaskRepository.getById(id);

        if (!task || task.guild !== interaction.guild!.id) {
            await InteractionUtil.reply(interaction, {
                title: 'Error 404',
                description: `Moderation task #${id} could not be found in this server.`,
            }, true);

            return;
        }

        const message = task.messageId ? await channel.messages.fetch(task.messageId).catch(() => null) : null;

        if (message) {
            await message.delete();
        }

        await this.modTaskRepository.getEntityManager().removeAndFlush(task);

        await InteractionUtil.reply(interaction, {
            title: 'Mod task deleted',
            description: `Moderation task #${id} was successfully deleted.`,
        });
    }
}
