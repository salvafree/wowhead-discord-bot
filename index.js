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

  // Log para comprobar si el bot lee los mensajes del chat
  console.log(`[LOG] Mensaje recibido de ${message.author.tag}: "${message.content}"`);

  const matches = message.content.match(/\[(.*?)\]/g);
  if (!matches) {
    console.log(`[LOG] No se han encontrado corchetes [...] en el mensaje.`);
    return;
  }

  console.log(`[LOG] Coincidencias encontradas:`, matches);

  for (const match of matches) {
    const itemName = match.slice(1, -1).trim();
    if (!itemName) continue;

    try {
      const searchUrl = `https://www.wowhead.com/item=${encodeURIComponent(itemName)}&xml`;
      console.log(`[LOG] Consultando Wowhead para "${itemName}" -> URL: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      const result = await xmlParser.parseStringPromise(response.data);

      if (result && result.wowhead && result.wowhead.item) {
        const itemData = result.wowhead.item[0];
        const itemId = itemData.$.id;
        const name = itemData.name[0];
        const iconName = itemData.icon ? itemData.icon[0]._ : 'inv_misc_questionmark';
        const qualityId = itemData.quality ? parseInt(itemData.quality[0].$.id) : 1;
        
        // URLs corregidas (sin formato markdown duplicado)
        const itemUrl = `https://www.wowhead.com/item=${itemId}`;
        const iconUrl = `https://wowhead.zamimg.com/images/wow/icons/large/${iconName.toLowerCase()}.jpg`;
        const embedColor = QUALITY_COLORS[qualityId] || '#ffffff';

        console.log(`[LOG] ¡Objeto encontrado! ID: ${itemId} | Nombre: ${name} | Icono: ${iconName}`);

        const embed = new EmbedBuilder()
          .setTitle(name)
          .setURL(itemUrl)
          .setThumbnail(iconUrl)
          .setColor(embedColor);

        await message.reply({
          embeds: [embed],
          allowedMentions: { repliedUser: false }
        });
        console.log(`[LOG] Respuesta enviada con éxito para "${name}"`);
      } else {
        console.log(`[LOG] Wowhead no devolvió resultados válidos para "${itemName}".`);
      }
    } catch (error) {
      console.error(`[ERROR] Buscando "${itemName}":`, error.message);
    }
  }
});

client.login(TOKEN);