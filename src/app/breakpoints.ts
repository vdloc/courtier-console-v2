/** Matches the media query in App.module.css where .right becomes an overlay.
 * 1200, not 1280: 1280px is one of the most common laptop widths, and a media
 * query is inclusive — at exactly 1280 the scrim used to dim the canvas the
 * user just clicked to select. */
export const NARROW = '(max-width: 1200px)';

/** Matches the media query in App.module.css where .left becomes a drawer. */
export const COMPACT = '(max-width: 900px)';
