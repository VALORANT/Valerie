import { Entity, PrimaryKey, PrimaryKeyType, Property } from '@mikro-orm/core';
import WhitelistedUserRepository from '#structures/repositories/WhitelistedUserRepository';

@Entity({ customRepository: () => WhitelistedUserRepository })
export class WhitelistedUser {
    @PrimaryKey({ comment: 'Discord snowflake of the user' })
    userId!: string;

    @PrimaryKey({ comment: 'Guild snowflake, or server id, but in the coding realm servers are called guilds, and ids are snowflakes, but only sometimes, leave me alone.' })
    guildId!: string;

    @Property({ columnType: 'text', comment: 'Discord snowflake of the user who created this entry' })
    whitelistedBy!: string;

    @Property({ onCreate: () => new Date(), comment: 'The datetime of when the entry was created.' })
    createdOn?: Date;

    [PrimaryKeyType]?: [string, string];
}
