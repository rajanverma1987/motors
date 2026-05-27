import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { techFetch } from "../api";
import { colors, spacing } from "../theme";
import {
  MOTOR_INSPECTION_COMPONENT,
  emptyMotorInspectionFindings,
  buildMotorInspectionFindingsPayload,
  inspectionSummaryRow,
} from "../lib/work-order-inspections";
import {
  MotorInspectionFieldsBlock,
  InspectionFormModal,
} from "./WorkOrderInspectionsSection";

/**
 * RFQ Write-Up pre-inspection (mobile). No work order, no pricing.
 */
export default function QuotePreInspectionSection({
  quoteId,
  motorClass = "AC",
  token,
  disabled = false,
  onCompleted,
  onFieldFocus,
}) {
  const qid = String(quoteId || "").trim();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [findings, setFindings] = useState(() => emptyMotorInspectionFindings());

  const load = useCallback(async () => {
    if (!token || !qid) {
      setInspections([]);
      return;
    }
    setLoading(true);
    try {
      const data = await techFetch(`/api/tech/pre-inspections/${qid}/inspections`, { token });
      setInspections(Array.isArray(data) ? data : []);
    } catch {
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [token, qid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!token || !qid) return;
    setSaving(true);
    try {
      await techFetch(`/api/tech/pre-inspections/${qid}/inspections`, {
        token,
        method: "POST",
        body: {
          kind: "preliminary",
          component: MOTOR_INSPECTION_COMPONENT,
          findings: buildMotorInspectionFindingsPayload(findings),
        },
      });
      setModalOpen(false);
      setFindings(emptyMotorInspectionFindings());
      await load();
    } catch (e) {
      Alert.alert("Save failed", e.message || "Could not save pre-inspection");
    } finally {
      setSaving(false);
    }
  };

  const handleInspectionDone = () => {
    Alert.alert(
      "Inspection done",
      "Mark this RFQ as inspection done? It will leave your pre-inspection list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setCompleting(true);
            try {
              const data = await techFetch(`/api/tech/pre-inspections/${qid}/complete`, {
                token,
                method: "POST",
              });
              onCompleted?.(data.quote?.status);
            } catch (e) {
              Alert.alert("Update failed", e.message || "Could not update status");
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  if (!qid) return null;

  const busy = disabled || saving || completing;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pre-inspection</Text>
      <Text style={styles.help}>
        Record motor condition and tests for this Write-Up RFQ. Quote pricing is not shown in the app.
      </Text>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.addBtn, busy && styles.btnDisabled]}
          onPress={() => {
            setFindings(emptyMotorInspectionFindings());
            setModalOpen(true);
          }}
          disabled={busy}
        >
          <Text style={styles.addBtnText}>Add pre-inspection</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.doneBtn, (busy || !inspections.length) && styles.btnDisabled]}
        onPress={handleInspectionDone}
        disabled={busy || !inspections.length}
      >
        <Text style={styles.doneBtnText}>{completing ? "Updating…" : "Inspection done"}</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
      ) : inspections.length === 0 ? (
        <Text style={styles.emptyText}>No pre-inspection saved yet.</Text>
      ) : (
        inspections.map((row) => (
          <View key={row.id || row.createdAt} style={styles.inspRow}>
            <Text style={styles.inspSummary} numberOfLines={3}>
              {inspectionSummaryRow(row)}
            </Text>
            <Text style={styles.inspDate}>
              {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
            </Text>
          </View>
        ))
      )}

      <InspectionFormModal
        visible={modalOpen}
        title="Pre-inspection"
        saving={saving}
        onClose={() => !saving && setModalOpen(false)}
        onSave={handleSave}
      >
        <MotorInspectionFieldsBlock
          values={findings}
          onChange={(key, val) => setFindings((f) => ({ ...f, [key]: val }))}
          onFieldFocus={onFieldFocus}
          disabled={saving}
        />
      </InspectionFormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.title,
  },
  help: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  doneBtn: {
    marginTop: spacing.md,
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  doneBtnText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.secondary,
  },
  inspRow: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  inspSummary: {
    fontSize: 14,
    color: colors.title,
  },
  inspDate: {
    marginTop: 4,
    fontSize: 12,
    color: colors.secondary,
  },
});
