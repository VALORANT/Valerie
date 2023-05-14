import EntityRepository from '#structures/EntityRepository';
import type { ModTask } from '#structures/entities/ModTask';

export default class ModTaskRepository extends EntityRepository<ModTask> {
    public async getById(id: number): Promise<ModTask | null> {
        return await this.findOne({ id }) ?? null;
    }

    public async getByGuild(guild: string): Promise<Array<ModTask> | null> {
        return await this.find({ guild }) ?? null;
    }
}
