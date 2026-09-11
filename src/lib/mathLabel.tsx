import styles from './MathLabel.module.css';

/**
 * Renders `H_2` / `Φ_m` as an italic variable with a real subscript.
 * The reference sets diagram and field symbols in a serif math face, distinct
 * from the UI sans. KaTeX takes over at the diagram milestone; this covers the
 * single-subscript vocabulary the panels need.
 */
export function MathLabel({ symbol }: { symbol: string }) {
  const [base, sub] = symbol.split('_');
  return (
    <span className={styles.symbol}>
      {base}
      {sub && <sub className={styles.sub}>{sub}</sub>}
    </span>
  );
}
