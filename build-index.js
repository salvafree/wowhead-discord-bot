// Builds items.json: a local name index for WoW Forever items in en/es/fr.
// Run with:  node build-index.js
// Re-run it whenever a new Forever build comes out.
const axios = require('axios');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const PRODUCT = 'wowf'; // wago.tools product id for Forever
const LOCALES = { en: 'enUS', es: 'esES', fr: 'frFR' };

async function main() {
  // 1. Ask wago.tools for the newest Forever build
  const builds = (await axios.get('https://wago.tools/api/builds', { timeout: 15000 })).data;
  const build = builds[PRODUCT][0].version; // newest first
  console.log(`Build Forever: ${build}`);

  // 2. Download the item table once per language
  const names = {}; // id -> { en, es, fr }
  for (const [short, locale] of Object.entries(LOCALES)) {
    const url = `https://wago.tools/db2/ItemSparse/csv?build=${build}&locale=${locale}`;
    const { data } = await axios.get(url, { timeout: 120000, responseType: 'text' });
    const rows = parse(data, { columns: true, skip_empty_lines: true, relax_quotes: true });
    for (const row of rows) {
      if (!row.Display_lang) continue; // some rows have no name in this language
      names[row.ID] = names[row.ID] || {};
      names[row.ID][short] = row.Display_lang;
    }
    console.log(`${short}: ${rows.length} filas`);
  }

  // 3. Keep it compact: [id, en, es, fr]. Missing translations fall back to English.
  const items = Object.entries(names).map(([id, n]) => {
    const en = n.en || n.es || n.fr;
    return [Number(id), en, n.es || en, n.fr || en];
  });

  fs.writeFileSync('items.json', JSON.stringify({ build, items }));
  console.log(`items.json escrito con ${items.length} objetos`);
}

main().catch(err => {
  console.error('Error construyendo el índice:', err.message);
  process.exit(1);
});
