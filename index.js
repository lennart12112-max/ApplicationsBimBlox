require('dotenv').config();
const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Events
} = require('discord.js');
const { REST } = require('@discordjs/rest');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const APPLICATION_CHANNEL = "1411363932290941010";

// Command registration
const commands = [
  new SlashCommandBuilder()
    .setName('application')
    .setDescription('Application Commands')
    .addSubcommand(sub =>
      sub.setName('open').setDescription('Opens an application')
    )
    .addSubcommand(sub =>
      sub.setName('close').setDescription('Closes an application')
    ),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('Commands registered.');
  } catch (err) {
    console.error(err);
  }
})();

// Load applications from file or set default values
let applications = {};
const filePath = './applications.json';

if (fs.existsSync(filePath)) {
  applications = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} else {
  applications = {
    "Public Relations Application": { status: "Closed", description: "", link: "", messageId: null },
    "Human Resources Application": { status: "Closed", description: "", link: "", messageId: null },
    "Support Application": { status: "Closed", description: "", link: "", messageId: null },
    "Manager Application": { status: "Closed", description: "", link: "", messageId: null },
    "Moderation Application": { status: "Closed", description: "", link: "", messageId: null },
    "Supervisor Application": { status: "Closed", description: "", link: "", messageId: null } // Added application
  };
  fs.writeFileSync(filePath, JSON.stringify(applications, null, 2));
}

// Function to save application data
function saveApplications() {
  fs.writeFileSync(filePath, JSON.stringify(applications, null, 2));
}

// Function to create a detailed embed based on status
function createEmbed(appName, appData) {
  if (appData.status === "Open") {
    return new EmbedBuilder()
      .setTitle(`📂 ${appName}`)
      .setDescription(appData.description)
      .addFields(
        { name: "🔗 Link", value: `[Click here](${appData.link})`, inline: true },
        { name: "📌 Status", value: "✅ Open", inline: true }
      )
      .setColor('Green')
      .setFooter({ text: "Application Status: Open", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
  } else {
    return new EmbedBuilder()
      .setTitle(`📂 ${appName}`)
      .setDescription(`This application is currently closed. Please check back later.`)
      .addFields(
        { name: "📌 Status", value: "❌ Closed", inline: true }
      )
      .setColor('Red')
      .setFooter({ text: "Application Status: Closed", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
  }
}

// Function to create a modern and visually appealing embed for all applications
function createApplicationsEmbed(applications) {
  const embed = new EmbedBuilder()
    .setTitle("📋 Application Overview")
    .setDescription("Below is the current status of all applications. If an application is not open, don't worry, it will open soon.")
    .setColor("#5865F2") // Discord's primary blue color
    .setFooter({ text: "Last updated", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  for (const [appName, appData] of Object.entries(applications)) {
    const status = appData.status === "Open" ? "✅ **Open**" : "❌ **Closed**";
    const description = appData.description || "*No description provided.*";
    const link = appData.link ? `[Click here](${appData.link})` : "*No link available.*";

    embed.addFields({
      name: `📂 ${appName}`,
      value: `**Status:** ${status}\n**Description:** ${description}\n**Link:** ${link}`,
      inline: false
    });
  }

  return embed;
}

// On bot start, check and send a single embed
client.on('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  const channel = await client.channels.fetch(APPLICATION_CHANNEL);

  const embed = createApplicationsEmbed(applications);

  let messageId = null;

  // Check if a message already exists
  if (fs.existsSync('./embedMessageId.json')) {
    messageId = JSON.parse(fs.readFileSync('./embedMessageId.json', 'utf8')).messageId;
  }

  try {
    if (messageId) {
      const msg = await channel.messages.fetch(messageId);
      await msg.edit({ embeds: [embed] });
    } else {
      const newMsg = await channel.send({ embeds: [embed] });
      fs.writeFileSync('./embedMessageId.json', JSON.stringify({ messageId: newMsg.id }));
    }
  } catch {
    const newMsg = await channel.send({ embeds: [embed] });
    fs.writeFileSync('./embedMessageId.json', JSON.stringify({ messageId: newMsg.id }));
  }
});

// Whitelisted role IDs
const WHITELISTED_ROLES = [
  "1208523545806639164",
  "1351576617000108082",
  "1350875371393781891"
];

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    // Check if the user has a whitelisted role
    const memberRoles = interaction.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLES.some(role => memberRoles.includes(role));

    if (!hasPermission) {
      await interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === 'application') {
      if (interaction.options.getSubcommand() === 'open') {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('application_open_select')
          .setPlaceholder('Select an application')
          .addOptions(Object.keys(applications).map(app => ({ label: app, value: app })));

        await interaction.reply({
          content: 'Please select an application:',
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true
        });
      }

      if (interaction.options.getSubcommand() === 'close') {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('application_close_select')
          .setPlaceholder('Select an application to close')
          .addOptions(Object.keys(applications).map(app => ({ label: app, value: app })));

        await interaction.reply({
          content: 'Which application would you like to close?',
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true
        });
      }
    }
  }

  // Selection for opening
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'application_open_select') {
      const selected = interaction.values[0];

      const modal = new ModalBuilder()
        .setCustomId(`modal_${selected}`)
        .setTitle(`Open ${selected}`);

      const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Short description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const linkInput = new TextInputBuilder()
        .setCustomId('link')
        .setLabel('Application link')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(linkInput)
      );

      await interaction.showModal(modal);
    }

    if (interaction.customId === 'application_close_select') {
      const selected = interaction.values[0];
      applications[selected].status = "Closed";
      applications[selected].description = "";
      applications[selected].link = "";

      // Update the main overview embed
      const updatedEmbed = createApplicationsEmbed(applications);

      const channel = await client.channels.fetch(APPLICATION_CHANNEL);

      try {
        const embedMessageId = JSON.parse(fs.readFileSync('./embedMessageId.json', 'utf8')).messageId;
        const embedMessage = await channel.messages.fetch(embedMessageId);
        await embedMessage.edit({ embeds: [updatedEmbed] });
      } catch (error) {
        console.error(`Failed to edit the main overview embed:`, error);
      }

      saveApplications();
      await interaction.reply({ content: `${selected} has been closed and the overview embed has been updated.`, ephemeral: true });
    }
  }

  // Modal submit
  if (interaction.isModalSubmit()) {
    const selected = interaction.customId.replace('modal_', '');
    const description = interaction.fields.getTextInputValue('description');
    const link = interaction.fields.getTextInputValue('link');

    // Update application data
    applications[selected] = { ...applications[selected], status: "Open", description, link };

    // Update the main overview embed
    const updatedEmbed = createApplicationsEmbed(applications);

    const channel = await client.channels.fetch(APPLICATION_CHANNEL);

    try {
      const embedMessageId = JSON.parse(fs.readFileSync('./embedMessageId.json', 'utf8')).messageId;
      const embedMessage = await channel.messages.fetch(embedMessageId);
      await embedMessage.edit({ embeds: [updatedEmbed] });
    } catch (error) {
      console.error(`Failed to edit the main overview embed:`, error);
    }

    saveApplications();
    await interaction.reply({ content: `${selected} has been opened and the overview embed has been updated.`, ephemeral: true });
  }
});

client.login(TOKEN);
