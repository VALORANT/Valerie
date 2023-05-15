import Database from '#root/setup/Database';
import { MINUTE, stringToTime } from '#root/util/DateTime';
import { ModTask } from '#structures/entities/ModTask';
import ModTaskRepository from '#structures/repositories/ModTaskRepository';
import SettingsRepository, { SettingField } from '#structures/repositories/SettingsRepository';
import { Settings } from '#structures/entities/Settings';
import type { Client } from 'discord.js';

export default class ModerationTaskLoop {
    private static instance: ModerationTaskLoop;

    private settingsRepository!: SettingsRepository;
    private modTaskRepository!: ModTaskRepository;

    public constructor() {
        if (ModerationTaskLoop.instance) {
            return ModerationTaskLoop.instance;
        }

        this.settingsRepository = new Database().em.getRepository(Settings);
        this.modTaskRepository = new Database().em.getRepository(ModTask);

        ModerationTaskLoop.instance = this;
    }

    public async run(client: Client) {
        const tasks = await this.modTaskRepository.findAll();

        console.log(Date.now());

        for(const task of tasks) {
            const interval = stringToTime(task.interval)!;

            console.log(task.lastTrigger!.getTime());
            console.log(interval);
            console.log(task.lastTrigger!.getTime() + interval);
            console.log(Date.now() < task.lastTrigger!.getTime() + interval);

            if (Date.now() < task.lastTrigger!.getTime() + interval) {
                continue;
            }

            const guildId = task.guild;
            const guild = client.guilds.cache.get(guildId)!;
            const channelId = await this.settingsRepository.getGuildSetting(guildId, SettingField.ModTasksChannel);
            const channel = channelId && guild.channels.cache.get(channelId);

            if (!guild || !channel || !channel.isTextBased()) {
                continue;
            }

            const message = task.messageId ? await channel.messages.fetch(task.messageId).catch(() => null) : null;

            !message ? await task.postTask(channel) : await task.updateTask(message);

            await this.modTaskRepository.getEntityManager().persistAndFlush(task);
        }

        setTimeout(() => {
            this.run.bind(this)(client);
        }, MINUTE);
    }
}
