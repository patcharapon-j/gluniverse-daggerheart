/* Shared, deliberately small interactions for the non-character actor sheets. */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function pickActorImage(doc: any): Promise<void> {
  const picker = new foundry.applications.apps.FilePicker.implementation({
    type: "image",
    current: doc.img,
    callback: (path: string) => doc.update({ img: path }),
  });
  await picker.browse();
}

export function openEmbeddedItem(doc: any, id: string): void {
  doc.items?.get(id)?.sheet?.render(true);
}

/** Create a blank, actor-owned rule and move directly into its authoring sheet. */
export async function createEmbeddedFeature(doc: any): Promise<void> {
  const [feature] = await doc.createEmbeddedDocuments("Item", [
    {
      type: "feature",
      name: game.i18n.format("DAGGERHEART.NewItem", { kind: "Feature" }),
    },
  ]);
  feature?.sheet?.render(true);
}

export async function deleteEmbeddedItem(doc: any, item: { id: string; name: string }): Promise<void> {
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("DAGGERHEART.Delete.Title") },
    content: `<p>${foundry.utils.escapeHTML(
      game.i18n.format("DAGGERHEART.Delete.Body", { name: item.name }),
    )}</p>`,
    modal: true,
  });
  if (ok) await doc.deleteEmbeddedDocuments("Item", [item.id]);
}

export function dragEmbeddedItem(event: DragEvent, item: { uuid: string }): void {
  event.dataTransfer?.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid }));
}
