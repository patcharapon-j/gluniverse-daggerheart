/**
 * Strip GLSL comments.
 *
 * Two tools embed the condition shader into a self-contained ASCII page, and
 * the shader's own comments are the best thing about it and the one thing that
 * cannot come along: the page has no charset to declare when it is opened off
 * disk, so the prose that makes src readable arrives as mojibake, and the gate
 * refuses non-ASCII rather than encoding it. Comments are therefore dropped at
 * the embedding boundary instead of being banned from the source.
 *
 * GLSL has no string literals, so this cannot eat anything but a comment.
 * Newlines are preserved because the preprocessor counts them.
 */
export function stripGlslComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line, i, lines) => line !== "" || lines[i - 1] !== "")
    .join("\n");
}
