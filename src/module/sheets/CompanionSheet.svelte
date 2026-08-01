<script lang="ts">
  /**
   * The Ranger's companion.
   *
   * One Evasion, one Stress track, one attack and one Experience. It levels
   * by spending its partner's level-ups, so it points back at a partner
   * rather than owning a level of its own.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { RANGE_LABELS } from "../config.ts";
  import type { SheetState } from "../apps/sheet-state.svelte.ts";
  import { rollDamage } from "../dice/rolls.ts";
  import Marks from "./parts/Marks.svelte";

  interface Props {
    doc: any;
    snap: SheetState;
    app: any;
  }
  let { doc, snap }: Props = $props();

  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
  const set = (path: string, v: unknown) => ed && doc.update({ [path]: v });
  const sign = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

  const dmg = $derived(sys.attack?.damage ?? { count: 1, dice: "d6", bonus: 0, type: "physical" });
</script>

<div class="win" style="--w:100%">
  <div class="bd" style="--h:100%">
    <div class="pane">
      <div class="scr">
        <div class="pnl">
          <div class="k">{snap.name}<s>{sys.species}</s></div>
          <div class="dfn">
            <div>
              <div class="pl ev">
                <svg viewBox="0 0 64 66" aria-hidden="true">
                  <path class="sil" d="M12 61 L12 26 Q12 7 33 7 Q54 7 54 26 L54 61 Z" />
                </svg>
                <span class="v">{sys.evasion?.value ?? 10}</span>
              </div>
              <span class="k">Evasion</span>
            </div>
            <div class="side">
              {#key sys.resources?.stress?.max}
                <Marks
                  kind="stress"
                  label="Stress"
                  total={sys.resources?.stress?.max ?? 3}
                  marked={sys.resources?.stress?.marked ?? 0}
                  editable={ed}
                  onset={(n) => set("system.resources.stress.marked", n)}
                />
              {/key}
            </div>
          </div>
        </div>

        <div class="pnl">
          <div class="k">
            {sys.attack?.name || "Attack"}<s>{RANGE_LABELS[sys.attack?.range] ?? sys.attack?.range}</s>
          </div>
          <div class="atk">
            <div class="wr">
              <span class="sl">dmg</span>
              <div class="id">
                <b>{sys.attack?.name || "Attack"}</b>
                <span>{dmg.count}{dmg.dice}{dmg.bonus ? `+${dmg.bonus}` : ""} {dmg.type}</span>
              </div>
              <button
                class="go dm"
                type="button"
                onclick={() =>
                  rollDamage({
                    actor: doc,
                    label: sys.attack?.name || "Attack",
                    count: dmg.count,
                    die: dmg.dice,
                    mods: dmg.bonus ? [{ k: "modifier", v: dmg.bonus }] : [],
                    damageType: dmg.type,
                  })}
              >
                <em>{dmg.count}{dmg.dice}</em><s>damage</s>
              </button>
            </div>
            <div class="rd"></div>
          </div>
        </div>

        {#if sys.experience?.name}
          <div class="pnl">
            <div class="k">Experience</div>
            <div class="xp">
              <div class="r"><b>{sys.experience.name}</b><em>{sign(sys.experience.modifier)}</em></div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
