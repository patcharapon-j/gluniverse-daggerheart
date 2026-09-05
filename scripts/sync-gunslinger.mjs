/** Compile the approved Markdown into isolated Foundry compendium sources. */
import { readFile, writeFile } from 'node:fs/promises';
import { classItem, subclassCards, domainCardItem, weaponItem, feat, rt } from '../src/packs-src/_helpers.mjs';

const read = async (name) => (await readFile(new URL(`../homebrew/gunslinger/${name}.md`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const [cls, artifice, weapons, kass, readme] = await Promise.all(['class', 'artifice', 'weapons', 'kass', 'README'].map(read));
function section(text, heading) {
  const marker = `${heading}\n`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`Missing section: ${heading}`);
  const rest = text.slice(start + marker.length);
  const depth = heading.match(/^#+/)[0].length;
  const end = rest.search(new RegExp(`^#{1,${depth}} `, 'm'));
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}
const inline = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/\*([^*]+)\*/g, '<i>$1</i>');
/** The source uses headings, paragraphs, flat lists and tables; preserve all four. */
function html(text) {
  return text.trim().split(/\n\s*\n/).map(block => {
    if (/^\|/.test(block)) {
      const rows = block.split('\n').filter(line => !/^\|[\s:|\-]+\|$/.test(line));
      return '<table>' + rows.map((row, i) => '<tr>' + row.slice(1, -1).split('|').map(cell => `<${i ? 'td' : 'th'}>${inline(cell.trim())}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('') + '</table>';
    }
    const heading = block.match(/^(#{1,6}) (.+)$/);
    if (heading) return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    if (/^(?:- |\d+\. )/.test(block)) {
      const ordered = /^\d/.test(block), tag = ordered ? 'ol' : 'ul';
      return `<${tag}>` + block.split(/\n(?=- |\d+\. )/).map(line => `<li>${inline(line.replace(/^(?:- |\d+\. )/, ''))}</li>`).join('') + `</${tag}>`;
    }
    return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
  }).join('\n');
}
const block = (name, text) => ({ name, description: html(text), modifiers: [] });
const questions = (heading) => section(cls, heading).split('\n').map(s => s.replace(/^\d+\. /, ''));
// Card presentation supports paragraphs and bullets. Keep the full table in the journal.
const trick = section(cls, '## Class feature: Trick Shot').replace(/^\| Effect[^\n]*\n\|[\s|\-]+\|\n/m, '')
  .replace(/^\| (.+?) \| (.+?) \|$/gm, '- $1: $2');
const items = [classItem({ name: 'Gunslinger', description: cls.split('\n\n')[2], domains: ['bone', 'artifice'],
  evasion: 10, hitPoints: 6, items: section(cls, '### Starting possessions'),
  features: feat('Trick Shot', trick), hopeFeature: block('Against the Odds', section(cls, '## Hope feature: Against the Odds')),
  background: questions('### Background questions'), connections: questions('### Connection questions'),
})];
for (const name of ['Drifter', 'Sharpshooter']) {
  const body = section(cls, `## ${name}`);
  const ranks = Object.fromEntries(['Foundation', 'Specialization', 'Mastery'].map(rank => [rank.toLowerCase(),
    section(body, `### ${rank} card`).split('\n\n').map(text => {
      const match = text.match(/^\*\*(.+?)\.\*\* ([\s\S]+)$/);
      if (!match) throw new Error(`Invalid feature in ${name}: ${text}`);
      return feat(match[1], match[2]);
    })]));
  items.push(...subclassCards({ name, className: 'Gunslinger', description: body.split('\n\n')[0], ranks }));
}
for (const match of artifice.matchAll(/^## Level (\d+): (.+)\n\n\*\*Type:\*\* Ability · \*\*Recall:\*\* (\d+)\n\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)) {
  const [, level, name, recall, text] = match;
  const item = domainCardItem({ name, domain: 'artifice', level: +level, recall: +recall, text: text.trim() });
  if (name === 'Artifice-Touched') item.system.modifiers = [{ target: 'trait', trait: 'finesse', value: 1, condition: 'domain', minimum: 4 }];
  items.push(item);
}
const features = Object.fromEntries([...weapons.matchAll(/^\*\*(.+?)\.\*\* (.+)$/gm)].map(m => [m[1], m[2]]));
const prefixes = ['Workshop', 'Improved Workshop', 'Advanced Workshop', 'Legendary Workshop'];
for (const row of weapons.split('\n').filter(line => /^\| (?:Pocket Flintlock|Boarding Pistol|Long Musket|Deck Blunderbuss|Turning Pepperbox|Brace Cannon|Sleeve Flintlock) \|/.test(line))) {
  const cells = row.slice(1, -1).split('|').map(s => s.trim());
  if (cells.length !== 9) continue; // Ignore the later comparison table.
  const [family, trait, range, burden, ...rest] = cells;
  const featureName = rest[4];
  for (let tier = 1; tier <= 4; tier++) {
    const feature = { name: featureName, description: features[featureName] };
    if (!feature.description) throw new Error(`Missing feature ${featureName}`);
    if (featureName === 'Recoil') Object.assign(feature, { ev: -1, modifiers: [{ target: 'evasion', value: -1 }] });
    // Paired depends on the target's distance, which cannot be inferred from the equipped primary's range.
    if (featureName === 'Paired') feature.description = `Add +${tier + 1} to primary weapon damage against targets within Melee range. Add the bonus once to a damaging attack. It does not apply when Trick Shot replaces that damage.`;
    const item = weaponItem({ name: `${prefixes[tier - 1]} ${family}`, tier, slot: family === 'Sleeve Flintlock' ? 'secondary' : 'primary',
      trait: trait.toLowerCase(), range: range[0].toLowerCase() + range.slice(1).replace(/ /g, ''),
      burden: burden === 'One-handed' ? 'oneHanded' : 'twoHanded', damage: rest[tier - 1], feature });
    item.system.description = rt('Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.');
    items.push(item);
  }
}
// Each subclass shares one painting across foundation, specialization, and mastery.
const artwork = {
  Gunslinger: 'gunslinger', Drifter: 'drifter', Sharpshooter: 'sharpshooter',
  Fieldwork: 'fieldwork', 'Fault Finder': 'fault-finder', 'Make Do': 'make-do',
  'Smoke Pot': 'smoke-pot', 'Something Worth Keeping': 'something-worth-keeping',
};
for (const item of items) {
  const painting = artwork[item.type === 'subclass' ? item.system.subclassName : item.name];
  if (painting) item.img = `systems/gluniverse-daggerheart/assets/cards/gunslinger/${painting}.png`;
  item.flags = { 'gluniverse-daggerheart': { contentPackage: 'gunslinger', homebrewVersion: '0.1' } };
}
if (items.length !== 56) throw new Error(`Expected 56 items, got ${items.length}`);
const journals = [{ name: 'Gunslinger Playtest Rules', sourceKey: 'gunslinger-v01', pages: [
  ['Package conventions', section(readme, '## Package conventions')], ['Gunslinger and subclasses', cls],
  ['Artifice', artifice], ['Expanded firearms', weapons], ['Kass conversion examples', kass],
].map(([name, text]) => ({ name, text: { content: html(text), format: 1 } })) }];
for (const [name, data] of [['gunslinger', items], ['gunslinger-rules', journals]]) {
  const path = new URL(`../src/packs-src/${name}.mjs`, import.meta.url);
  const output = '// Generated from homebrew/gunslinger by scripts/sync-gunslinger.mjs. Edit the Markdown source.\nexport default ' + JSON.stringify(data, null, 2) + ';\n';
  if (process.argv.includes('--check')) {
    if ((await readFile(path, 'utf8')).replace(/\r\n/g, '\n') !== output) throw new Error(`${name} is out of date; run node scripts/sync-gunslinger.mjs`);
  } else await writeFile(path, output);
}
console.log(`Gunslinger: ${items.length} items and ${journals[0].pages.length} rule pages ${process.argv.includes('--check') ? 'verified' : 'generated'}.`);
