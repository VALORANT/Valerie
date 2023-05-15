import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import ModTaskRepository from '#structures/repositories/ModTaskRepository';
import { Message, TextBasedChannel } from 'discord.js';
import EmbedBuilder from '#structures/EmbedBuilder';

const triggerCountColourMap: Record<number, number> = {
    1: 0x2aff2a,
    2: 0xff942a,
    3: 0xff2a2a,
};

@Entity({ customRepository: () => ModTaskRepository })
export class ModTask {
    @PrimaryKey({ comment: 'Primary key, not sure what to say here.' })
    id!: number;

    @Property({ comment: 'Guild id, or server id, but in the coding realm servers are called guilds, leave me alone.' })
    guild!: string;

    @Property({ columnType: 'text', comment: 'The task label, description, but I did not want to write description because I feel like it implies it has a title, and there is not title.' })
    label!: string;

    @Property({ comment: 'The amount of time between each reminder.' })
    interval!: string;

    @Property({ onCreate: () => new Date(), comment: 'The datetime of the last trigger.' })
    lastTrigger?: Date;

    @Property({ default: 1, comment: 'How many times the trigger was triggered by the triggerer. Trigger? Is a trigger triggered by a trigger? That is weird.' })
    triggerCount!: number;

    @Property({ nullable: true, comment: 'Message id. Ok yeah that does not explain much, sorry. The mod task in question is going to be posted in a message. We are talking about that message, here. This is the id of that message. Got it?' })
    messageId?: string;

    public async postTask(channel: TextBasedChannel): Promise<ModTask> {
        this.triggerCount = 1;

        const embed = ModTask.getTaskEmbed(this);
        const message = await channel.send({ embeds: [embed] });
        const reactionEmoji = channel.client.emojis.cache.find(emoji => emoji.name === 'Check')?.id ?? '✅'

        await message.react(reactionEmoji)

        this.messageId = message.id;

        return this;
    }

    public async updateTask(message: Message): Promise<ModTask> {
        this.triggerCount++;

        if (this.triggerCount > 3) {
            return this;
        }

        const embed = ModTask.getTaskEmbed(this);

        await message.edit({ embeds: [embed] });

        return this;
    }

    private static getTaskEmbed(task: ModTask): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(`Moderation task #${task.id}`)
            .setDescription(task.label)
            .setColor(triggerCountColourMap[task.triggerCount > 2 ? 3 : task.triggerCount]);
    }
}
