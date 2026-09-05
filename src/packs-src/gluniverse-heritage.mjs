/** Confirmed GLUniverse homebrew ancestries with user-supplied NovelAI artwork. */
import { ancestryItem, feat } from "./_helpers.mjs";
import { withActions } from "./card-actions.mjs";

export default withActions([
  ancestryItem({
    name: "Rattin",
    art: "systems/gluniverse-daggerheart/assets/cards/ancestry/rattin.webp",
    description: "Rattin are ratlike humanoids of varied builds and fur colors, including albino, with sensitive whiskers, round ears, prominent incisors, and long balancing tails.",
    top: feat("Tight Squeeze", `
      You can squeeze through openings that fit your head and equipment.
      Moving through cramped passages doesn't impose disadvantage on your rolls.`),
    bottom: feat("Familiar Scent", `
      Memorize a creature's or object's scent by smelling it within Melee range.
      Remember up to your Proficiency in scents, replacing one when learning another.

      **Mark a Stress** to detect whether a remembered scent is within Close range
      and its strongest direction. Airtight barriers block detection.`),
  }),
  ancestryItem({
    name: "Avori",
    art: "systems/gluniverse-daggerheart/assets/cards/ancestry/avori.webp",
    description: "Avori are varied birdlike humanoids, including flightless forms, with feathers, beaks, taloned feet, and wings on their arms or separately on their backs.",
    top: feat("Watchful Eyes", `
      Pause to observe a clearly visible place within Far range and **mark a Stress**
      to ask the GM one:

      - What movement seems concealed or out of place?
      - What visible detail would help us pass through?
      - What is someone here physically preparing to do?

      The GM answers truthfully using only what's visible from your position.`),
    bottom: feat("Featherfall", `
      You can glide downward up to Close range horizontally per descent.
      Take no falling damage while you have room to spread your feathers
      and control your descent.`),
  }),
].map((card) => ({
  ...card,
  system: {
    ...card.system,
    printing: { ...card.system.printing, artist: "NovelAI V5 · user-generated" },
  },
})));
