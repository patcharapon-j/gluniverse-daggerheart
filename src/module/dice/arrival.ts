/**
 * The plate's arrival.
 *
 * Stepped at 58ms, not per frame: at 60fps the numerals blur to a grey
 * average and the dice stop reading as dice. Timers rather than
 * requestAnimationFrame, because rAF does not fire in a window that is not
 * painting and a chat log is very often exactly that — an rAF version
 * leaves `rolling` latched the moment the window is occluded, which shows
 * as grey dice and a placeholder total on a roll that was already decided.
 * A timer is throttled in the background rather than stopped, so the tumble
 * degrades to a couple of steps and the result still lands.
 *
 * The result was never at stake either way: it is written into the markup
 * before any of this runs, and the tumble only overwrites the display.
 */

const TUMBLE = 430;
const STEP = 58;

export function play(el: HTMLElement): void {
  clearTimeout(Number(el.dataset.tk) || 0);
  el.classList.remove("play", "land", "rolling", "veil");
  void el.offsetWidth;

  /* The sweep is added per play rather than living in the markup, so it
     restarts cleanly — and removed first, or ten replays leave ten of them
     stacked and the card gets progressively brighter. */
  el.querySelector(":scope > .swp")?.remove();
  el.insertAdjacentHTML("afterbegin", '<span class="swp"></span>');
  el.classList.add("play");

  /* Every die tumbles inside its own range, which is why each one carries
     its size in the markup: a d6 that flashes an 11 on its way to landing
     is a d6 that is lying about what it is. The maximised dice on a critical
     carry no range at all and never tumble — they were not rolled, they were
     awarded, and showing them spin would be the one visual claim on this
     card that is false. */
  const nums = [...el.querySelectorAll<HTMLElement>(".die[data-mx] em")];
  const mx = nums.map((n) => Number((n.parentElement as HTMLElement).dataset.mx));
  const big = el.querySelector<HTMLElement>(".pl-num");
  const real = nums.map((n) => n.textContent);
  const total = big?.textContent;

  /* `veil` paints out everything that states the outcome — the field, the
     ghost word, the verdict, the claim row and the critical's whole
     material — and comes off in the same frame the numbers become real.
     See the veil block at the foot of `design/plate.css`. It is presentation
     only: the result is already in the markup and stays correct whether or
     not any of this runs. */
  el.classList.add("rolling", "veil");
  const t0 = Date.now();
  const step = () => {
    if (Date.now() - t0 >= TUMBLE - STEP / 2) {
      nums.forEach((n, i) => (n.textContent = real[i] ?? ""));
      if (big && total != null) big.textContent = total;
      el.classList.remove("rolling", "veil");
      el.classList.add("land");
      return;
    }
    nums.forEach((n, i) => (n.textContent = String(1 + Math.floor(Math.random() * (mx[i] ?? 6)))));
    if (big) big.textContent = "·";
    el.dataset.tk = String(setTimeout(step, STEP));
  };
  el.dataset.tk = String(setTimeout(step, STEP));
}
