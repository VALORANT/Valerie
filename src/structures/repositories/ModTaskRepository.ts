import EntityRepository from '#structures/EntityRepository';
import type { ModTask } from '#structures/entities/ModTask';
import type { Snowflake } from 'discord.js';

export default class ModTaskRepository extends EntityRepository<ModTask> {
    public async getById(id: number): Promise<ModTask | null> {
        return await this.findOne({ id }) ?? null;
    }

    public async getByGuild(guild: string): Promise<Array<ModTask> | null> {
        return await this.find({ guild }) ?? null;
    }

    public async updateTriggerByMessageId(messageId: Snowflake): Promise<void> {
        await this.nativeUpdate({ messageId }, { lastTrigger: new Date() });
    }
}
