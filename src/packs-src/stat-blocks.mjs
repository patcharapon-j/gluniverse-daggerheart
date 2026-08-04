/**
 * Parser for the adversary and environment stat blocks extracted from the
 * two books in docs/rules. The Markdown is generated from the PDFs, so this
 * module deliberately treats those files as the single source of truth.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { featureItem, typeGlyph } from "./_helpers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GLYPH_TIER = { "\uE541": 1, "\uE542": 2, "\uE543": 3, "\uE544": 4 };
const ROLE = new Set([
  "bruiser", "horde", "leader", "minion", "ranged",
  "skulk", "social", "solo", "standard", "support",
]);
const ENVIRONMENT_KIND = new Set(["exploration", "social", "traversal", "event"]);
const ATTACK_RX = /ATK:\s*([+−–—-]?(?:\d*d\d+|\d+))\s*\|\s*([^|]+?):\s*(Very Close|Very Far|Melee|Close|Far)\s*\|\s*(\d*d\d+(?:\s*[+−–—-]\s*\d+)?|\d+)\s*(direct\s+)?(phy|mag)/i;

const BOOKS = {
  core: {
    label: "Core Rulebook",
    title: "Daggerheart Core Rulebook",
    directory: "corebook",
    adversaries: [
      "36-chapter-4-tier-1-adversaries.md",
      "37-chapter-4-tier-2-adversaries.md",
      "38-chapter-4-tier-3-adversaries.md",
      "39-chapter-4-tier-4-adversaries.md",
    ],
    environments: ["41-chapter-4-enviroment-stat-blocks.md"],
  },
  hopeAndFear: {
    label: "Hope & Fear",
    title: "Daggerheart: Hope and Fear",
    directory: "hope-and-fear",
    adversaries: [
      "15-chapter-3-tier-1-adversaries.md",
      "16-chapter-3-tier-2-adversaries.md",
      "17-chapter-3-tier-3-adversaries.md",
      "18-chapter-3-tier-4-adversaries.md",
    ],
    environments: [
      "20-chapter-3-tier-1-environments.md",
      "21-chapter-3-tier-2-environments.md",
      "22-chapter-3-tier-3-environments.md",
      "23-chapter-3-tier-4-environments.md",
    ],
  },
};

const clean = (value = "") => String(value)
  .replace(/\uFB00/g, "ff")
  .replace(/\uFB01/g, "fi")
  .replace(/\uFB02/g, "fl")
  .replace(/\uFB03/g, "ffi")
  .replace(/\uFB04/g, "ffl")
  .replace(/[ \t]+/g, " ")
  .replace(/\s+([,.;:!?])/g, "$1")
  .trim();

const signed = (value) => Number(String(value).replace(/[−–—]/g, "-"));

const titleCase = (value) => {
  const small = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with"]);
  return clean(value).toLocaleLowerCase("en-US").split(/(\s+)/).map((word, index) => {
    if (/^\s+$/.test(word)) return word;
    const bare = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (index > 0 && small.has(bare)) return word;
    return word.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("en-US"));
  }).join("");
};

const escapeHtml = (value) => clean(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/_([^_]+)_/g, "<em>$1</em>")
  .replace(/\n/g, "<br>");

const sourceNote = (book, printedPage) =>
  `<p><strong>Source:</strong> ${book.title}${printedPage ? `, p. ${printedPage}` : ""}.</p>`;

function pageAt(lines, index) {
  for (let i = index; i >= 0; i -= 1) {
    const match = lines[i].match(/printed-page:(\d+)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function headingBefore(lines, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const match = lines[i].match(/^###\s+(.+?)\s*$/);
    if (!match) continue;
    const name = clean(match[1]);
    if (name === "FEATURES" || /^TIER \d/.test(name)) continue;
    return titleCase(name);
  }
  throw new Error(`No stat-block heading before line ${index + 1}`);
}

function trimBlock(lines) {
  const out = [...lines];
  while (out.length) {
    const line = out.at(-1).trim();
    if (!line || line.startsWith("<!--") || line.startsWith("### ")) out.pop();
    else break;
  }
  return out;
}

function featureDocuments(lines, origin) {
  const featureHeading = lines.findIndex((line) => line.trim() === "### FEATURES");
  if (featureHeading < 0) return [];

  let prose = trimBlock(lines.slice(featureHeading + 1))
    .filter((line) => !line.startsWith("<!--") && !line.startsWith("### "))
    .join("\n")
    .trim();

  // PDF extraction occasionally joins the next feature to the end of the
  // previous sentence. Restore the boundary before parsing feature headers.
  prose = prose.replace(
    /([.!?:])\s+([A-Z0-9][A-Za-z0-9À-ž’'!?(),/&+\- ]{0,80} - (?:Passive|Action|Reaction|Evolution):)/g,
    "$1\n$2",
  );

  const header = /(?:^|\n)([A-Z0-9][^\n]{0,100}?) - (Passive|Action|Reaction|Evolution):\s*/g;
  const matches = [...prose.matchAll(header)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? prose.length;
    const text = clean(prose.slice(start, end));
    const fear = text.match(/Spend (?:a|an|one|1|two|2|three|3) Fear/i)?.[0] ?? "";
    const stress = text.match(/Mark (?:a|an|one|1|two|2|three|3) Stress/i)?.[0] ?? "";
    const cost = (phrase) => {
      if (!phrase) return 0;
      if (/two|2/i.test(phrase)) return 2;
      if (/three|3/i.test(phrase)) return 3;
      return 1;
    };
    return featureItem({
      name: clean(match[1]),
      text,
      kind: match[2].toLowerCase(),
      origin,
      fearCost: cost(fear),
      stressCost: cost(stress),
    });
  });
}

function blocks(book, filenames) {
  const found = [];
  for (const filename of filenames) {
    const path = join(ROOT, "docs", "rules", book.directory, filename);
    const lines = readFileSync(path, "utf8").replace(/\r/g, "").split("\n");
    const starts = lines
      .map((line, index) => (/^Tier [\uE541-\uE544] /.test(line) ? index : -1))
      .filter((index) => index >= 0);

    for (let n = 0; n < starts.length; n += 1) {
      const index = starts[n];
      const next = starts[n + 1] ?? lines.length;
      found.push({
        book,
        filename,
        name: headingBefore(lines, index),
        tierLine: clean(lines[index]),
        lines: trimBlock(lines.slice(index + 1, next)),
        printedPage: pageAt(lines, index),
      });
    }
  }
  return found;
}

function parseLead(block, label) {
  const match = block.tierLine.match(/^Tier ([\uE541-\uE544])\s+([^ ]+)(?:\s+\([^)]*\))?\s+(.+)$/);
  if (!match) throw new Error(`${label}: malformed tier line`);
  const [, glyph, rawKind, rest] = match;
  const divider = label === "adversary" ? " Motives & Tactics: " : " Impulses: ";
  const split = rest.lastIndexOf(divider);
  if (split < 0) throw new Error(`${label}: missing ${divider.trim()}`);
  return {
    tier: GLYPH_TIER[glyph],
    kind: rawKind.toLowerCase(),
    description: clean(rest.slice(0, split)),
    impulse: clean(rest.slice(split + divider.length)),
  };
}

/**
 * The printed thresholds line, which has three forms rather than two.
 * "None" is a minion — any damage marks their one Hit Point. "8/15" is the
 * ordinary pair. "4/None" is a creature too small for a Severe rung to mean
 * anything: the Tiny Oozes have two Hit Points, so Major already finishes
 * them. That last one is an absent Severe threshold, not a zero one — a zero
 * would make every hit Massive — so it gets its own flag, exactly as the
 * absent pair does.
 */
function thresholdsFrom(stats) {
  const match = stats.match(/Thresholds:\s*(?:(None)|(\d+)\s*\/\s*(?:None|(\d+)))/i);
  if (!match) return null;
  return {
    none: !!match[1],
    major: Number(match[2] ?? 0),
    severe: Number(match[3] ?? 0),
    severeNone: !!match[2] && !match[3],
  };
}

function damage(expression) {
  const normalized = clean(expression).replace(/[−–—]/g, "-");
  const dice = normalized.match(/^(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (dice) {
    return {
      count: Number(dice[1] || 1),
      dice: `d${dice[2]}`,
      bonus: dice[4] ? Number(`${dice[3]}${dice[4]}`) : 0,
    };
  }
  if (/^\d+$/.test(normalized)) return { count: 0, dice: "d6", bonus: Number(normalized) };
  throw new Error(`Unrecognized damage expression: ${expression}`);
}

const rangeKey = (range) => range.toLowerCase().replace(/\s+(.)/g, (_match, letter) => letter.toUpperCase());

function attackFrom(stats) {
  const match = stats.match(ATTACK_RX);
  if (!match) {
    return {
      name: "Use a feature",
      modifier: 0,
      modifierDice: "",
      range: "melee",
      damage: { count: 0, dice: "d6", bonus: 0, type: "physical", direct: false },
    };
  }
  const variableModifier = /d/i.test(match[1])
    ? match[1].replace(/^\+/, "").replace(/[−–—]/g, "-")
    : "";
  return {
    name: clean(match[2]),
    modifier: variableModifier ? 0 : signed(match[1]),
    modifierDice: variableModifier,
    range: rangeKey(match[3]),
    damage: {
      ...damage(match[4]),
      type: match[6].toLowerCase() === "mag" ? "magic" : "physical",
      direct: !!match[5],
    },
  };
}

function adversary(block) {
  const lead = parseLead(block, "adversary");
  if (!ROLE.has(lead.kind)) throw new Error(`${block.name}: unknown role ${lead.kind}`);
  const beforeFeatures = block.lines.slice(0, block.lines.findIndex((line) => line.trim() === "### FEATURES"));
  const stats = clean(beforeFeatures.filter((line) => !line.startsWith("<!--") && !line.startsWith("### ")).join(" "));
  const difficulty = stats.match(/Difficulty:\s*(\d+)/);
  const thresholds = thresholdsFrom(stats);
  const hp = stats.match(/HP:\s*(\d+)/i);
  const stress = stats.match(/Stress:\s*(None|\d+)/i);
  const attackMatch = stats.match(ATTACK_RX);
  if (!difficulty || !thresholds || !hp || !stress || !attackMatch) {
    throw new Error(`${block.name}: incomplete adversary statistics: ${stats}`);
  }

  const experiences = [];
  const experienceText = stats.match(/Experience:\s*(.+)$/i)?.[1] ?? "";
  for (const part of experienceText.split(/,\s*/)) {
    const match = part.match(/^(.+?)\s+([+−–—-]\d+)$/);
    if (match) experiences.push({ name: clean(match[1]), modifier: signed(match[2]), marked: false });
  }

  const items = featureDocuments(block.lines, block.name);
  const hordeDamage = items
    .find((item) => /^Horde \(([^)]+)\)$/i.test(item.name))
    ?.name.match(/\(([^)]+)\)/)?.[1] ?? "";
  const bookLabel = block.book.label;

  return {
    name: block.name,
    type: "adversary",
    folder: `${bookLabel} · Tier ${lead.tier}`,
    sourceKey: `${bookLabel}:${block.name}`,
    img: typeGlyph("gear"),
    items,
    system: {
      tier: lead.tier,
      role: lead.kind,
      description: lead.description,
      motives: lead.impulse,
      difficulty: Number(difficulty[1]),
      thresholds,
      resources: {
        hitPoints: { marked: 0, max: Number(hp[1]) },
        stress: { marked: 0, max: /^none$/i.test(stress[1]) ? 0 : Number(stress[1]) },
      },
      attack: attackFrom(stats),
      experiences,
      hordeDamage,
      notes: sourceNote(block.book, block.printedPage),
    },
  };
}

function linesFor(book, filename) {
  const path = join(ROOT, "docs", "rules", book.directory, filename);
  return readFileSync(path, "utf8").replace(/\r/g, "").split("\n");
}

function headingIndex(lines, heading, from = 0) {
  const target = `### ${heading}`;
  const index = lines.findIndex((line, i) => i >= from && line.trim() === target);
  if (index < 0) throw new Error(`Missing heading: ${heading}`);
  return index;
}

function experiencesFrom(stats) {
  const rows = [];
  const text = stats.match(/Experience:\s*(.+)$/i)?.[1] ?? "";
  for (const part of text.split(/,\s*/)) {
    const match = part.match(/^(.+?)\s+([+−–—-]\d+)$/);
    if (match) rows.push({ name: clean(match[1]), modifier: signed(match[2]), marked: false });
  }
  return rows;
}

function colossusAdversaries() {
  const book = BOOKS.core;
  const filename = "48-chapter-5-colossus-of-the-drylands.md";
  const lines = linesFor(book, filename);
  const definitions = [
    { name: "IKERI, INJURIES UNTOLD", segments: ["IKERI HEAD", "IKERI TORSO", "IKERI ARM (2)", "IKERI LEG (2)"] },
    { name: "DAKTADAE, THE CLEAVER", segments: ["DAKTADAE HEAD", "DAKTADAE TORSO", "DAKTADAE FORELEGS (2)", "DAKTADAE HINDLEGS (2)"] },
    { name: "POY, SKY SKIMMER OF THE DUST SEA", segments: ["POY HEAD", "POY NECK", "POY BODY", "POY TALONS (2)", "POY WINGS (2)", "POY TAIL"] },
    { name: "KELIR, THE VIRULENT HATE & HER HUNDRED, HUNDRED CHILDREN", segments: ["KELIR BODY CAVITY", "KELIR HEAD", "KELIR CLAWS (2)", "KELIR SHELL", "KELIR LEGS (4)"] },
  ];
  const entries = [];

  for (const [definitionIndex, definition] of definitions.entries()) {
    const frameworkHeading = headingIndex(lines, definition.name);
    const tierIndex = lines.findIndex((line, i) => i > frameworkHeading && /^Tier [\uE541-\uE544] Colossus /.test(line));
    const firstSegment = headingIndex(lines, definition.segments[0], tierIndex);
    const frameworkBlock = {
      book,
      filename,
      name: titleCase(definition.name),
      tierLine: clean(lines[tierIndex]),
      lines: trimBlock(lines.slice(tierIndex + 1, firstSegment)),
      printedPage: pageAt(lines, tierIndex),
    };
    const lead = parseLead(frameworkBlock, "adversary");
    const frameworkFeatureAt = frameworkBlock.lines.findIndex((line) => line.trim() === "### FEATURES");
    const frameworkStats = clean(frameworkBlock.lines.slice(0, frameworkFeatureAt)
      .filter((line) => !line.startsWith("<!--") && !line.startsWith("### "))
      .join(" "));
    const thresholds = thresholdsFrom(frameworkStats);
    const stress = frameworkStats.match(/Stress:\s*(\d+)/i);
    if (!thresholds || !stress) throw new Error(`${frameworkBlock.name}: incomplete colossus framework`);
    const size = frameworkStats.match(/Size:\s*(.+?)\s+Segments:/i)?.[1] ?? "";
    const segments = frameworkStats.match(/Segments:\s*(.+?)\s+Thresholds:/i)?.[1] ?? "";
    const folder = `${book.label} · Colossi · Tier ${lead.tier}`;
    const shared = {
      tier: lead.tier,
      role: "colossus",
      motives: lead.impulse,
      thresholds,
    };

    entries.push({
      name: frameworkBlock.name,
      type: "adversary",
      folder,
      sourceKey: `${book.label}:colossus:${frameworkBlock.name}`,
      img: typeGlyph("gear"),
      items: featureDocuments(frameworkBlock.lines, frameworkBlock.name),
      system: {
        ...shared,
        description: lead.description,
        difficulty: 0,
        resources: { hitPoints: { marked: 0, max: 0 }, stress: { marked: 0, max: Number(stress[1]) } },
        attack: attackFrom(""),
        experiences: experiencesFrom(frameworkStats),
        hordeDamage: "",
        notes: `${sourceNote(book, frameworkBlock.printedPage)}<p><strong>Size:</strong> ${escapeHtml(size)}<br><strong>Segments:</strong> ${escapeHtml(segments)}</p>`,
      },
    });

    for (const [segmentIndex, segmentHeading] of definition.segments.entries()) {
      const start = headingIndex(lines, segmentHeading, firstSegment);
      const nextHeading = definition.segments[segmentIndex + 1]
        ?? definitions[definitionIndex + 1]?.name
        ?? "SESSION ZERO QUESTIONS";
      const end = headingIndex(lines, nextHeading, start + 1);
      const segmentLines = trimBlock(lines.slice(start + 1, end));
      const featureAt = segmentLines.findIndex((line) => line.trim() === "### FEATURES");
      const stats = clean(segmentLines.slice(0, featureAt)
        .filter((line) => !line.startsWith("<!--") && !line.startsWith("### "))
        .join(" "));
      const difficulty = stats.match(/Difficulty:\s*(\d+)/i);
      const hp = stats.match(/HP:\s*(None|\d+)/i);
      if (!difficulty || !hp) throw new Error(`${segmentHeading}: incomplete colossus segment`);
      const adjacent = stats.match(/Adjacent Segments:\s*(.+?)\s+Difficulty:/i)?.[1] ?? "";
      const name = titleCase(segmentHeading);
      entries.push({
        name,
        type: "adversary",
        folder,
        sourceKey: `${book.label}:colossus-segment:${name}`,
        img: typeGlyph("gear"),
        items: featureDocuments(segmentLines, name),
        system: {
          ...shared,
          description: `${frameworkBlock.name} segment${adjacent ? ` adjacent to ${adjacent}` : ""}.`,
          difficulty: Number(difficulty[1]),
          resources: {
            hitPoints: { marked: 0, max: /^none$/i.test(hp[1]) ? 0 : Number(hp[1]) },
            stress: { marked: 0, max: 0 },
          },
          attack: attackFrom(stats),
          experiences: [],
          hordeDamage: "",
          notes: `${sourceNote(book, pageAt(lines, start))}<p><strong>Framework:</strong> ${escapeHtml(frameworkBlock.name)}${adjacent ? `<br><strong>Adjacent segments:</strong> ${escapeHtml(adjacent)}` : ""}</p>`,
        },
      });
    }
  }
  return entries;
}

function forlorneAdversaries() {
  const book = BOOKS.hopeAndFear;
  const filename = "26-chapter-4-reign-of-the-weredragon.md";
  const lines = linesFor(book, filename);
  const frameworkHeading = headingIndex(lines, "FORLORNE LYKONA");
  const tierIndex = lines.findIndex((line, i) => i > frameworkHeading && /^Tier [\uE541-\uE544] Solo /.test(line));
  const zoetrope = headingIndex(lines, "ZOETROPE OF THE BRIGHT BACCHANAL", tierIndex);
  const frameworkLines = trimBlock(lines.slice(tierIndex + 1, zoetrope));
  const framework = {
    book,
    filename,
    name: "Forlorne Lykona",
    tierLine: clean(lines[tierIndex]),
    lines: frameworkLines,
    printedPage: pageAt(lines, tierIndex),
  };
  const lead = parseLead(framework, "adversary");
  const frameworkStats = clean(frameworkLines
    .slice(0, frameworkLines.findIndex((line) => line.trim() === "### FEATURES"))
    .join(" "));
  const hp = Number(frameworkStats.match(/HP:\s*(\d+)/i)?.[1] ?? 0);
  const stress = Number(frameworkStats.match(/Stress:\s*(\d+)/i)?.[1] ?? 0);
  const experiences = experiencesFrom(frameworkStats);
  const overallFeatures = featureDocuments(frameworkLines, framework.name);
  const forms = [
    { heading: "FORLORNE’S FAUN FORM", suffix: "Faun Form", endText: "Lady Lavender’s Longsword" },
    { heading: "FORLORNE’S DRAGON FORM", suffix: "Dragon Form", endText: "Weredrake" },
  ];

  const entries = forms.map((form) => {
    const start = headingIndex(lines, form.heading, tierIndex);
    const end = lines.findIndex((line, index) => index > start && line.trim() === form.endText);
    if (end < 0) throw new Error(`${form.heading}: missing section boundary`);
    const formLines = trimBlock(lines.slice(start + 1, end));
    const featureAt = formLines.findIndex((line) => line.trim() === "### FEATURES");
    const stats = clean(formLines.slice(0, featureAt).join(" "));
    const difficulty = stats.match(/Difficulty:\s*(\d+)/i);
    const thresholds = thresholdsFrom(stats);
    if (!difficulty || !thresholds || !ATTACK_RX.test(stats)) throw new Error(`${form.heading}: incomplete form statistics`);
    ATTACK_RX.lastIndex = 0;
    const name = `Forlorne Lykona · ${form.suffix}`;
    return {
      name,
      type: "adversary",
      folder: `${book.label} · Campaign Adversaries · Tier ${lead.tier}`,
      sourceKey: `${book.label}:forlorne:${form.suffix}`,
      img: typeGlyph("gear"),
      items: [...overallFeatures, ...featureDocuments(formLines, name)],
      system: {
        tier: lead.tier,
        role: "solo",
        description: `${lead.description} (${form.suffix}.)`,
        motives: lead.impulse,
        difficulty: Number(difficulty[1]),
        thresholds,
        resources: { hitPoints: { marked: 0, max: hp }, stress: { marked: 0, max: stress } },
        attack: attackFrom(stats),
        experiences,
        hordeDamage: "",
        notes: sourceNote(book, pageAt(lines, start)),
      },
    };
  });

  const weredrake = blocks(book, [filename]).find((block) => block.name === "Weredrake");
  if (!weredrake) throw new Error("Weredrake stat block not found");
  const sessionZero = weredrake.lines.findIndex((line) => line.trim() === "### SESSION ZERO QUESTIONS");
  if (sessionZero >= 0) weredrake.lines = trimBlock(weredrake.lines.slice(0, sessionZero));
  entries.push({
    ...adversary(weredrake),
    folder: `${book.label} · Campaign Adversaries · Tier 1`,
  });
  return entries;
}

function environment(block) {
  const lead = parseLead(block, "environment");
  if (!ENVIRONMENT_KIND.has(lead.kind)) throw new Error(`${block.name}: unknown kind ${lead.kind}`);
  const beforeFeatures = block.lines.slice(0, block.lines.findIndex((line) => line.trim() === "### FEATURES"));
  const stats = clean(beforeFeatures.filter((line) => !line.startsWith("<!--") && !line.startsWith("### ")).join(" "));
  const difficulty = stats.match(/Difficulty:\s*(Special(?:\s*\([^)]*\))?|\d+)/i);
  const potential = stats.match(/Potential Adversaries:\s*(.+)$/i);
  if (!difficulty || !potential) throw new Error(`${block.name}: incomplete environment statistics: ${stats}`);
  const special = /^special/i.test(difficulty[1]);
  const bookLabel = block.book.label;

  return {
    name: block.name,
    type: "environment",
    folder: `${bookLabel} · Tier ${lead.tier}`,
    sourceKey: `${bookLabel}:${block.name}`,
    img: typeGlyph("gear"),
    items: featureDocuments(block.lines, block.name),
    system: {
      tier: lead.tier,
      kind: lead.kind,
      description: lead.description,
      impulses: lead.impulse,
      difficulty: special ? 0 : Number(difficulty[1]),
      difficultySpecial: special,
      potentialAdversaries: `<p>${escapeHtml(potential[1])}</p>`,
      notes: sourceNote(block.book, block.printedPage),
    },
  };
}

export const ADVERSARIES = [
  ...Object.values(BOOKS).flatMap((book) => blocks(book, book.adversaries).map(adversary)),
  ...colossusAdversaries(),
  ...forlorneAdversaries(),
];

export const ENVIRONMENTS = Object.values(BOOKS).flatMap((book) =>
  blocks(book, book.environments).map(environment),
);
