export default function Badge({
  children,
  variant = "default",
  className = "",
}) {
  const variants = {
    default: "bg-card border border-border text-text",
    primary: "bg-card border border-border text-primary",
    success: "bg-card border border-border text-success",
    warning: "bg-card border border-border text-warning",
    danger: "bg-card border border-border text-danger",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
