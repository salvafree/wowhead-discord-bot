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
      console.log(`[LOG] Consultando Wowhead para: "${itemName}"...`);

      // Usamos el endpoint directo de tooltips por nombre normalizado que Wowhead utiliza internamente
      // Probamos primero en español (es), luego francés (fr) e inglés (www)
      const domains = ['es.wowhead.com', 'fr.wowhead.com', 'www.wowhead.com'];
      let itemData = null;
      let targetDomain = '';

      for (const domain of domains) {
        try {
          const tooltipUrl = `https://${domain}/tooltip/item/${encodeURIComponent(itemName.toLowerCase())}`;
          const response = await axios.get(tooltipUrl, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'Referer': `https://${domain}/`
            },
            timeout: 4000
          });

          if (response.data && response.data.name) {
            itemData = response.data;
            targetDomain = domain;
            break;
          }
        } catch (e) {
          // Si da 404 en este idioma, probamos el siguiente
        }
      }

      if (itemData) {
        const itemId = itemData.id;
        const name = itemData.name;
        const iconName = itemData.icon ? itemData.icon.toLowerCase() : 'inv_misc_questionmark';
        const qualityId = itemData.quality !== undefined ? itemData.quality : 1;
        
        const itemUrl = `https://${targetDomain}/item=${itemId}`;
        const iconUrl = `https://wowhead.zamimg.com/images/wow/icons/large/${iconName}.jpg`;
        const embedColor = QUALITY_COLORS[qualityId] || '#ffffff';

        console.log(`[LOG] ¡Objeto encontrado en ${targetDomain}! ID: ${itemId} | Nombre: ${name}`);

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
        console.log(`[LOG] No se pudo resolver el objeto "${itemName}" en ningún dominio.`);
      }
    } catch (error) {
      console.error(`[ERROR] Procesando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);