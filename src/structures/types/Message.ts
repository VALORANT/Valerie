import type { Guild, Message, Snowflake } from 'discord.js';

export type GuildMessage = Message & { guild: Guild, guildId: Snowflake };
