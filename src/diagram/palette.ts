/**
 * The scene reads its colours out of the same CSS custom properties the DOM
 * uses, so design/tokens.css stays the only place a value is written down.
 *
 * There are deliberately NO hardcoded fallbacks. A fallback would let the
 * scene keep rendering in a colour nobody chose while the token that should
 * have supplied it was missing or misspelled — the exact silent drift this
 * whole arrangement exists to prevent. A missing token throws instead.
 */

const TOKENS = [
  '--dia-face',
  '--dia-edge',
  '--dia-solid',
  '--dia-ink',
  '--dia-rebar',
  '--primary',
  '--canvas',
  '--border-soft',
] as const;

type Token = (typeof TOKENS)[number];

function readTokens(): Record<Token, string> {
  const style = getComputedStyle(document.documentElement);
  const out = {} as Record<Token, string>;
  for (const name of TOKENS) {
    const value = style.getPropertyValue(name).trim();
    if (!value) throw new Error(`design/tokens.css is missing ${name}`);
    out[name] = value;
  }
  return out;
}

const t = readTokens();

export const PALETTE = {
  face: t['--dia-face'],
  edge: t['--dia-edge'],
  solid: t['--dia-solid'],
  ink: t['--dia-ink'],
  rebar: t['--dia-rebar'],
  select: t['--primary'],
  canvas: t['--canvas'],
  faint: t['--border-soft'],
};

export type DiagramRole = 'translucent' | 'solid' | 'service';

/** Which role each element kind takes in the reference's own vocabulary. */
export const ROLE_BY_KIND: Record<string, DiagramRole> = {
  foundation: 'translucent',
  column: 'translucent',
  beam_x: 'translucent',
  beam_y: 'translucent',
  pipe: 'service',
};
