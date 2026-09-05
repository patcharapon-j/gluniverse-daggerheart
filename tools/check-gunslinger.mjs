import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ITEMS from '../src/packs-src/gunslinger.mjs';
import RULES from '../src/packs-src/gunslinger-rules.mjs';
import { DOMAINS, DOMAIN_CONFIG, RANGES, BURDENS, SYSTEM_ID } from '../src/module/config.ts';
import { byslug, CLASSES } from '../src/module/ui/domains.js';
import { fromPack, takeClass, takeSubclass, takeCard, takeWeapon } from '../src/module/apps/creation.ts';
import { gunslingerEnabled, supplementalItems, contentChoiceAllowed, contentPackAllowed, registerGunslingerSettings, GUNSLINGER_PACK, GUNSLINGER_RULES_PACK, GUNSLINGER_SETTING, CONTENT_CHANGED } from '../src/module/gunslinger.ts';
import { modifierTotal, traitPassiveTotal, weaponModifierTerms } from '../src/module/data/modifiers.ts';
globalThis.foundry = { abstract: { TypeDataModel: class {} }, utils: { getRoute: path => path } };
const { ourPacks } = await import('../src/module/apps/browse-index.ts');
const { handleActorDrop } = await import('../src/module/apps/svelte-sheets.ts');
const { cardOf } = await import('../src/module/sheets/cards.ts');

assert.equal(ITEMS.length, 56);
assert.equal(new Set(ITEMS.map(i => i.name)).size, 56);
assert.equal(ITEMS.filter(i => i.type === 'class').length, 1);
const cls = ITEMS.find(i => i.type === 'class');
assert.deepEqual(cls.system.domains, { primary: 'bone', secondary: 'artifice' });
assert.equal(cls.system.startingEvasion, 10);
assert.equal(cls.system.startingHitPoints, 6);
assert.equal(cardOf(cls, {}).cls, 'grow', 'long class rules use the existing expandable card layout');
assert.equal(cardOf(cls, {}).noart, false, 'Gunslinger uses its imported painting');
assert.equal(cardOf(ITEMS.find(i => i.type === 'subclass'), {}).d2.slug, 'artifice');
assert.match(cls.system.classFeatures[0].description, /instead of all damage/);
assert.match(cls.system.classFeatures[0].description, /Disarm/);
for (const subclass of ['Drifter', 'Sharpshooter']) {
  const stages = ITEMS.filter(i => i.system.subclassName === subclass);
  assert.deepEqual(stages.map(i => i.system.rank), ['foundation', 'specialization', 'mastery']);
  assert.equal(new Set(stages.map(i => i.img)).size, 1, 'all ranks share their subclass painting');
  for (const stage of stages) assert.equal(cardOf(stage, {}).noart, false);
  for (const stage of stages) { assert.equal(stage.system.spellcastTrait, ''); assert.equal(stage.system.features.length, 2); }
}
const cards = ITEMS.filter(i => i.type === 'domainCard');
for (const card of cards.filter(i => i.system.level <= 2)) assert.equal(cardOf(card, {}).noart, false);
assert.equal(cards.length, 21);
for (let level = 1; level <= 10; level++) assert.equal(cards.filter(i => i.system.level === level).length, level === 1 ? 3 : 2);
for (const card of cards) { assert.equal(card.system.domain, 'artifice'); assert.equal(card.system.cardType, 'ability'); assert.ok(card.system.description.length > 100); }
const weapons = ITEMS.filter(i => i.type === 'weapon');
assert.equal(weapons.length, 28);
for (let tier = 1; tier <= 4; tier++) {
  assert.equal(weapons.filter(i => i.system.tier === tier && i.system.slot === 'primary').length, 6);
  assert.equal(weapons.filter(i => i.system.tier === tier && i.system.slot === 'secondary').length, 1);
}
for (const item of ITEMS) {
  assert.ok(existsSync(item.img.replace(`systems/${SYSTEM_ID}/`, '')), item.img);
  assert.equal(item.flags[SYSTEM_ID].contentPackage, 'gunslinger');
  if (item.type === 'weapon') { assert.ok(RANGES.includes(item.system.range)); assert.ok(BURDENS.includes(item.system.burden)); assert.equal(item.system.damage.type, 'physical'); }
}
assert.ok(DOMAINS.includes('artifice'));
assert.equal(DOMAIN_CONFIG.artifice.light, byslug.artifice.light);
assert.ok(CLASSES.includes('gunslinger'));
assert.equal(RULES[0].pages.length, 5);
assert.match(RULES[0].pages.find(p => p.name === 'Artifice').text.content, /Moving a card to your vault ends/);
assert.match(RULES[0].pages.find(p => p.name === 'Expanded firearms').text.content, /<table>/);
const manifest = JSON.parse(readFileSync('system.json', 'utf8'));
for (const name of ['gunslinger', 'gunslinger-rules']) assert.equal(manifest.packs.filter(p => p.name === name).length, 1);

// Exercise the real readers, registration, stale-choice guards, and owned passives.
let enabled = false, supplementalReads = 0, registration, renders = 0;
const hooks = new Map();
globalThis.Hooks = { on: (key, fn) => hooks.set(key, fn), callAll: key => hooks.get(key)?.() };
globalThis.ui = { compendium: { render: () => renders++ } };
const pack = (collection, docs, type = 'Item') => ({ collection, metadata: { system: SYSTEM_ID, type }, getDocuments: async () => docs });
const custom = pack(GUNSLINGER_PACK, ITEMS);
custom.getDocuments = async () => { supplementalReads++; return ITEMS; };
const core = { name: 'Existing class', type: 'class' };
const packs = new Map([[`${SYSTEM_ID}.classes`, pack(`${SYSTEM_ID}.classes`, [core])], [GUNSLINGER_PACK, custom], [GUNSLINGER_RULES_PACK, pack(GUNSLINGER_RULES_PACK, RULES, 'JournalEntry')]]);
packs[Symbol.iterator] = function* () { yield* this.values(); };
globalThis.game = { packs, settings: { get: (_id, key) => key === GUNSLINGER_SETTING ? enabled : false, register: (_id, key, value) => { assert.equal(key, GUNSLINGER_SETTING); registration = value; } } };
registerGunslingerSettings();
assert.equal(registration.default, false); assert.equal(registration.scope, 'world'); assert.equal(registration.config, true);
assert.equal(gunslingerEnabled(), false);
assert.deepEqual(await fromPack('classes'), [core]);
assert.equal(supplementalReads, 0);
assert.equal(ourPacks().some(p => p.collection === GUNSLINGER_PACK), false);
assert.equal(contentPackAllowed(GUNSLINGER_RULES_PACK), false);
enabled = true;
assert.equal((await fromPack('classes')).length, 8);
assert.equal((await fromPack('classes', 'subclass')).length, 6);
assert.equal((await fromPack('domains', 'domainCard')).length, 21, 'homebrew survives a missing core pack');
assert.equal((await fromPack('equipment')).length, 28);
assert.deepEqual(await supplementalItems('heritage'), []);
assert.equal(ourPacks().some(p => p.collection === GUNSLINGER_PACK), true);
assert.equal(contentPackAllowed(GUNSLINGER_RULES_PACK), true);
// Turn off while a request is in flight. Its results must not leak through.
custom.getDocuments = async () => { enabled = false; return ITEMS; };
assert.deepEqual(await supplementalItems('classes'), []);
const untouched = { update: () => assert.fail('Disabled choice modified actor'), createEmbeddedDocuments: () => assert.fail('Disabled choice granted item'), deleteEmbeddedDocuments: () => assert.fail('Disabled choice deleted item') };
await takeClass(untouched, cls, null);
await takeSubclass(untouched, ITEMS.find(i => i.type === 'subclass'));
await takeCard(untouched, cards[0]);
await takeWeapon(untouched, weapons[0], 'primary');
let warned = false;
ui.notifications = { warn: () => { warned = true; } };
game.i18n = { localize: s => s };
globalThis.fromUuid = async () => cls;
assert.deepEqual(await handleActorDrop(untouched, { dataTransfer: { getData: () => JSON.stringify({ type: 'Item', uuid: 'test' }) } }), []);
assert.ok(warned, 'a stale compendium drag explains why it was refused');
assert.equal(contentChoiceAllowed({ _stats: { compendiumSource: `Compendium.${GUNSLINGER_PACK}.Item.abc` } }), false);
assert.equal(contentChoiceAllowed({ ...cls, parent: { documentName: 'Actor' } }), true);
let changed = false; hooks.set(CONTENT_CHANGED, () => { changed = true; });
registration.onChange(); assert.ok(changed); assert.equal(renders, 1);
globalThis.HTMLElement = class {};
const rows = [{ hidden: false, style: {} }, { hidden: false, style: {} }];
const root = new HTMLElement(); root.querySelectorAll = selector => [rows[selector.includes('gunslinger-rules') ? 1 : 0]];
hooks.get('renderCompendiumDirectory')({}, root); assert.ok(rows.every(r => r.hidden));
enabled = true; hooks.get('renderCompendiumDirectory')({}, [root]); assert.ok(rows.every(r => !r.hidden));
enabled = false;
const own = (item, fields = {}) => ({ ...structuredClone(item), id: item.name, system: { ...structuredClone(item.system), ...fields } });
const cannon = own(weapons.find(i => i.name === 'Workshop Brace Cannon'), { equipped: true });
assert.equal(modifierTotal({ items: [cannon] }, 'evasion'), -1, 'owned penalty survives toggle off');
const touched = own(cards.find(i => i.name === 'Artifice-Touched'), { inLoadout: true });
const actor = { items: [touched, ...cards.slice(0, 3).map(i => own(i, { inLoadout: true }))] };
assert.equal(traitPassiveTotal(actor, 'finesse'), 1);
actor.items.pop(); assert.equal(traitPassiveTotal(actor, 'finesse'), 0);
const sleeve = own(weapons.find(i => i.name === 'Workshop Sleeve Flintlock'), { equipped: true });
assert.deepEqual(weaponModifierTerms({ items: [sleeve] }, { id: 'primary', system: { slot: 'primary', range: 'melee' } }, 'damage'), [], 'situational Paired must not inherit legacy automation');
console.log('Gunslinger: content, toggle, picker races, directory visibility, and owned passive checks passed.');
