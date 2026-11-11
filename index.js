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

// Colores de rareza de WoW en Hexadecimal
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
  console.log(`Bot Forever multilingüe listo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const matches = message.content.match(/\[(.*?)\]/g);
  if (!matches) return;

  for (const match of matches) {
    const itemName = match.slice(1, -1).trim();
    if (!itemName) continue;

    try {
      console.log(`[LOG] Buscando en Wowhead: "${itemName}"...`);

      // Dominios a probar en orden: Español, Francés e Inglés
      const domains = ['es.wowhead.com', 'fr.wowhead.com', 'www.wowhead.com'];
      let itemResult = null;
      let targetDomain = '';

      for (const domain of domains) {
        try {
          const searchUrl = `https://${domain}/search/suggest?q=${encodeURIComponent(itemName)}`;
          
          const response = await axios.get(searchUrl, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*'
            },
            timeout: 4000
          });

          const data = response.data;
          if (data) {
            const results = Array.isArray(data) ? data : (data.results || data.items || []);
            const found = results.find(r => r.type === 3 || r.typeName === 'Item') || results[0];

            if (found) {
              itemResult = found;
              targetDomain = domain;
              break; // ¡Encontrado! Salimos del bucle
            }
          }
        } catch (e) {
          // Si falla en este dominio, probamos el siguiente idioma
        }
      }

      if (itemResult) {
        const itemId = itemResult.id;
        const name = itemResult.name || itemName;
        const iconName = itemResult.icon ? itemResult.icon.toLowerCase() : 'inv_misc_questionmark';
        const qualityId = itemResult.quality !== undefined ? itemResult.quality : 1;
        
        // Adaptado a la estructura Forever que descubriste (/forever/es/item=ID)
        const langCode = targetDomain.split('.')[0]; // 'es', 'fr' o 'www' (si es www podemos usar 'en' o dejarlo limpio)
        const pathLang = langCode === 'www' ? 'en' : langCode;
        
        const itemUrl = `https://${targetDomain}/forever/${pathLang}/item=${itemId}`;
        const iconUrl = `https://wowhead.zamimg.com/images/wow/icons/large/${iconName}.jpg`;
        const embedColor = QUALITY_COLORS[qualityId] || '#ffffff';

        console.log(`[LOG] ¡Encontrado en ${targetDomain}! ID: ${itemId} | Nombre: ${name}`);

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
        console.log(`[LOG] No se encontró el objeto "${itemName}" en ningún idioma.`);
      }
    } catch (error) {
      console.error(`[ERROR] Procesando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);