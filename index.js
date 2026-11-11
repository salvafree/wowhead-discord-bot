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

// Función para transformar nombres con tildes y espacios en slugs válidos para Wowhead
// Ej: "Poción de curación menor" -> "pocion-de-curacion-menor"
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina tildes y marcas diacríticas
    .replace(/['']/g, "")            // Elimina apóstrofes
    .replace(/[^a-z0-9\s-]/g, "")    // Elimina caracteres especiales
    .trim()
    .replace(/\s+/g, "-");           // Reemplaza espacios por guiones
}

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
      const itemSlug = slugify(itemName);
      console.log(`[LOG] Buscando objeto: "${itemName}" -> Slug: "${itemSlug}"`);

      // Probamos los dominios en orden: Español, Francés e Inglés
      const domains = ['es.wowhead.com', 'fr.wowhead.com', 'www.wowhead.com'];
      let itemData = null;
      let targetDomain = '';

      for (const domain of domains) {
        try {
          const tooltipUrl = `https://${domain}/tooltip/item/${itemSlug}`;
          const response = await axios.get(tooltipUrl, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/javascript, */; q=0.01',
              'Referer': `https://${domain}/`
            },
            timeout: 4000
          });

          if (response.data && response.data.name) {
            itemData = response.data;
            targetDomain = domain;
            break; // Encontrado, salimos del bucle
          }
        } catch (e) {
          // Si da 404 en este dominio, probamos el siguiente idioma
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
        console.log(`[LOG] No se encontró el objeto "${itemName}" en ningún dominio.`);
      }
    } catch (error) {
      console.error(`[ERROR] Procesando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);