/**
 * Motor summary lines for RFQ cards, print sheets, and customer quote view.
 * @param {object|null|undefined} motor
 */
export function motorSummaryFromMotor(motor) {
  if (!motor || typeof motor !== "object") {
    return { identityLine: "", specsLine: "", motorType: "", hasDetails: false };
  }
  const identityLine = [motor.serialNumber, motor.manufacturer, motor.model]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" · ");
  const specsLine = [
    motor.hp ? `${String(motor.hp).trim()} HP` : "",
    motor.voltage ? `${String(motor.voltage).trim()}V` : "",
    motor.rpm ? `${String(motor.rpm).trim()} RPM` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const motorType = String(motor.motorType ?? "").trim();
  return {
    identityLine,
    specsLine,
    motorType,
    hasDetails: Boolean(identityLine || specsLine || motorType),
  };
}
