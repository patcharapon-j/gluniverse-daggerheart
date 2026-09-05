/** Confirmed GLUniverse homebrew ancestries with user-supplied NovelAI artwork. */
import { ancestryItem, feat } from "./_helpers.mjs";
import { withActions } from "./card-actions.mjs";

export default withActions([
  ancestryItem({
    name: "Rattin",
    art: "systems/gluniverse-daggerheart/assets/cards/ancestry/rattin.webp",
    description: "Rattin are ratlike humanoids with sensitive whiskers, rounded ears, prominent incisors, and long balancing tails. Their builds and fur colors vary, including albino individuals.",
    top: feat("Tight Squeeze", `
      You can squeeze through an opening large enough for your head to pass through,
      provided your equipment can fit. Moving through cramped passages doesn't impose
      disadvantage on your rolls.`),
    bottom: feat("Familiar Scent", `
      When you smell a creature or object within Melee range, you can commit its scent
      to memory. You can remember a number of scents equal to your Proficiency,
      replacing one whenever you memorize another.

      You can **mark a Stress** to determine whether a remembered scent is present
      within Close range and, if so, which direction it is strongest. This cannot
      detect scents through airtight barriers.`),
  }),
  ancestryItem({
    name: "Avori",
    art: "systems/gluniverse-daggerheart/assets/cards/ancestry/avori.webp",
    description: "Avori are feathered humanoids with beaks, taloned feet, and wings that may grow from their arms or separately from their backs. Their varied birdlike forms include those unable to sustain flight.",
    top: feat("Watchful Eyes", `
      When you pause to observe a place you can clearly see within Far range,
      you can **mark a Stress** to ask the GM one question:

      - What movement here seems concealed or out of place?
      - What visible detail would help us get through this area?
      - What is someone here physically preparing to do?

      The GM answers truthfully based on what is visible from your position.`),
    bottom: feat("Featherfall", `
      You can use your feathers to glide safely downward, moving up to Close range
      horizontally during a descent. You take no damage from falling while you have
      room to spread your feathers and control your descent.`),
  }),
].map((card) => ({
  ...card,
  system: {
    ...card.system,
    printing: { ...card.system.printing, artist: "NovelAI V5 · user-generated" },
  },
})));
