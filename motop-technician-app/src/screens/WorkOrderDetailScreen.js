import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTechAuth } from "../TechAuthContext";
import { useBookmarks } from "../BookmarksContext";
import { techFetch, techFetchForm, getMediaUrl } from "../api";
import { useCenterFieldInScroll } from "../useCenterFieldInScroll";
import { colors, spacing } from "../theme";

const DEFAULT_JOB_TYPES = [
  { value: "complete_motor", label: "Complete Motor" },
  { value: "field_frame_only", label: "Field Frame Only" },
];

function WorkOrderBookmarkControl({ woId, wo }) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  if (!woId || !wo) return null;
  const saved = isBookmarked(woId);
  return (
    <Pressable
      onPress={() =>
        toggleBookmark({
          id: woId,
          workOrderNumber: wo.workOrderNumber,
          companyName: wo.customerCompany || wo.companyName,
          quoteRfqNumber: wo.quoteRfqNumber,
        })
      }
      style={{ paddingHorizontal: 14, paddingVertical: 8 }}
    >
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>
        {saved ? "Saved" : "Bookmark"}
      </Text>
    </Pressable>
  );
}

function SpecFieldGrid({ fields, values, onChange, onFieldFocus }) {
  const rowRefs = useRef({});
  if (!fields || fields.length === 0) return null;
  return (
    <View>
      {fields.map(({ key, label }) => (
        <View
          key={key}
          style={styles.fieldRow}
          collapsable={false}
          ref={(el) => {
            rowRefs.current[key] = el;
          }}
        >
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            style={styles.fieldInput}
            value={String(values[key] ?? "")}
            onChangeText={(t) => onChange(key, t)}
            onFocus={() => onFieldFocus?.(rowRefs.current[key])}
            placeholder="—"
            placeholderTextColor={colors.secondary}
          />
        </View>
      ))}
    </View>
  );
}

export default function WorkOrderDetailScreen({ route, navigation }) {
  const headerHeight = useHeaderHeight();
  const { id } = route.params || {};
  const { token, workOrderStatuses, employee } = useTechAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wo, setWo] = useState(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [acSpecs, setAcSpecs] = useState({});
  const [dcSpecs, setDcSpecs] = useState({});
  const [armatureSpecs, setArmatureSpecs] = useState({});
  const [dcSection, setDcSection] = useState("dc");
  const [uploadingKind, setUploadingKind] = useState(null);
  const [photoPreviewUri, setPhotoPreviewUri] = useState(null);
  const commentFieldWrapRef = useRef(null);

  const { scrollRef, onScroll, scrollFieldToCenter } = useCenterFieldInScroll(headerHeight);

  const woId = wo?.id || id;

  useLayoutEffect(() => {
    if (loading || !wo || !woId) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => <WorkOrderBookmarkControl woId={woId} wo={wo} />,
    });
  }, [navigation, loading, wo, woId]);

  const load = useCallback(async () => {
    if (!token || !id) return;
    const data = await techFetch(`/api/tech/work-orders/${id}`, { token });
    setWo(data);
    setPendingStatus(data.status || "");
    setAcSpecs({ ...(data.acSpecs && typeof data.acSpecs === "object" ? data.acSpecs : {}) });
    setDcSpecs({ ...(data.dcSpecs && typeof data.dcSpecs === "object" ? data.dcSpecs : {}) });
    setArmatureSpecs({
      ...(data.armatureSpecs && typeof data.armatureSpecs === "object" ? data.armatureSpecs : {}),
    });
  }, [token, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const saveStatus = async (nextStatus) => {
    if (!token || !id) return;
    setSaving(true);
    try {
      await techFetch(`/api/tech/work-orders/${id}`, {
        token,
        method: "PATCH",
        body: { status: nextStatus },
      });
      setPendingStatus(nextStatus);
      await load();
    } catch (e) {
      setError(e.message || "Could not update status");
    } finally {
      setSaving(false);
      setStatusPickerOpen(false);
    }
  };

  /** Single save: motor specs + optional comment. Status still updates via its own control. */
  const uploadPhotoForKind = useCallback(
    async (kind, source) => {
      if (!token || !id) return;
      try {
        let result;
        if (source === "camera") {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Camera", "Camera access is needed to take a photo.");
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsEditing: false,
          });
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Photos", "Photo library access is needed to attach an image.");
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsEditing: false,
          });
        }
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        setUploadingKind(kind);
        setError("");
        const formData = new FormData();
        const uri = asset.uri;
        const nameGuess = uri.split("/").pop() || "photo.jpg";
        const name = nameGuess.includes(".") ? nameGuess : `${nameGuess}.jpg`;
        const mime = asset.mimeType || "image/jpeg";
        formData.append("file", { uri, name, type: mime });
        formData.append("kind", kind);
        const out = await techFetchForm(`/api/tech/work-orders/${id}/photos`, { token, formData });
        setWo((prev) =>
          prev
            ? {
                ...prev,
                technicianBeforePhotos: out.technicianBeforePhotos || prev.technicianBeforePhotos,
                technicianAfterPhotos: out.technicianAfterPhotos || prev.technicianAfterPhotos,
              }
            : prev
        );
      } catch (e) {
        setError(e.message || "Upload failed");
      } finally {
        setUploadingKind(null);
      }
    },
    [token, id]
  );

  const offerAddPhoto = (kind) => {
    const title = kind === "before" ? "Before photo" : "After photo";
    Alert.alert(title, "Choose a source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => uploadPhotoForKind(kind, "camera") },
      { text: "Photo library", onPress: () => uploadPhotoForKind(kind, "library") },
    ]);
  };

  const saveWorkOrder = async () => {
    if (!token || !id || !wo) return;
    const noteText = comment.trim();
    const canSaveMotorFields = wo.motorClass === "AC" || wo.motorClass === "DC";
    if (!noteText && !canSaveMotorFields) {
      setError("Nothing to save.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {};
      if (wo.motorClass === "AC") body.acSpecs = acSpecs;
      if (wo.motorClass === "DC") {
        body.dcSpecs = dcSpecs;
        body.armatureSpecs = armatureSpecs;
      }
      if (noteText) body.appendNote = noteText;
      await techFetch(`/api/tech/work-orders/${id}`, {
        token,
        method: "PATCH",
        body,
      });
      setComment("");
      await load();
    } catch (e) {
      setError(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !wo) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const notes = Array.isArray(wo?.technicianAppNotes) ? wo.technicianAppNotes : [];
  const scopeLines = Array.isArray(wo?.quoteScopeForTech) ? wo.quoteScopeForTech : [];
  const otherCost = Array.isArray(wo?.quoteOtherCostForTech) ? wo.quoteOtherCostForTech : [];
  const motor = wo?.motorSummary;
  const layouts = wo?.fieldLayouts || {};
  const acFields = layouts.ac || [];
  const dcMotorFields = layouts.dcMotor || [];
  const armatureFields = layouts.armature || [];
  const jobTypes = layouts.jobTypes?.length ? layouts.jobTypes : DEFAULT_JOB_TYPES;

  const jobTypeLabel =
    jobTypes.find((j) => j.value === wo?.jobType)?.label || wo?.jobType || "—";

  const DEFAULT_STATUSES = ["Assigned", "In Progress", "Waiting Parts", "QC", "Completed"];
  let statusOptions =
    workOrderStatuses && workOrderStatuses.length > 0 ? [...workOrderStatuses] : [...DEFAULT_STATUSES];
  const curStatus = pendingStatus || wo?.status;
  if (curStatus && !statusOptions.includes(curStatus)) {
    statusOptions = [curStatus, ...statusOptions];
  }

  const hasOtherCost = otherCost.some(
    (r) => (r.item || "").trim() || (r.qty || "").trim() || (r.uom || "").trim()
  );

  const beforePhotos = Array.isArray(wo?.technicianBeforePhotos) ? wo.technicianBeforePhotos : [];
  const afterPhotos = Array.isArray(wo?.technicianAfterPhotos) ? wo.technicianAfterPhotos : [];
  const assigneeId = String(wo?.technicianEmployeeId || "").trim();
  const meId = String(employee?.id || "").trim();
  const canUploadPhotos = Boolean(meId && assigneeId && meId === assigneeId);

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
      {error ? <Text style={styles.bannerError}>{error}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.woTitle}>{wo?.workOrderNumber || id}</Text>
        <Text style={styles.hint}>
          Motor class: <Text style={styles.hintStrong}>{wo?.motorClass || "—"}</Text>. Edit motor fields and
          optional notes below, then tap <Text style={styles.hintStrong}>Save</Text>. Use{" "}
          <Text style={styles.hintStrong}>Change</Text> on status to update status (saves immediately).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Header</Text>
        <View style={styles.readRow}>
          <Text style={styles.readLabel}>Date</Text>
          <Text style={styles.readValue}>{wo?.date || "—"}</Text>
        </View>
        <View style={styles.readRow}>
          <Text style={styles.readLabel}>Work order #</Text>
          <Text style={styles.readValue}>{wo?.workOrderNumber || "—"}</Text>
        </View>
        <View style={styles.readRow}>
          <Text style={styles.readLabel}>RFQ #</Text>
          <Text style={styles.readValue}>{wo?.quoteRfqNumber || "—"}</Text>
        </View>
        <View style={styles.readRow}>
          <Text style={styles.readLabel}>Company</Text>
          <Text style={styles.readValue}>{wo?.customerCompany || wo?.companyName || "—"}</Text>
        </View>
        <View style={styles.readRow}>
          <Text style={styles.readLabel}>Job type</Text>
          <Text style={styles.readValue}>{jobTypeLabel}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Pressable
          style={styles.statusBtn}
          onPress={() => setStatusPickerOpen(true)}
          disabled={saving}
        >
          <Text style={styles.statusBtnText}>{pendingStatus || wo?.status || "—"}</Text>
          <Text style={styles.statusChevron}>Change</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Before photos</Text>
        <Text style={styles.photoHelp}>
          Condition before repair. {canUploadPhotos ? "Tap + Add to upload." : "Only the assigned technician can add photos."}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
          keyboardShouldPersistTaps="handled"
        >
          {beforePhotos.map((p, i) => (
            <Pressable
              key={`b-${p.url}-${i}`}
              onPress={() => setPhotoPreviewUri(getMediaUrl(p.url))}
              style={styles.photoThumbWrap}
            >
              <Image source={{ uri: getMediaUrl(p.url) }} style={styles.photoThumb} />
            </Pressable>
          ))}
          {canUploadPhotos ? (
            <Pressable
              style={[styles.addPhotoTile, uploadingKind === "before" && styles.addPhotoTileBusy]}
              onPress={() => offerAddPhoto("before")}
              disabled={uploadingKind !== null}
            >
              {uploadingKind === "before" ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.addPhotoText}>+ Add</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
        {!canUploadPhotos && beforePhotos.length === 0 ? (
          <Text style={styles.photoEmpty}>No before photos yet.</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>After photos</Text>
        <Text style={styles.photoHelp}>
          Condition after repair. {canUploadPhotos ? "Tap + Add to upload." : "Only the assigned technician can add photos."}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
          keyboardShouldPersistTaps="handled"
        >
          {afterPhotos.map((p, i) => (
            <Pressable
              key={`a-${p.url}-${i}`}
              onPress={() => setPhotoPreviewUri(getMediaUrl(p.url))}
              style={styles.photoThumbWrap}
            >
              <Image source={{ uri: getMediaUrl(p.url) }} style={styles.photoThumb} />
            </Pressable>
          ))}
          {canUploadPhotos ? (
            <Pressable
              style={[styles.addPhotoTile, uploadingKind === "after" && styles.addPhotoTileBusy]}
              onPress={() => offerAddPhoto("after")}
              disabled={uploadingKind !== null}
            >
              {uploadingKind === "after" ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.addPhotoText}>+ Add</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
        {!canUploadPhotos && afterPhotos.length === 0 ? (
          <Text style={styles.photoEmpty}>No after photos yet.</Text>
        ) : null}
      </View>

      {motor ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motor asset (reference)</Text>
          <Text style={styles.line}>{motor.serialNumber ? `S/N ${motor.serialNumber}` : ""}</Text>
          <Text style={styles.line}>
            {[motor.manufacturer, motor.model].filter(Boolean).join(" · ") || "—"}
          </Text>
          <Text style={styles.line}>
            {[motor.hp && `${motor.hp} HP`, motor.voltage, motor.rpm && `${motor.rpm} RPM`]
              .filter(Boolean)
              .join(" · ") || ""}
          </Text>
        </View>
      ) : null}

      {(scopeLines.length > 0 || hasOtherCost) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From quote (reference)</Text>
          {scopeLines.length > 0 && (
            <>
              <Text style={styles.subHead}>Scope</Text>
              {scopeLines.map((row, i) => (
                <Text key={i} style={styles.bullet}>
                  • {row.scope}
                </Text>
              ))}
            </>
          )}
          {hasOtherCost && (
            <>
              <Text style={[styles.subHead, { marginTop: scopeLines.length ? spacing.md : 0 }]}>
                Other cost (items)
              </Text>
              {otherCost.map((row, i) => (
                <View key={i} style={styles.costRow}>
                  <Text style={styles.costItem} numberOfLines={2}>
                    {row.item || "—"}
                  </Text>
                  <Text style={styles.costQty}>{row.qty || "—"}</Text>
                  <Text style={styles.costUom}>{row.uom || "—"}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {wo?.motorClass === "AC" && acFields.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AC motor — winding & mechanical</Text>
          <SpecFieldGrid
            fields={acFields}
            values={acSpecs}
            onChange={(k, v) => setAcSpecs((prev) => ({ ...prev, [k]: v }))}
            onFieldFocus={scrollFieldToCenter}
          />
        </View>
      )}

      {wo?.motorClass === "DC" && (dcMotorFields.length > 0 || armatureFields.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DC work order</Text>
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabBtn, dcSection === "dc" && styles.tabBtnActive]}
              onPress={() => setDcSection("dc")}
            >
              <Text style={[styles.tabBtnText, dcSection === "dc" && styles.tabBtnTextActive]}>
                DC motor
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, dcSection === "armature" && styles.tabBtnActive]}
              onPress={() => setDcSection("armature")}
            >
              <Text
                style={[styles.tabBtnText, dcSection === "armature" && styles.tabBtnTextActive]}
              >
                Armature
              </Text>
            </Pressable>
          </View>
          {dcSection === "dc" ? (
            <SpecFieldGrid
              fields={dcMotorFields}
              values={dcSpecs}
              onChange={(k, v) => setDcSpecs((prev) => ({ ...prev, [k]: v }))}
              onFieldFocus={scrollFieldToCenter}
            />
          ) : (
            <SpecFieldGrid
              fields={armatureFields}
              values={armatureSpecs}
              onChange={(k, v) => setArmatureSpecs((prev) => ({ ...prev, [k]: v }))}
              onFieldFocus={scrollFieldToCenter}
            />
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <View collapsable={false} ref={commentFieldWrapRef}>
          <TextInput
            style={styles.textArea}
            value={comment}
            onChangeText={setComment}
            onFocus={() => scrollFieldToCenter(commentFieldWrapRef.current)}
            placeholder="Notes from the floor…"
            placeholderTextColor={colors.secondary}
            multiline
          />
        </View>
        <Pressable
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={saveWorkOrder}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
        <Text style={styles.saveHint}>
          Saves motor field changes and appends the note above in one request. Job type and date are set in the CRM.
        </Text>
      </View>

      {notes.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technician notes</Text>
          {notes.map((n, i) => (
            <View key={i} style={styles.noteCard}>
              <Text style={styles.noteMeta}>
                {(n.authorName || "Tech") + (n.at ? ` · ${new Date(n.at).toLocaleString()}` : "")}
              </Text>
              <Text style={styles.noteBody}>{n.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Modal
        visible={!!photoPreviewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPreviewUri(null)}
      >
        <Pressable style={styles.previewBackdrop} onPress={() => setPhotoPreviewUri(null)}>
          {photoPreviewUri ? (
            <Image
              pointerEvents="none"
              source={{ uri: photoPreviewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.previewHint} pointerEvents="none">
            Tap anywhere to close
          </Text>
        </Pressable>
      </Modal>

      <Modal visible={statusPickerOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStatusPickerOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set status</Text>
            <FlatList
              data={statusOptions}
              keyExtractor={(s) => s}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.statusRow}
                  onPress={() => saveStatus(item)}
                  disabled={saving}
                >
                  <Text style={styles.statusRowText}>{item}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.modalCancel} onPress={() => setStatusPickerOpen(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 320,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  error: {
    color: colors.danger,
    fontSize: 16,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  bannerError: {
    backgroundColor: "hsl(0, 72%, 96%)",
    color: colors.danger,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  woTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.title,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 18,
  },
  hintStrong: {
    fontWeight: "700",
    color: colors.title,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  subHead: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.title,
    marginBottom: spacing.sm,
  },
  readRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  readLabel: {
    fontSize: 13,
    color: colors.secondary,
    flexShrink: 0,
  },
  readValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.title,
    flex: 1,
    textAlign: "right",
  },
  statusBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
  },
  statusBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.title,
    flex: 1,
  },
  statusChevron: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
  line: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  costItem: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  costQty: {
    width: 44,
    fontSize: 14,
    textAlign: "right",
    color: colors.title,
    fontVariant: ["tabular-nums"],
  },
  costUom: {
    width: 56,
    fontSize: 13,
    color: colors.secondary,
  },
  tabBar: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.formBg,
    alignItems: "center",
  },
  tabBtnActive: {
    borderColor: colors.primary,
    backgroundColor: "hsl(214, 72%, 96%)",
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.secondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
  },
  fieldRow: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondary,
    marginBottom: 4,
  },
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
  saveHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 16,
  },
  textArea: {
    minHeight: 100,
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noteCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  noteMeta: {
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    maxHeight: "70%",
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 2,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  statusRow: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusRowText: {
    fontSize: 16,
    color: colors.text,
  },
  modalCancel: {
    padding: spacing.lg,
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.secondary,
    fontSize: 16,
  },
  photoHelp: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  photoStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  photoThumbWrap: {
    marginRight: 10,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoThumb: {
    width: 88,
    height: 88,
    backgroundColor: colors.formBg,
  },
  addPhotoTile: {
    marginRight: 10,
    width: 88,
    height: 88,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: "hsl(214, 72%, 97%)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoTileBusy: {
    opacity: 0.85,
  },
  addPhotoText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  photoEmpty: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.secondary,
    fontStyle: "italic",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  previewImage: {
    width: "100%",
    height: "72%",
  },
  previewHint: {
    marginTop: spacing.lg,
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
});
