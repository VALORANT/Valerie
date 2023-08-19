import { Client, IntentsBitField, Partials } from 'discord.js';
import { config as configureEnvironment } from 'dotenv';
import FileSystem from '#root/util/FileSystem';
import Database from '#root/setup/Database';
import { LogLevel, SapphireClient } from '@sapphire/framework';

type BootstrapOptions = {
    dotEnvPath?: string;
};

export class Bootstrap {
    private static instance: Bootstrap;

    public client!: SapphireClient;

    private intents: number[] = [];

    public constructor({ dotEnvPath }: BootstrapOptions = {}) {
        if (Bootstrap.instance) {
            return Bootstrap.instance;
        }

        if (dotEnvPath) {
            configureEnvironment({ path: dotEnvPath });
        } else {
            configureEnvironment();
        }

        process.env.TZ = 'UTC+0';

        Bootstrap.instance = this;
    }

    public initializeIntents(): void {
        this.intents = [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMembers,
            IntentsBitField.Flags.GuildBans,
            IntentsBitField.Flags.GuildEmojisAndStickers,
            IntentsBitField.Flags.GuildIntegrations,
            IntentsBitField.Flags.GuildInvites,
            IntentsBitField.Flags.GuildVoiceStates,
            IntentsBitField.Flags.GuildPresences,
            IntentsBitField.Flags.GuildMessages,
            IntentsBitField.Flags.GuildMessageReactions,
            IntentsBitField.Flags.DirectMessages,
            IntentsBitField.Flags.DirectMessageReactions,
            IntentsBitField.Flags.MessageContent,
            IntentsBitField.Flags.GuildScheduledEvents,
        ];
    }

    public initializeClient(): void {
        this.client = new SapphireClient({
            logger: {
                level: LogLevel.Debug,
            },
            intents: this.intents,
            partials: [
                Partials.User,
                Partials.Channel,
                Partials.GuildMember,
                Partials.Message,
                Partials.Reaction,
                Partials.GuildScheduledEvent,
                Partials.ThreadMember,
            ],
        });
    }

    public async login(): Promise<SapphireClient> {
        const database = new Database();

        await database.initialize();

        return new Promise((resolve, reject) => {
            this.client.once('ready', async (client: Client) => {
                await this.startLoops(client);

                resolve(client);
            });

            this.client.login(process.env.TOKEN!).catch(reject);
        });
    }

    private async startLoops(client: Client) {
        const files = await FileSystem.glob(
            'dist/structures/loops/**/*.js',
            { absolute: true, nodir: true }
        );

        await Promise.all(files.map(async file => {
            const loopPath = `${file}`;
            // noinspection JSPotentiallyInvalidConstructorUsage
            const loopFile = await import(loopPath);
            const loopInstance = new loopFile.default();

            if (loopInstance !== null) {
                loopInstance.run(client);
            }
        }));
    }
}
