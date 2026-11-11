const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;

const QUALITY_COLORS = {
  0: '#9d9d9d', // Pobre
  1: '#ffffff', // Común
  2: '#1eff00', // Poco común
  3: '#0070dd', // Raro
  4: '#a335ee', // Épico
  5: '#ff8000', // Legendario
  6: '#e6cc80', // Artefacto
  7: '#00ccff', // Reliquia
};

client.once('ready', () => {
  console.log(`Bot multilingüe listo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const matches = message.content.match(/\[(.*?)\]/g);
  if (!matches) return;

  for (const match of matches) {
    const itemName = match.slice(1, -1).trim();
    if (!itemName) continue;

    try {
      // El buscador global entiende consultas en Español, Francés e Inglés
      const searchUrl = `https://www.wowhead.com/search?q=${encodeURIComponent(itemName)}&formatting=json`;
      console.log(`[LOG] Buscando objeto (${itemName})...`);

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      const data = response.data;
      let itemResult = null;

      if (data && data.i && data.i.length > 0) {
        itemResult = data.i[0];
      }

      if (itemResult) {
        const itemId = itemResult.id;
        const name = itemResult.name;
        const iconName = itemResult.icon ? itemResult.icon.toLowerCase() : 'inv_misc_questionmark';
        const qualityId = itemResult.quality !== undefined ? itemResult.quality : 1;
        
        // El enlace a Wowhead apuntará a la versión traducida correspondiente según el nombre
        const itemUrl = `https://www.wowhead.com/item=${itemId}`;
        const iconUrl = `https://wowhead.zamimg.com/images/wow/icons/large/${iconName}.jpg`;
        const embedColor = QUALITY_COLORS[qualityId] || '#ffffff';

        console.log(`[LOG] ¡Objeto encontrado! [ID: ${itemId}] ${name}`);

        const embed = new EmbedBuilder()
          .setTitle(name)
          .setURL(itemUrl)
          .setThumbnail(iconUrl)
          .setColor(embedColor);

        await message.reply({
          embeds: [embed],
          allowedMentions: { repliedUser: false }
        });
      } else {
        console.log(`[LOG] No se encontró resultado para "${itemName}".`);
      }
    } catch (error) {
      console.error(`[ERROR] Buscando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);