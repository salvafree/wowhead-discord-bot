const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
    .replace(/[^a-z0-9]+/g, " ")     // Guiones, comas, ap\u00f3strofes -> espacio
    .trim();
}

// ---- Local name index (built by `node build-index.js`) ----
const LOCALES = [
  { code: 'en', path: '', col: 1 },
  { code: 'es', path: 'es/', col: 2 },
  { code: 'fr', path: 'fr/', col: 3 },
];

const { items } = JSON.parse(fs.readFileSync(path.join(__dirname, 'items.json'), 'utf8'));

// One list per language: { id, name, norm } where norm is the accent-free lowercase name
const INDEX = LOCALES.map(locale => ({
  locale,
  entries: items.map(row => ({ id: row[0], name: row[locale.col], norm: sanitizeQuery(row[locale.col]) })),
}));

function searchLocale({ locale, entries }, query) {
  const exact = entries.find(e => e.norm === query);
  if (exact) return { locale, id: exact.id, name: exact.name, score: 0 };
  // No exact match: prefer names that start with the query, then ones that contain it.
  // Among those, the shortest name is the closest match.
  const starts = entries.filter(e => e.norm.startsWith(query));
  const pool = starts.length ? starts : entries.filter(e => e.norm.includes(query));
  if (pool.length === 0) return null;
  const best = pool.reduce((a, b) => (b.norm.length < a.norm.length ? b : a));
  return { locale, id: best.id, name: best.name, score: starts.length ? 1 : 2 };
}

// Search en, es and fr; the best match wins (exact > starts with > contains)
function findItem(query) {
  const hits = INDEX.map(idx => searchLocale(idx, query)).filter(Boolean);
  if (hits.length === 0) return null;
  return hits.reduce((a, b) => (b.score < a.score ? b : a));
}

// Icon and quality come from Wowhead's tooltip API (works by ID, in each language)
async function getTooltip(locale, id) {
  const url = `https://nether.wowhead.com/forever/${locale.path}tooltip/item/${id}`;
  const { data } = await axios.get(url, { timeout: 5000 });
  return data; // { name, quality, icon, tooltip }
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

      // Look the name up in the local index (all languages at once)
      const found = findItem(cleanQuery);

      if (found) {
        const itemId = found.id;
        let name = found.name;
        let iconName = 'inv_misc_questionmark';
        let qualityId = 1;

        // The embed still works if the tooltip call fails: we just lose icon/colour
        try {
          const tip = await getTooltip(found.locale, itemId);
          name = tip.name || name;
          iconName = tip.icon ? tip.icon.toLowerCase() : iconName;
          qualityId = tip.quality !== undefined ? tip.quality : qualityId;
        } catch (e) {
          console.error(`[ERROR] Tooltip ${itemId}:`, e.message);
        }

        // Link in the same language the item was found in (English has no prefix)
        const itemUrl = `https://www.wowhead.com/forever/${found.locale.path}item=${itemId}`;
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