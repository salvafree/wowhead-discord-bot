const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const xml2js = require('xml2js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const xmlParser = new xml2js.Parser();

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
      // Usamos el buscador general de Wowhead con XML para que soporte nombres en español y acentos
      const searchUrl = `https://www.wowhead.com/search?q=${encodeURIComponent(itemName)}&xml`;
      console.log(`[LOG] Buscando en Wowhead: "${itemName}"`);

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      const result = await xmlParser.parseStringPromise(response.data);

      // El buscador general devuelve los resultados dentro de <results><item>...</item></results>
      if (result && result.wowhead && result.wowhead.results && result.wowhead.results[0] && result.wowhead.results[0].item) {
        const itemData = result.wowhead.results[0].item[0];
        const itemId = itemData.$.id;
        const name = itemData.name[0];
        const iconName = itemData.icon ? itemData.icon[0] : 'inv_misc_questionmark';
        const qualityId = itemData.quality ? parseInt(itemData.quality[0]) : 1;
        
        const itemUrl = `https://www.wowhead.com/item=${itemId}`;
        const iconUrl = `https://wowhead.zamimg.com/images/wow/icons/large/${iconName.toLowerCase()}.jpg`;
        const embedColor = QUALITY_COLORS[qualityId] || '#ffffff';

        console.log(`[LOG] ¡Encontrado! ID: ${itemId} | Nombre: ${name}`);

        const embed = new EmbedBuilder()
          .setTitle(name)
          .setURL(itemUrl)
          .setThumbnail(iconUrl)
          .setColor(embedColor);

        await message.reply({
          embeds: [embed],
          allowedMentions: { repliedUser: lesser = false }
        });
      } else {
        console.log(`[LOG] No se encontraron resultados en Wowhead para "${itemName}".`);
      }
    } catch (error) {
      console.error(`[ERROR] Buscando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);