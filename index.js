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

// Función para limpiar tildes y caracteres especiales para evitar errores 404 en la API
function sanitizeQuery(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina tildes
    .trim();
}

client.once('clientReady', () => {
  console.log(`Bot Forever listo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const matches = message.content.match(/\[(.*?)\]/g);
  if (!matches) return;

  for (const match of matches) {
    const rawItemName = match.slice(1, -1).trim();
    if (!rawItemName) continue;

    try {
      const cleanQuery = sanitizeQuery(rawItemName);
      console.log(`[LOG] Buscando objeto: "${rawItemName}" (Limpio: "${cleanQuery}")...`);

      const searchUrl = `https://www.wowhead.com/search/suggest?q=${encodeURIComponent(cleanQuery)}`;
      
      const response = await axios.get(searchUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Referer': 'https://www.wowhead.com/'
        },
        timeout: 5000
      });

      const data = response.data;
      let itemResult = null;

      if (data) {
        const results = Array.isArray(data) ? data : (data.results || data.items || []);
        itemResult = results.find(r => r.type === 3 || r.typeName === 'Item') || results[0];
      }

      if (itemResult) {
        const itemId = itemResult.id;
        const name = itemResult.name || rawItemName;
        const iconName = itemResult.icon ? itemResult.icon.toLowerCase() : 'inv_misc_questionmark';
        const qualityId = itemResult.quality !== undefined ? itemResult.quality : 1;
        
        // Enlace Forever estructurado correctamente con el ID obtenido
        const itemUrl = `https://es.wowhead.com/forever/es/item=${itemId}`;
        const iconUrl = `https://wowhead.zamimg.com/images/wow/icons/large/${iconName}.jpg`;
        const embedColor = QUALITY_COLORS[qualityId] || '#ffffff';

        console.log(`[LOG] ¡Objeto encontrado! ID: ${itemId} | Nombre: ${name}`);

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
        console.log(`[LOG] No se encontró el objeto "${rawItemName}" en Wowhead.`);
      }
    } catch (error) {
      console.error(`[ERROR] Procesando "${rawItemName}":`, error.message);
    }
  }
});

client.login(TOKEN);