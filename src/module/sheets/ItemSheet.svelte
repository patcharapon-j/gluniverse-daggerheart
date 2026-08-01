<script lang="ts">
  /**
   * One sheet for all ten Item subtypes.
   *
   * They share more than they differ — a name, an image, a block of rules
   * text — and the parts that differ are a handful of fields each. Ten sheets
   * would be ten places for the shared half to drift apart.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import {
    BURDEN_LABELS,
    BURDENS,
    CARD_TYPES,
    DAMAGE_DICE,
    DAMAGE_TYPES,
    DOMAINS,
    domainDef,
    FEATURE_KINDS,
    RANGES,
    RANGE_LABELS,
    TRAITS,
    traitLabel,
    WEAPON_SLOTS,
  } from "../config.ts";
  import { SUBCLASS_RANKS } from "../data/items.ts";
  import type { SheetState } from "../apps/sheet-state.svelte.ts";

  interface Props {
    doc: any;
    snap: SheetState;
    app: any;
  }
  let { doc, snap }: Props = $props();

  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
  const set = (path: string, v: unknown) => ed && doc.update({ [path]: v });

  /** The hue this item is drawn in, or graphite when it belongs to no domain. */
  const accent = $derived(
    snap.type === "domainCard" && sys.domain ? domainDef(sys.domain).light : "#5c636d",
  );

  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value) || 0;
  const txt = (e: Event) => (e.currentTarget as HTMLInputElement).value;
</script>

<div class="win item" style="--w:100%;--accent:{accent}">
  <div class="bd" style="--h:100%">
    <div class="pane">
      <div class="scr">
        <div class="it-hd">
          <img src={snap.img} alt="" />
          <div>
            <span class="eyebrow">{snap.type}</span>
            <input
              class="nm"
              value={snap.name}
              disabled={!ed}
              onchange={(e) => set("name", txt(e))}
            />
          </div>
        </div>

        {#if snap.type === "domainCard"}
          <div class="pnl">
            <div class="k">Card</div>
            <div class="fields">
              <label>
                <span>Domain</span>
                <select disabled={!ed} onchange={(e) => set("system.domain", txt(e))}>
                  <option value="" selected={!sys.domain}>—</option>
                  {#each DOMAINS as d}
                    <option value={d} selected={sys.domain === d}>{domainDef(d).label}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Level</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={sys.level}
                  disabled={!ed}
                  onchange={(e) => set("system.level", num(e))}
                />
              </label>
              <label>
                <span>Type</span>
                <select disabled={!ed} onchange={(e) => set("system.cardType", txt(e))}>
                  {#each CARD_TYPES as t}
                    <option value={t} selected={sys.cardType === t}>{t}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Recall cost</span>
                <input
                  type="number"
                  min="0"
                  value={sys.recallCost}
                  disabled={!ed}
                  onchange={(e) => set("system.recallCost", num(e))}
                />
              </label>
            </div>
          </div>
        {:else if snap.type === "weapon"}
          <div class="pnl">
            <div class="k">Weapon</div>
            <div class="fields">
              <label>
                <span>Slot</span>
                <select disabled={!ed} onchange={(e) => set("system.slot", txt(e))}>
                  {#each WEAPON_SLOTS as s}
                    <option value={s} selected={sys.slot === s}>{s}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Trait</span>
                <select disabled={!ed} onchange={(e) => set("system.trait", txt(e))}>
                  {#each TRAITS as t}
                    <option value={t} selected={sys.trait === t}>{traitLabel(t)}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Range</span>
                <select disabled={!ed} onchange={(e) => set("system.range", txt(e))}>
                  {#each RANGES as r}
                    <option value={r} selected={sys.range === r}>{RANGE_LABELS[r]}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Burden</span>
                <select disabled={!ed} onchange={(e) => set("system.burden", txt(e))}>
                  {#each BURDENS as b}
                    <option value={b} selected={sys.burden === b}>{BURDEN_LABELS[b]}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Damage die</span>
                <select disabled={!ed} onchange={(e) => set("system.damage.dice", txt(e))}>
                  {#each DAMAGE_DICE as d}
                    <option value={d} selected={sys.damage?.dice === d}>{d}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Damage bonus</span>
                <input
                  type="number"
                  value={sys.damage?.bonus}
                  disabled={!ed}
                  onchange={(e) => set("system.damage.bonus", num(e))}
                />
              </label>
              <label>
                <span>Damage type</span>
                <select disabled={!ed} onchange={(e) => set("system.damage.type", txt(e))}>
                  {#each DAMAGE_TYPES as t}
                    <option value={t} selected={sys.damage?.type === t}>{t}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Tier</span>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={sys.tier}
                  disabled={!ed}
                  onchange={(e) => set("system.tier", num(e))}
                />
              </label>
            </div>
            <!-- Damage is Proficiency copies of this die, not one die. The
                 count is not stored per weapon because it is not a property
                 of the weapon. -->
            <p class="ach">
              Rolled as <b>Proficiency × {sys.damage?.dice}</b> — the character sheet does the
              multiplication.
            </p>
          </div>
        {:else if snap.type === "armor"}
          <div class="pnl">
            <div class="k">Armor</div>
            <div class="fields">
              <label>
                <span>Base score</span>
                <input
                  type="number"
                  min="0"
                  value={sys.baseScore}
                  disabled={!ed}
                  onchange={(e) => set("system.baseScore", num(e))}
                />
              </label>
              <label>
                <span>Base major</span>
                <input
                  type="number"
                  value={sys.baseThresholds?.major}
                  disabled={!ed}
                  onchange={(e) => set("system.baseThresholds.major", num(e))}
                />
              </label>
              <label>
                <span>Base severe</span>
                <input
                  type="number"
                  value={sys.baseThresholds?.severe}
                  disabled={!ed}
                  onchange={(e) => set("system.baseThresholds.severe", num(e))}
                />
              </label>
              <label>
                <span>Evasion modifier</span>
                <input
                  type="number"
                  value={sys.evasionModifier}
                  disabled={!ed}
                  onchange={(e) => set("system.evasionModifier", num(e))}
                />
              </label>
            </div>
            <p class="ach">
              The wearer adds their <b>level</b> to both thresholds. Base score also sets the number
              of Armor Slots.
            </p>
          </div>
        {:else if snap.type === "subclass"}
          <div class="pnl">
            <div class="k">Subclass card</div>
            <div class="fields">
              <label>
                <span>Subclass</span>
                <input
                  value={sys.subclassName}
                  disabled={!ed}
                  onchange={(e) => set("system.subclassName", txt(e))}
                />
              </label>
              <label>
                <span>Class</span>
                <input
                  value={sys.className}
                  disabled={!ed}
                  onchange={(e) => set("system.className", txt(e))}
                />
              </label>
              <label>
                <span>Rank</span>
                <select disabled={!ed} onchange={(e) => set("system.rank", txt(e))}>
                  {#each SUBCLASS_RANKS as r}
                    <option value={r} selected={sys.rank === r}>{r}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Spellcast trait</span>
                <select disabled={!ed} onchange={(e) => set("system.spellcastTrait", txt(e))}>
                  <option value="" selected={!sys.spellcastTrait}>— none —</option>
                  {#each TRAITS as t}
                    <option value={t} selected={sys.spellcastTrait === t}>{traitLabel(t)}</option>
                  {/each}
                </select>
              </label>
            </div>
          </div>
        {:else if snap.type === "class"}
          <div class="pnl">
            <div class="k">Class</div>
            <div class="fields">
              <label>
                <span>Domain</span>
                <select disabled={!ed} onchange={(e) => set("system.domains.primary", txt(e))}>
                  <option value="" selected={!sys.domains?.primary}>—</option>
                  {#each DOMAINS as d}
                    <option value={d} selected={sys.domains?.primary === d}
                      >{domainDef(d).label}</option
                    >
                  {/each}
                </select>
              </label>
              <label>
                <span>Domain</span>
                <select disabled={!ed} onchange={(e) => set("system.domains.secondary", txt(e))}>
                  <option value="" selected={!sys.domains?.secondary}>—</option>
                  {#each DOMAINS as d}
                    <option value={d} selected={sys.domains?.secondary === d}
                      >{domainDef(d).label}</option
                    >
                  {/each}
                </select>
              </label>
              <label>
                <span>Starting Evasion</span>
                <input
                  type="number"
                  value={sys.startingEvasion}
                  disabled={!ed}
                  onchange={(e) => set("system.startingEvasion", num(e))}
                />
              </label>
              <label>
                <span>Starting Hit Points</span>
                <input
                  type="number"
                  value={sys.startingHitPoints}
                  disabled={!ed}
                  onchange={(e) => set("system.startingHitPoints", num(e))}
                />
              </label>
            </div>
          </div>
        {:else if snap.type === "feature"}
          <div class="pnl">
            <div class="k">Feature</div>
            <div class="fields">
              <label>
                <span>Fires as</span>
                <select disabled={!ed} onchange={(e) => set("system.kind", txt(e))}>
                  {#each FEATURE_KINDS as k}
                    <option value={k} selected={sys.kind === k}>{k}</option>
                  {/each}
                </select>
              </label>
              <label>
                <span>Fear cost</span>
                <input
                  type="number"
                  min="0"
                  value={sys.fearCost}
                  disabled={!ed}
                  onchange={(e) => set("system.fearCost", num(e))}
                />
              </label>
              <label>
                <span>Stress cost</span>
                <input
                  type="number"
                  min="0"
                  value={sys.stressCost}
                  disabled={!ed}
                  onchange={(e) => set("system.stressCost", num(e))}
                />
              </label>
            </div>
          </div>
        {:else if snap.type === "consumable" || snap.type === "loot"}
          <div class="pnl">
            <div class="k">Quantity</div>
            <div class="fields">
              <label>
                <span>Held</span>
                <input
                  type="number"
                  min="0"
                  value={sys.quantity}
                  disabled={!ed}
                  onchange={(e) => set("system.quantity", num(e))}
                />
              </label>
            </div>
          </div>
        {/if}

        <div class="pnl">
          <div class="k">Rules text</div>
          <div class="tx">{@html sys.description ?? ""}</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .it-hd {
    display: flex;
    gap: 13px;
    align-items: center;
    padding: 15px 18px;
    background: var(--sunk);
    border-bottom: 1px solid var(--line);
    box-shadow: inset 3px 0 0 var(--accent);
  }
  .it-hd img {
    width: 52px;
    height: 52px;
    object-fit: cover;
    flex: none;
    background: var(--sunk-2);
  }
  .it-hd .eyebrow {
    display: block;
    font: 700 8.5px/1 var(--f-mono);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 6px;
  }
  .it-hd .nm {
    width: 100%;
    border: 0;
    background: transparent;
    font: 700 18px/1.05 var(--f-display);
    letter-spacing: -0.02em;
    color: var(--ink);
    padding: 0;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 9px;
  }
  .fields label {
    display: block;
  }
  .fields span {
    display: block;
    font: 700 8px/1 var(--f-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
  .fields input,
  .fields select {
    width: 100%;
    border: 0;
    background: var(--sunk);
    box-shadow: inset 0 0 0 1px var(--line);
    color: var(--ink);
    font: 500 12px/1 var(--f-ui);
    padding: 7px 8px;
  }
  .fields input:focus,
  .fields select:focus {
    outline: 0;
    box-shadow: inset 0 0 0 1.5px var(--hope);
  }
  .tx {
    font: 400 12.5px/1.6 var(--f-ui);
    color: var(--ink-2);
  }
</style>
