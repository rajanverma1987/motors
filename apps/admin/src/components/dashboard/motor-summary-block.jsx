/**
 * Motor identity, specs, and type — matches RFQ form motor card layout.
 * @param {{
 *   identityLine?: string,
 *   specsLine?: string,
 *   detailsLine?: string,
 *   motorType?: string,
 *   fallback?: string,
 *   className?: string,
 *   titleClassName?: string,
 *   identityClassName?: string,
 *   detailClassName?: string,
 * }} props
 */
export default function MotorSummaryBlock({
  identityLine = "",
  specsLine = "",
  detailsLine = "",
  motorType = "",
  fallback = "—",
  className = "",
  titleClassName = "mb-1.5 text-sm font-semibold text-neutral-900",
  identityClassName = "text-xs font-medium text-neutral-900",
  detailClassName = "text-xs text-neutral-700",
}) {
  const hasDetails = Boolean(identityLine || specsLine || detailsLine || motorType);
  return (
    <div className={className}>
      <h2 className={titleClassName}>Motor</h2>
      {hasDetails ? (
        <>
          {identityLine ? <p className={identityClassName}>{identityLine}</p> : null}
          {specsLine ? <p className={detailClassName}>{specsLine}</p> : null}
          {detailsLine ? <p className={detailClassName}>{detailsLine}</p> : null}
          {motorType ? <p className={detailClassName}>Type: {motorType}</p> : null}
        </>
      ) : (
        <p className={identityClassName}>{fallback}</p>
      )}
    </div>
  );
}
