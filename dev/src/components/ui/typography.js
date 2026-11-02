/**
 * Typography components – consistent scale and theme tokens.
 * Scale: Page (2xl) → Section (xl) → Card (lg) → Body (sm) → Label/Helper (xs).
 */

export function PageTitle({ children, className = "" }) {
  return (
    <h1 className={`text-2xl font-semibold text-title ${className}`}>
      {children}
    </h1>
  );
}

export function SectionTitle({ children, className = "" }) {
  return (
    <h2 className={`text-xl font-semibold text-title ${className}`}>
      {children}
    </h2>
  );
}

export function CardTitle({ children, className = "" }) {
  return (
    <h3 className={`text-lg font-medium text-title ${className}`}>
      {children}
    </h3>
  );
}

export function Label({ children, className = "", ...props }) {
  return (
    <span className={`text-xs text-secondary ${className}`} {...props}>
      {children}
    </span>
  );
}

export function Text({ children, className = "" }) {
  return (
    <p className={`text-sm text-text ${className}`}>
      {children}
    </p>
  );
}

export function Muted({ children, className = "" }) {
  return (
    <p className={`text-xs text-secondary ${className}`}>
      {children}
    </p>
  );
}
