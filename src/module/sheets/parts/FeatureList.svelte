<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import type { ItemSnapshot } from "../../apps/sheet-state.svelte.ts";
  import {
    createEmbeddedFeature,
    deleteEmbeddedItem,
    dragEmbeddedItem,
    openEmbeddedItem,
  } from "../actor-sheet-tools.ts";

  interface Props {
    doc: any;
    features: ItemSnapshot[];
    editable?: boolean;
    canCreate?: boolean;
  }
  let { doc, features, editable = false, canCreate = editable }: Props = $props();
</script>

<div class="actor-features">
  {#if canCreate}
    <button type="button" class="actor-feature__add" onclick={() => createEmbeddedFeature(doc)}>
      <span aria-hidden="true">+</span>
      <b>Add feature</b>
      <i>author a new rule</i>
    </button>
  {/if}
  {#each features as feature (feature.id)}
    <article class="actor-feature" draggable="true" ondragstart={(event) => dragEmbeddedItem(event, feature)}>
      <div class="actor-feature__head">
        <button type="button" class="actor-feature__open" onclick={() => openEmbeddedItem(doc, feature.id)}>
          <b>{feature.name}</b><i>{feature.system.kind || "feature"}</i>
        </button>
        {#if editable}
          <button
            type="button"
            class="actor-feature__delete"
            title="Remove {feature.name}"
            aria-label="Remove {feature.name}"
            onclick={() => deleteEmbeddedItem(doc, feature)}
          >×</button>
        {/if}
      </div>
      <div class="actor-feature__text">{@html feature.system.description}</div>
    </article>
  {:else}
    <p class="actor-empty">{canCreate ? "Create a feature above, or drop a Feature Item here." : "No features yet."}</p>
  {/each}
</div>
