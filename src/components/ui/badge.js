export default function Badge({
  children,
  variant = "default",
  className = "",
}) {
  const variants = {
    default:
      "bg-secondary/12 text-secondary ring-1 ring-inset ring-secondary/20 dark:bg-secondary/20 dark:ring-secondary/30",
    primary:
      "bg-primary/14 text-primary ring-1 ring-inset ring-primary/25 dark:bg-primary/20 dark:ring-primary/35",
    success:
      "bg-success/14 text-success ring-1 ring-inset ring-success/25 dark:bg-success/18 dark:ring-success/35",
    warning:
      "bg-warning/16 text-warning ring-1 ring-inset ring-warning/30 dark:bg-warning/20 dark:ring-warning/40",
    danger:
      "bg-danger/14 text-danger ring-1 ring-inset ring-danger/25 dark:bg-danger/18 dark:ring-danger/35",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ${variants[variant] ?? variants.default} ${className}`}
    >
      {children}
    </span>
  );
}
