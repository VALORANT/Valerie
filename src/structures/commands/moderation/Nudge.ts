import type { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import Command from '#structures/Command';
import InteractionUtil from '#root/util/InteractionUtil';
import EmbedBuilder from '#structures/EmbedBuilder';

export default class NudgeCommand extends Command {
    public constructor() {
        super(
            new SlashCommandBuilder()
                .setName('nudge')
                .setDescription('To give a reminder of the rules to a member in case they sent a message that infringes them')
                .setDMPermission(false)
                .setDefaultMemberPermissions(0)
                .addUserOption(option => option
                    .setName('user')
                    .setDescription('The member to send the nudge to')
                    .setRequired(true)
                )
                .addStringOption(option => option
                    .setName('message-link')
                    .setDescription('The link to the message that infringes the rules')
                    .setRequired(true)
                )
        );
    }

    public async run(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const guild = interaction.guild!;
        const user = interaction.options.getUser('user', true);
        const member = await guild.members.fetch(user.id).catch(() => null);
        const messageLink = interaction.options.getString('message-link', true);
        const messageLinkRegex = /^https:\/\/([^.]+\.)?discord.com\/channels\/\d{16,19}\/\d{16,19}\/\d{16,19}$/iu;
        const embed = new EmbedBuilder()
            .setAuthor({ iconURL: guild.iconURL() ?? undefined, name: `A message from the moderation team` })
            .setDescription(`
                **A message you posted in the ${guild.name} server has caught the attention of moderators.**

                While this is not a violation, please be mindful of our rules and help us in keeping this community safe and welcome!

                [Click here to go to your message](${messageLink}).
            `)
            .setColor(0xff942a);

        if (!messageLinkRegex.test(messageLink)) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'The message link you entered does not seem to be valid.',
            }, true);

            return;
        }

        if (!member) {
            await InteractionUtil.reply(interaction, {
                title: 'Error',
                description: 'The member does not seem to exist.',
            }, true);

            return;
        }

        await member.send({ embeds: [embed] }).then(() => {
            return InteractionUtil.reply(interaction, {
                title: `Success`,
                description: `The nudge has been sent to the user in DMs.`,
            });
        }).catch(() => {
            return InteractionUtil.reply(interaction, {
                title: `Error`,
                description: `The nudge could not be sent to the member. They probably do not accept DMs.`,
            }, true);
        });
    }
}
