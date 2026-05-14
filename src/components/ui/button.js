export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  type = "button",
  className = "",
  disabled = false,
  form,
  ...rest
}) {
  const variants = {
    primary: "bg-primary text-white hover:opacity-90",
    secondary: "bg-secondary text-white hover:opacity-90",
    outline: "border-[0.5px] border-border bg-transparent text-text hover:bg-card hover:border-primary/20",
    danger: "bg-danger text-white hover:opacity-90",
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-4 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      form={form}
      className={`inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 whitespace-normal text-center text-pretty rounded-md transition-opacity ${variants[variant]} ${sizes[size]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...rest}
    >
      {children}
    </button>
  );
}
