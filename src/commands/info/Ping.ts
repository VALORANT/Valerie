import type { ChatInputCommandInteraction } from 'discord.js';
import { Command } from '@sapphire/framework';
import Logger from '@lilywonhalf/pretty-logger';

export default class extends Command {
    public override async chatInputRun(interaction: ChatInputCommandInteraction): Promise<void> {
        const response = await interaction.reply({ content: 'Ping...', fetchReply: true });
        const latency = response.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply(`Pong! Took me ${latency}ms.`).catch(Logger.error);
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(command =>
            command
                .setName('ping')
                .setDescription('Tests the latency')
        );
    }
}
