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

// Colores de rareza de WoW en código Hexadecimal para Discord
const QUALITY_COLORS = {
  0: '#9d9d9d', // Pobre (Gris)
  1: '#ffffff', // Común (Blanco)
  2: '#1eff00', // Poco común (Verde)
  3: '#0070dd', // Raro (Azul)
  4: '#a335ee', // Épico (Morado)
  5: '#ff8000', // Legendario (Naranja)
  6: '#e6cc80', // Artefacto (Dorado)
  7: '#00ccff', // Reliquia (Azul claro)
};

client.once('ready', () => {
  console.log(`Bot con imágenes listo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const matches = message.content.match(/\[(.*?)\]/g);
  if (!matches) return;

  for (const match of matches) {
    const itemName = match.slice(1, -1).trim();
    if (!itemName) continue;

    try {
      // Usamos la API JSON de Wowhead para tooltips en español (o la general)
      // Nota: 'es' en la URL prioriza la versión en español de los objetos
      const searchUrl = `https://es.wowhead.com/tooltip/item/${encodeURIComponent(itemName)}`;
      console.log(`[LOG] Consultando Wowhead para: "${itemName}"`);

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      const data = response.data;

      if (data && data.name) {
        const itemId = data.id;
        const name = data.name;
        // El icono viene en minúsculas y limpio
        const iconName = data.icon ? data.icon.toLowerCase() : 'inv_misc_questionmark';
        const qualityId = data.quality !== undefined ? data.quality : 1;
        
        const itemUrl = `https://es.wowhead.com/item=${itemId}`;
        const iconUrl = `https://wowhead.zamimg.com/images/wow/icons/large/${iconName}.jpg`;
        const embedColor = QUALITY_COLORS[qualityId] || '#ffffff';

        console.log(`[LOG] ¡Encontrado! ID: ${itemId} | Nombre: ${name}`);

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
        console.log(`[LOG] No se encontró el objeto "${itemName}" en Wowhead.`);
      }
    } catch (error) {
      console.error(`[ERROR] Buscando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);