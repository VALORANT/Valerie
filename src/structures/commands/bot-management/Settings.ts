import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, SharedSlashCommandOptions } from 'discord.js';
import { wrap } from '@mikro-orm/core';
import Logger from '@lilywonhalf/pretty-logger';
import Command from '#structures/Command';
import Database from '#root/setup/Database';
import { Settings } from '#structures/entities/Settings';
import EmbedBuilder from '#structures/EmbedBuilder';
import type SettingsRepository from '#structures/repositories/SettingsRepository';
import { SettingField } from '#structures/repositories/SettingsRepository';

type ChoiceName =
    'moderator-role' |
    'mod-tasks-channel';

type MentionPrefix = '#' | '@' | '@&';

type SettingData = {
    title: string,
    choice: ChoiceName,
    description: string,
    method: keyof {
        // eslint-disable-next-line @typescript-eslint/ban-types
        [P in keyof SharedSlashCommandOptions as SharedSlashCommandOptions[P] extends Function? P: never]: any
    },
    mention?: MentionPrefix,
}

const SETTINGS: Record<SettingField, SettingData> = {
    [SettingField.ModeratorRole]: {
        title: 'Moderator role',
        choice: 'moderator-role',
        description: 'The role wore by the people who will moderate the voicechats',
        method: 'addRoleOption',
        mention: '@&',
    },
    [SettingField.ModTasksChannel]: {
        title: 'Mod tasks channel',
        choice: 'mod-tasks-channel',
        description: 'The channel in which mod tasks should be sent',
        method: 'addChannelOption',
        mention: '#',
    },
};

const CHOICE_MAP: Record<ChoiceName, SettingField> = Object.keys(SETTINGS).reduce(
    (carry, key) => {
        const field = key as SettingField;
        const choiceName = SETTINGS[field].choice as ChoiceName;

        carry[choiceName] = field;

        return carry;
    },
    {} as Record<ChoiceName, SettingField>
);

export default class SettingsCommand extends Command {
    private settingsRepository: SettingsRepository;

    public constructor() {
        super(
            new SlashCommandBuilder()
                .setName('settings')
                .setDMPermission(false)
                .setDefaultMemberPermissions(0)
                .setDescription('Allows you to view and edit settings')
                .addSubcommand(subcommand => subcommand
                    .setName('view')
                    .setDescription('Check a setting value')
                    .addStringOption(option => option
                        .setName('key')
                        .setDescription('The setting key you want to check the value of')
                        .setChoices(...Object.keys(SETTINGS).map(key => {
                            return {
                                name: SETTINGS[key as SettingField].choice,
                                value: key,
                            };
                        }))
                        .setRequired(true)
                    ))
                .addSubcommand(subcommand => {
                    subcommand.setName('edit')
                        .setDescription('Edit a setting value');

                    for (const key of Object.keys(SETTINGS)) {
                        const settingField = key as SettingField;
                        const settingData = SETTINGS[settingField];

                        subcommand[settingData.method]((option: any) => option
                            .setName(settingData.choice)
                            .setDescription(settingData.description)
                        );
                    }

                    return subcommand;
                })
        );

        this.settingsRepository = new Database().em.getRepository(Settings);
    }

    public async run(interaction: ChatInputCommandInteraction): Promise<void> {
        if (interaction.options.getSubcommand() === 'view') {
            await this.runView(interaction).catch(Logger.exception);
        } else {
            await this.runEdit(interaction).catch(Logger.exception);
        }
    }

    private async runView(interaction: ChatInputCommandInteraction): Promise<void> {
        const key = interaction.options.getString('key')! as SettingField;
        const setting: Settings | null = await this.settingsRepository.findOne({ key, guild: interaction.guildId });
        const settingData = SETTINGS[key];

        const value = setting?.value ?? 'Not defined';
        const embed = new EmbedBuilder()
            .setTitle(SETTINGS[key].title)
            .setDescription(settingData.mention ? `<${settingData.mention}${value}>` : value);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    private async runEdit(interaction: ChatInputCommandInteraction): Promise<void> {
        for (const element of Object.keys(CHOICE_MAP)) {
            const key = CHOICE_MAP[element as ChoiceName];
            const guild = interaction.guildId!;

            if (!interaction.options.get(element)) {
                continue;
            }

            const value = String(interaction.options.get(element)?.value);
            let setting = await this.settingsRepository.findOne({ guild, key });

            if (!setting) {
                setting = new Settings();

                setting.key = key;
                setting.guild = guild;

                wrap(setting);
            }

            setting.value = value;
            await this.settingsRepository.persist(setting).flush();
            await new Database().em.clearCache(`setting_${guild}_${key}`);
        }

        await interaction.reply({ content: 'The setting has been updated successfully!', ephemeral: true });
    }
}
