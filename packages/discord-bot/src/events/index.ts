import {
  Client,
  Events,
  Message
} from 'discord.js';
import { ConciergeService } from '../services/concierge';
import { ModerationService } from '../services/moderation';

export function setupEventHandlers(
  client: Client,
  moderationService: ModerationService
) {
  console.log('[EVENTS] Setting up event handlers...');
  const concierge = new ConciergeService();

  // Command interaction handler
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands?.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const reply = {
        content: '❌ There was an error while executing this command!',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  // Message handler for moderation and mentions
  console.log('[EVENTS] Registering MessageCreate handler...');
  client.on(Events.MessageCreate, async (message: Message) => {
    // CRITICAL: Log EVERY message to verify events are received
    console.log(`[MSG] ${message.author.tag} in ${message.guild?.name || 'DM'}: ${message.content.substring(0, 50)}`);

    // Debug: Log all messages with mentions
    if (message.content.includes('@') || message.mentions.users.size > 0) {
      console.log(`[DEBUG] Message from ${message.author.tag} (bot: ${message.author.bot}): ${message.content.substring(0, 100)}`);
      console.log(`[DEBUG] Mentions: ${message.mentions.users.map(u => u.tag).join(', ')}, Client user: ${client.user?.tag}`);
    }

    // Ignore bot messages
    if (message.author.bot) {
      console.log(`[DEBUG] Ignoring bot message from ${message.author.tag}`);
      return;
    }

    // Ignore DMs
    if (!message.guild) {
      console.log(`[DEBUG] Ignoring DM from ${message.author.tag}`);
      return;
    }

    // Handle bot mentions - use AI concierge for conversational responses
    if (client.user && message.mentions.has(client.user)) {
      console.log(`Bot mentioned by ${message.author.tag} in ${message.channel.id}: ${message.content}`);
      try {
        // Extract the question (remove the mention)
        const question = message.content
          .replace(/<@!?\d+>/g, '')
          .trim();

        if (!question) {
          // Just a mention, no question
          await message.reply('👋 Greetings, traveler! I\'m the TavernKeeper. Ask me anything about InnKeeper, or use `/help` to see all commands.');
          return;
        }

        // Use concierge to answer conversationally
        console.log(`[CONCIERGE] Answering question: ${question}`);
        const response = await concierge.answerQuestion({
          question,
          userId: message.author.id,
          channelId: message.channel.id,
        });

        await message.reply(response);
        return;
      } catch (error) {
        console.error('Error responding to mention:', error);
        // Try to send error to channel if possible
        try {
          if (message.channel.isTextBased() && !message.channel.isDMBased()) {
            await message.channel.send('❌ Error: I received your message but had trouble responding.');
          }
        } catch (sendError) {
          console.error('Could not send error message:', sendError);
        }
      }
    }

    // Check if user is verified (for channels that require verification)
    // This is handled by channel permissions, but we can add additional checks here if needed

    try {
      const check = await moderationService.checkMessage(message);

      if (check.shouldDelete) {
        await message.delete();

        if (check.shouldWarn) {
          const warningCount = await moderationService.addWarning(
            message.author.id
          );

          if (message.channel.isTextBased() && !message.channel.isDMBased()) {
            const warningMessage = await message.channel.send(
              `⚠️ <@${message.author.id}>, your message was removed${check.reason ? `: ${check.reason}` : ''}. You now have ${warningCount} warning(s).`
            );

            // Delete warning message after 10 seconds
            setTimeout(() => {
              warningMessage.delete().catch(() => {});
            }, 10000);
          }

          // Auto-timeout after 3 warnings
          if (warningCount >= 3) {
            const member = await message.guild.members.fetch(message.author.id);
            await moderationService.timeoutMember(
              member,
              60,
              'Automatic timeout after 3 warnings'
            );

            await moderationService.logModAction(
              message.guild.id,
              'Auto-Timeout (3 warnings)',
              message.author.id,
              client.user?.id || 'system',
              'Automatic timeout after 3 warnings'
            );
          }
        }
      }
    } catch (error) {
      console.error('Error in message moderation:', error);
    }
  });

  // Ready event
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  });

  // Also listen for clientReady (new name in v15)
  client.once('clientReady', (readyClient) => {
    console.log(`Client ready! Logged in as ${readyClient.user.tag}`);
  });

  // Error handling
  client.on(Events.Error, (error) => {
    console.error('Discord client error:', error);
  });

  client.on(Events.Warn, (warning) => {
    console.warn('Discord client warning:', warning);
  });

  console.log('[EVENTS] Event handlers registered successfully');
}
