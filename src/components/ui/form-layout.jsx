"use client";

import { Children, cloneElement, isValidElement } from "react";
import HelpIcon from "./help-icon";

const SECTION_TITLE_CLASS = "mb-4 text-title font-semibold";

const sectionTitleSize = {
  h1: "text-2xl",
  h2: "text-xl",
  h3: "text-lg",
};

/**
 * FormSectionTitle – section heading above a form or block. Renders as h1, h2, or h3.
 * @param { "h1" | "h2" | "h3" } as – heading level
 * @param { string } [className] – extra classes
 */
export function FormSectionTitle({ as = "h3", children, className = "" }) {
  const Tag = as;
  return (
    <Tag className={`${SECTION_TITLE_CLASS} ${sectionTitleSize[as] || sectionTitleSize.h3} ${className}`}>
      {children}
    </Tag>
  );
}

const FORM_CARD_BASE = "rounded-xl border-[0.5px] border-border bg-form-bg p-6";

/**
 * FormContainer – card-style wrapper for form content (border, padding, shadow).
 */
export function FormContainer({ children, className = "" }) {
  return (
    <div className={`${FORM_CARD_BASE} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Form – form element with the same card styling as FormContainer (for form wrappers).
 * Includes space-y-4 by default. Pass onSubmit, className, and other form props.
 */
export function Form({ children, className = "", ...rest }) {
  return (
    <form className={`${FORM_CARD_BASE} space-y-4 ${className}`.trim()} {...rest}>
      {children}
    </form>
  );
}

/**
 * FormLayout – container for horizontal form layout.
 * Uses a grid: fixed-width label column(s) and input column(s).
 * All labels share the same width, all inputs align vertically.
 *
 * Use with FormField children.
 * - labelWidth: width of each label column (e.g. "12rem", "200px").
 * - cols: number of field columns (1 = one column of fields, 2 = two columns side by side, etc.).
 */
export function FormLayout({
  children,
  className = "",
  labelWidth = "12rem",
  cols = 1,
}) {
  const colCount = Math.max(1, Number(cols) || 1);
  const gridTemplateColumns = Array(colCount).fill(`${labelWidth} 1fr`).join(" ");

  return (
    <div
      className={`grid items-center gap-y-3 gap-x-[5px] ${className}`}
      style={{ gridTemplateColumns }}
    >
      {children}
    </div>
  );
}

const labelAlignClass = {
  left: "",
  right: "justify-end text-right",
};

const labelWeightClass = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
};

const labelSizeClass = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
};

/**
 * FormField – one row: label (with optional help) on the left, input on the right.
 * Use inside FormLayout. Pass label/help here and omit label/help on the input component
 * so the input renders without its own label (horizontal layout).
 *
 * Label style options:
 * - labelAlign: "left" | "right"
 * - labelWeight: "normal" | "medium" | "semibold"
 * - labelSize: "xs" | "sm" | "base"
 * - classNameLabel: extra classes for the label cell
 *
 * Optional: pass `name` or `id` so the label is associated with the input (id is set on the child).
 */
export function FormField({
  label,
  help,
  name,
  id: idProp,
  children,
  labelAlign = "left",
  labelWeight = "medium",
  labelSize = "sm",
  classNameLabel = "",
  classNameInput = "",
}) {
  const id = idProp ?? name;

  const labelCell = (
    <label
      htmlFor={id || undefined}
      className={`flex w-full min-w-0 items-center gap-1.5 text-title ${labelSizeClass[labelSize] || labelSizeClass.sm} ${labelWeightClass[labelWeight] || labelWeightClass.medium} ${labelAlignClass[labelAlign] || ""} ${classNameLabel}`}
    >
      <span className="min-w-0 flex-1">{label}</span>
      {/* Reserve same space whether help is shown or not, so input alignment stays consistent */}
      {help ? (
        <HelpIcon text={help} className="shrink-0" />
      ) : (
        <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
      )}
    </label>
  );

  const inputCell = (
    <div className={`min-w-0 ${classNameInput}`}>
      {id && isValidElement(children) && Children.only(children)
        ? cloneElement(children, { id })
        : children}
    </div>
  );

  return (
    <>
      {labelCell}
      {inputCell}
    </>
  );
}

/**
 * FormFullRow – one row that spans both columns. Use for actions (buttons) or full-width content.
 */
export function FormFullRow({ children, className = "" }) {
  return (
    <div className={className} style={{ gridColumn: "1 / -1" }}>
      {children}
    </div>
  );
}

FormLayout.FormField = FormField;
FormLayout.FullRow = FormFullRow;
FormLayout.Container = FormContainer;
FormLayout.SectionTitle = FormSectionTitle;
export default FormLayout;
