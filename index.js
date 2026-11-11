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
  0: '#9d9d9d',
  1: '#ffffff',
  2: '#1eff00',
  3: '#0070dd',
  4: '#a335ee',
  5: '#ff8000',
  6: '#e6cc80',
  7: '#00ccff',
};

client.once('clientReady', () => {
  console.log(`Bot Forever listo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const matches = message.content.match(/\[(.*?)\]/g);
  if (!matches) return;

  for (const match of matches) {
    const itemName = match.slice(1, -1).trim();
    if (!itemName) continue;

    try {
      console.log(`[LOG] Buscando objeto: "${itemName}"...`);

      // Usamos cabeceras HTTP de un navegador real de escritorio para evitar el 403 de Cloudflare
      const searchUrl = `https://www.wowhead.com/search/suggest?q=${encodeURIComponent(itemName)}`;
      
      const response = await axios.get(searchUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8,fr;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
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
        const name = itemResult.name || itemName;
        const iconName = itemResult.icon ? itemResult.icon.toLowerCase() : 'inv_misc_questionmark';
        const qualityId = itemResult.quality !== undefined ? itemResult.quality : 1;
        
        // Enlace estructurado Forever en español
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
        console.log(`[LOG] No se encontró el objeto "${itemName}" en Wowhead.`);
      }
    } catch (error) {
      console.error(`[ERROR] Procesando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);