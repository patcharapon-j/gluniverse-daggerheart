<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { cssUrl } from "../../assets.ts";
  import { pickActorImage } from "../actor-sheet-tools.ts";
  import { openTokenStudio, tokenStudioActive } from "../../token-studio.ts";

  interface Props {
    doc: any;
    img: string;
    name: string;
    eyebrow: string;
    description?: string;
    descriptionHtml?: boolean;
    editable: boolean;
    editing: boolean;
    ontoggle: () => void;
  }
  let {
    doc,
    img,
    name,
    eyebrow,
    description = "",
    descriptionHtml = false,
    editable,
    editing,
    ontoggle,
  }: Props = $props();

  /* Not reactive: a module is not enabled without a reload. It gates the
     Studio button beside Image — see `token-studio.ts`. */
  const studio = tokenStudioActive();
</script>

<header class="actor-hero" style="--actor-art:{cssUrl(img)}">
  <div class="actor-hero__art" aria-hidden="true"></div>
  <div class="actor-hero__veil" aria-hidden="true"></div>
  <div class="actor-hero__copy">
    <span class="actor-hero__eyebrow">{eyebrow}</span>
    {#if editing}
      <input
        class="actor-hero__name"
        aria-label="Actor name"
        value={name}
        onchange={(event) => doc.update({ name: event.currentTarget.value })}
      />
    {:else}
      <h1>{name}</h1>
    {/if}
    {#if description}
      {#if descriptionHtml}
        <div class="actor-hero__description rich">{@html description}</div>
      {:else}
        <p class="actor-hero__description">{description}</p>
      {/if}
    {/if}
  </div>
  {#if editable}
    <div class="actor-hero__tools">
      {#if editing}
        <button type="button" onclick={() => pickActorImage(doc)}>Image</button>
        <!-- The other way to fill the same field. These three sheets have no
             diorama, so this and the window's control menu are the whole of
             the way in. Drawn only when the module is there: a control that
             opens nothing is worse than no control. -->
        {#if studio}
          <button type="button" onclick={() => openTokenStudio(doc)}>Studio</button>
        {/if}
      {/if}
      <button
        type="button"
        class:active={editing}
        aria-pressed={editing}
        onclick={ontoggle}
      >{editing ? "Done" : "Edit"}</button>
    </div>
  {/if}
</header>
