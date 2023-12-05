import EntityRepository from '#structures/EntityRepository';
import type { WhitelistedUser } from '#structures/entities/WhitelistedUser';
import type { Snowflake } from 'discord.js';

export default class WhitelistedUserRepository extends EntityRepository<WhitelistedUser> {
    public async getByGuild(guildId: Snowflake): Promise<Array<WhitelistedUser> | null> {
        return await this.find({ guildId }) ?? null;
    }
}
