import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { techFetch } from "../api";
import { colors, spacing, formFieldLabel } from "../theme";
import {
  MOTOR_INSPECTION_COMPONENT,
  MOTOR_INSPECTION_FIELD_DEFS,
  VISUAL_STATUS_OPTIONS,
  PASS_FAIL_OPTIONS,
  SURGE_FAILURE_CHECKBOXES,
  emptyMotorInspectionFindings,
  mergeMotorInspectionFindings,
  buildMotorInspectionFindingsPayload,
  getPreliminaryViewEntries,
  componentLabel,
  inspectionSummaryRow,
  kindLabel,
} from "../lib/work-order-inspections";

function KindBadge({ kind }) {
  const isDetailed = kind === "detailed";
  return (
    <View style={[styles.badge, isDetailed ? styles.badgeWarning : styles.badgePrimary]}>
      <Text style={[styles.badgeText, isDetailed ? styles.badgeTextWarning : styles.badgeTextPrimary]}>
        {kindLabel(kind)}
      </Text>
    </View>
  );
}

function ComponentChips({ options, value, onChange, disabled }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function renderFormField(def, values, onChange, onFieldFocus, disabled, rowRefs, fullWidth) {
  return (
    <View
      key={def.key}
      style={fullWidth ? styles.formFieldFull : styles.fieldCol}
      collapsable={false}
      ref={(el) => {
        rowRefs.current[def.key] = el;
      }}
    >
      <Text style={styles.fieldLabel}>{def.label}</Text>
      <TextInput
        style={[styles.fieldInput, def.multiline && styles.textArea]}
        value={String(values[def.key] ?? "")}
        onChangeText={(t) => onChange(def.key, t)}
        onFocus={() => onFieldFocus?.(rowRefs.current[def.key])}
        placeholder="—"
        placeholderTextColor={colors.secondary}
        multiline={!!def.multiline}
        textAlignVertical={def.multiline ? "top" : "center"}
        editable={!disabled}
      />
    </View>
  );
}

function InspectionFormFields({ fields, values, onChange, onFieldFocus, disabled }) {
  const rowRefs = useRef({});
  const elements = [];
  let pair = [];

  const flushPair = () => {
    if (!pair.length) return;
    const items = pair;
    pair = [];
    elements.push(
      <View key={`pair-${elements.length}`} style={styles.fieldGridRow}>
        {items.map((def) => renderFormField(def, values, onChange, onFieldFocus, disabled, rowRefs, false))}
      </View>
    );
  };

  for (const def of fields) {
    if (def.multiline) {
      flushPair();
      elements.push(renderFormField(def, values, onChange, onFieldFocus, disabled, rowRefs, true));
    } else {
      pair.push(def);
      if (pair.length === 2) flushPair();
    }
  }
  flushPair();

  return <View>{elements}</View>;
}

function PassFailRadios({ label, name, value, options, onChange, disabled }) {
  return (
    <View style={styles.radioBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
              onPress={() => onChange(opt.value)}
              disabled={disabled}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MotorInspectionFieldsBlock({ values, onChange, onFieldFocus, disabled }) {
  const boolChecked = (v) => {
    const s = String(v ?? "").trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  };

  return (
    <View>
      <PassFailRadios
        label="Visual Status"
        value={values.visualStatus ?? ""}
        options={VISUAL_STATUS_OPTIONS}
        onChange={(v) => onChange("visualStatus", v)}
        disabled={disabled}
      />
      <InspectionFormFields
        fields={MOTOR_INSPECTION_FIELD_DEFS}
        values={values}
        onChange={onChange}
        onFieldFocus={onFieldFocus}
        disabled={disabled}
      />
      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Magger Test</Text>
      <PassFailRadios
        label="Result"
        value={values.maggerTest ?? ""}
        options={PASS_FAIL_OPTIONS}
        onChange={(v) => onChange("maggerTest", v)}
        disabled={disabled}
      />
      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Surge Test</Text>
      <PassFailRadios
        label="Result"
        value={values.surgeTest ?? ""}
        options={PASS_FAIL_OPTIONS}
        onChange={(v) => onChange("surgeTest", v)}
        disabled={disabled}
      />
      <View style={{ marginTop: spacing.sm }}>
        {SURGE_FAILURE_CHECKBOXES.map(({ key, label }) => (
          <Pressable
            key={key}
            style={styles.checkRow}
            onPress={() => onChange(key, boolChecked(values[key]) ? "false" : "true")}
            disabled={disabled}
          >
            <Ionicons
              name={boolChecked(values[key]) ? "checkbox" : "square-outline"}
              size={22}
              color={colors.primary}
            />
            <Text style={styles.checkLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function InspectionFormModal({ visible, title, onClose, onSave, saving, children }) {
  const insets = useSafeAreaInsets();
  const edgePad = Math.max(spacing.md, insets.left, insets.right);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.modalSafeArea,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: edgePad,
            paddingRight: edgePad,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.modalScreen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} disabled={saving} hitSlop={12}>
              <Text style={styles.modalHeaderBtn}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalHeaderTitle}>{title}</Text>
            <Pressable onPress={onSave} disabled={saving} hitSlop={12}>
              <Text style={[styles.modalHeaderBtn, styles.modalHeaderSave]}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: spacing.lg + Math.max(insets.bottom, spacing.md) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ViewInspectionModal({ visible, inspection, motorClass, onClose }) {
  const insets = useSafeAreaInsets();
  const edgePad = Math.max(spacing.lg, insets.left, insets.right);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={[
          styles.viewModalRoot,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: edgePad,
            paddingRight: edgePad,
          },
        ]}
      >
        <View style={styles.viewModalBackdrop}>
          <View style={styles.viewModalCard}>
            <View style={styles.viewModalHeader}>
              <Text style={styles.viewModalTitle}>Inspection</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.modalHeaderBtn}>Close</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.viewModalScroll}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
              keyboardShouldPersistTaps="handled"
            >
              {inspection ? (
                <>
                  <View style={styles.viewModalMeta}>
                    <KindBadge kind={inspection.kind} />
                    <Text style={styles.inspComponent}>{componentLabel(motorClass, inspection.component)}</Text>
                  </View>
                  <Text style={styles.inspDate}>
                    {inspection.createdAt ? new Date(inspection.createdAt).toLocaleString() : ""}
                  </Text>
                  {getPreliminaryViewEntries(inspection.component, inspection.findings).map(
                    ({ key, label, text }) => (
                      <View key={key} style={styles.viewField}>
                        <Text style={styles.viewFieldLabel}>{label}</Text>
                        <Text style={styles.viewFieldText}>{text}</Text>
                      </View>
                    )
                  )}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WorkOrderInspectionsSection({
  workOrderId,
  motorClass = "AC",
  token,
  disabled = false,
  onFieldFocus,
}) {
  const woId = String(workOrderId || "").trim();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingInspection, setSavingInspection] = useState(false);

  const [prelimModalOpen, setPrelimModalOpen] = useState(false);
  const [detailedModalOpen, setDetailedModalOpen] = useState(false);
  const [viewingInspection, setViewingInspection] = useState(null);

  const [findings, setFindings] = useState(() => emptyMotorInspectionFindings());

  const load = useCallback(async () => {
    if (!token || !woId) {
      setInspections([]);
      return;
    }
    setLoading(true);
    try {
      const data = await techFetch(`/api/tech/work-orders/${woId}/inspections`, { token });
      setInspections(Array.isArray(data) ? data : []);
    } catch {
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [token, woId]);

  useEffect(() => {
    load();
  }, [load]);

  const latestPreliminaryFindings = useMemo(() => {
    const pre = inspections.filter((i) => i.kind === "preliminary");
    if (!pre.length) return null;
    const sorted = [...pre].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted[0]?.findings;
  }, [inspections]);

  const openPrelim = () => {
    setFindings(emptyMotorInspectionFindings());
    setPrelimModalOpen(true);
  };

  const openDetailed = () => {
    setFindings(
      latestPreliminaryFindings
        ? mergeMotorInspectionFindings(latestPreliminaryFindings)
        : emptyMotorInspectionFindings()
    );
    setDetailedModalOpen(true);
  };

  const submitInspection = async (kind) => {
    if (!token || !woId) return;
    setSavingInspection(true);
    try {
      const payload = buildMotorInspectionFindingsPayload(findings);
      await techFetch(`/api/tech/work-orders/${woId}/inspections`, {
        token,
        method: "POST",
        body: {
          kind,
          component: MOTOR_INSPECTION_COMPONENT,
          findings: payload,
        },
      });
      if (kind === "preliminary") setPrelimModalOpen(false);
      else setDetailedModalOpen(false);
      await load();
    } catch (e) {
      Alert.alert("Save failed", e.message || "Could not save inspection");
    } finally {
      setSavingInspection(false);
    }
  };

  if (!woId) return null;

  const busy = disabled || savingInspection;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Inspections</Text>
      <Text style={styles.photoHelp}>
        Pre-inspection before teardown; detailed inspection after the motor is opened.
      </Text>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.btnSm, styles.btnSmPrimary, busy && styles.btnDisabled]}
          onPress={openPrelim}
          disabled={busy}
        >
          <Text style={styles.btnSmTextPrimary}>Add pre-inspection</Text>
        </Pressable>
        <Pressable
          style={[styles.btnSm, styles.btnSmOutline, busy && styles.btnDisabled]}
          onPress={openDetailed}
          disabled={busy}
        >
          <Text style={styles.btnSmTextOutline}>Add detailed</Text>
        </Pressable>
        <Pressable style={styles.refreshBtn} onPress={load} disabled={loading || busy}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
      ) : inspections.length === 0 ? (
        <Text style={styles.emptyText}>No inspections yet.</Text>
      ) : (
        inspections.map((row) => (
          <View key={row.id || `${row.kind}-${row.component}-${row.createdAt}`} style={styles.inspRow}>
            <Pressable
              style={styles.inspViewBtn}
              onPress={() => setViewingInspection(row)}
              accessibilityLabel="View inspection"
            >
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
            </Pressable>
            <View style={styles.inspRowBody}>
              <View style={styles.inspRowTop}>
                <KindBadge kind={row.kind} />
                <Text style={styles.inspComponent}>{componentLabel(motorClass, row.component)}</Text>
              </View>
              <Text style={styles.inspSummary} numberOfLines={2}>
                {inspectionSummaryRow(row)}
              </Text>
              <Text style={styles.inspDate}>
                {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
              </Text>
            </View>
          </View>
        ))
      )}

      <InspectionFormModal
        visible={prelimModalOpen}
        title="Add pre-inspection"
        saving={savingInspection}
        onClose={() => !savingInspection && setPrelimModalOpen(false)}
        onSave={() => submitInspection("preliminary")}
      >
        <MotorInspectionFieldsBlock
          values={findings}
          onChange={(key, value) => setFindings((f) => ({ ...f, [key]: value }))}
          onFieldFocus={onFieldFocus}
          disabled={savingInspection}
        />
      </InspectionFormModal>

      <InspectionFormModal
        visible={detailedModalOpen}
        title="Add detailed inspection"
        saving={savingInspection}
        onClose={() => !savingInspection && setDetailedModalOpen(false)}
        onSave={() => submitInspection("detailed")}
      >
        <Text style={styles.modalHint}>Same fields as pre-inspection; update after the motor is opened.</Text>
        <MotorInspectionFieldsBlock
          values={findings}
          onChange={(key, value) => setFindings((f) => ({ ...f, [key]: value }))}
          onFieldFocus={onFieldFocus}
          disabled={savingInspection}
        />
      </InspectionFormModal>

      <ViewInspectionModal
        visible={!!viewingInspection}
        inspection={viewingInspection}
        motorClass={motorClass}
        onClose={() => setViewingInspection(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  photoHelp: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  btnSm: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  btnSmPrimary: {
    backgroundColor: colors.primary,
  },
  btnSmOutline: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSmTextPrimary: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  btnSmTextOutline: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  refreshBtn: {
    padding: 8,
    marginLeft: "auto",
  },
  emptyText: {
    fontSize: 14,
    color: colors.secondary,
    fontStyle: "italic",
  },
  inspRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inspViewBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "hsl(26, 45%, 95%)",
  },
  inspRowBody: {
    flex: 1,
    minWidth: 0,
  },
  inspRowTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
  },
  inspComponent: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.title,
  },
  inspSummary: {
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 18,
  },
  inspDate: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgePrimary: {
    backgroundColor: "hsl(26, 45%, 92%)",
  },
  badgeWarning: {
    backgroundColor: "hsl(38, 92%, 92%)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextPrimary: {
    color: colors.primary,
  },
  badgeTextWarning: {
    color: "hsl(32, 90%, 32%)",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.formBg,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: "hsl(26, 45%, 95%)",
  },
  chipDisabled: {
    opacity: 0.6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.secondary,
  },
  chipTextActive: {
    color: colors.primary,
  },
  fieldGridRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fieldCol: {
    flex: 1,
    minWidth: 0,
  },
  formFieldFull: {
    marginBottom: spacing.md,
  },
  fieldLabel: formFieldLabel,
  fieldInput: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  viewModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
    flex: 1,
    textAlign: "center",
  },
  modalHeaderBtn: {
    fontSize: 16,
    color: colors.secondary,
    fontWeight: "600",
    minWidth: 64,
  },
  modalHeaderSave: {
    color: colors.primary,
    textAlign: "right",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  modalHint: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  viewModalBackdrop: {
    flex: 1,
    justifyContent: "center",
  },
  viewModalCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "85%",
  },
  viewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
  },
  viewModalScroll: {
    padding: spacing.lg,
  },
  viewModalMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  viewField: {
    marginTop: spacing.md,
  },
  viewFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  viewFieldText: {
    fontSize: 15,
    color: colors.title,
    marginTop: 4,
    lineHeight: 22,
  },
  radioBlock: {
    marginBottom: spacing.md,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.title,
  },
});
