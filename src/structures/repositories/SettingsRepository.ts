import EntityRepository from '#structures/EntityRepository';
import type { Settings } from '#structures/entities/Settings';
import type { Snowflake } from 'discord.js';
import { MINUTE } from '#root/util/DateTime';

export enum SettingField {
    ModeratorRole = 'moderator_role',
    ModTasksChannel = 'mod_tasks_channel'
}

const formatters: Partial<Record<SettingField, (status: string) => string | null>> = {
}

export default class SettingsRepository extends EntityRepository<Settings> {
    public async getGuildSetting(guild: Snowflake, key: SettingField): Promise<string | null> {
        // Cache set to 30 minutes
        const setting = await this.findOne(
            { guild, key },
            { cache: [`setting_${guild}_${key}`, 30 * MINUTE] }
        );

        if (setting) {
            const value = String(setting.value);

            return formatters[key] ? formatters[key]!(value) : value;
        } else {
            return null;
        }
    }
}
