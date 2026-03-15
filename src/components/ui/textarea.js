import HelpIcon from "./help-icon";

export default function Textarea({
  label,
  help,
  id: idProp,
  placeholder,
  value,
  onChange,
  name,
  rows = 4,
  className = "",
}) {
  const id = idProp ?? name;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="inline-flex items-center gap-1.5 text-sm text-title">
          {label}
          <HelpIcon text={help} />
        </label>
      )}
      <textarea
        id={id}
        name={name}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={onChange}
        rows={rows}
        className="rounded-md border-[0.5px] border-border bg-bg px-3 py-2 text-text min-h-[120px] focus:outline-none focus:ring-[0.5px] focus:ring-primary focus:border-primary/30 resize-y"
      />
    </div>
  );
}
