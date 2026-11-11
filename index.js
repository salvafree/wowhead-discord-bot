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
      console.log(`[LOG] Buscando objeto: "${itemName}"...`);

      // Dominios a probar en orden: Español, Francés e Inglés/Global
      const domains = ['es.wowhead.com', 'fr.wowhead.com', 'www.wowhead.com'];
      let itemResult = null;
      let targetDomain = 'www.wowhead.com';

      for (const domain of domains) {
        try {
          const searchUrl = `https://${domain}/search?q=${encodeURIComponent(itemName)}&formatting=json`;
          const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 4000
          });

          const data = response.data;
          if (data && data.i && data.i.length > 0) {
            itemResult = data.i[0];
            targetDomain = domain;
            break; // Objeto encontrado, salimos del bucle
          }
        } catch (err) {
          // Si falla un dominio, probamos con el siguiente
        }
      }

      if (itemResult) {
        const itemId = itemResult.id;
        const name = itemResult.name;
        const iconName = itemResult.icon ? itemResult.icon.toLowerCase() : 'inv_misc_questionmark';
        const qualityId = itemResult.quality !== undefined ? itemResult.quality : 1;
        
        // El enlace y el idioma se adaptan automáticamente al dominio que encontró el objeto
        const itemUrl = `https://${targetDomain}/item=${itemId}`;
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
        console.log(`[LOG] No se encontró resultado para "${itemName}" en ningún idioma.`);
      }
    } catch (error) {
      console.error(`[ERROR] Procesando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);