import { Entity, PrimaryKey, PrimaryKeyType, Property } from '@mikro-orm/core';
import SettingsRepository from '#structures/repositories/SettingsRepository';

@Entity({ customRepository: () => SettingsRepository })
export class Settings {
    @PrimaryKey({ comment: 'The key of the setting, snake case' })
    key!: string;

    @PrimaryKey({ comment: 'The guild snowflake in which this setting applies' })
    guild!: string;

    @Property({ comment: 'The value of the setting' })
    value!: string;

    [PrimaryKeyType]?: [string, string];
}
