import EntityRepository from '#structures/EntityRepository';
import type { Settings } from '#structures/entities/Settings';
import type { Snowflake } from 'discord.js';

export enum SettingField {
    ModTasksChannel = 'mod_tasks_channel',
    LogsChannel = 'logs_channel',
    VCModRole = 'vc_mod_role',
    EmergencyRole = 'emergency_role',
    EmergencyChannel = 'emergency_channel',
    ModmailBot = 'modmail_bot',
    WhitelistEnabled = 'whitelist_enabled'
}

const formatters: Partial<Record<SettingField, (value: string) => string | boolean | null>> = {
    [SettingField.WhitelistEnabled]: (value: string) => value === 'true',
}

export default class SettingsRepository extends EntityRepository<Settings> {
    public async getGuildSetting(guild: Snowflake, key: SettingField.WhitelistEnabled): Promise<boolean | null>;
    public async getGuildSetting(guild: Snowflake, key: Omit<SettingField, 'WhitelistEnabled'>): Promise<string | null>;
    public async getGuildSetting(guild: Snowflake, key: SettingField): Promise<string | boolean | null> {
        const setting = await this.findOne({ guild, key });

        if (setting) {
            const value = String(setting.value);

            return formatters[key] ? formatters[key]!(value) : value;
        } else {
            return null;
        }
    }
}
