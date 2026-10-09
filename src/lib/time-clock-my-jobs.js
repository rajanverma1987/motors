/**
 * Time-clock "my jobs" helpers: jobs assigned via datasheet.technician.
 */

import mongoose from "mongoose";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { notRemovedClause } from "@/lib/removed-records";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  workOrderClosedStatusesFromMerged,
  workOrderStatusSelectOptionsFromMerged,
} from "@/lib/dropdown-catalog";
import { datasheetStorageKey, resolveMachineType } from "@/lib/machine-types";
import {
  normalizeAcDatasheet,
  normalizeDcDatasheet,
  syncDatasheetJobNumber,
} from "@/lib/simple-datasheet-form";
import {
  normalizeGeneratorDatasheet,
  normalizePumpDatasheet,
} from "@/lib/simple-datasheet-extra";
import { RECORD_TYPE_JOB } from "@/lib/simple-service-proposal-form";
import { findShopByTimeClockToken } from "@/lib/time-clock-settings";
import { getTimeClockSessionFromRequest } from "@/lib/time-clock-session";
import Employee from "@/models/Employee";

export function technicianMatchesEmployee(sheetTechnician, employeeId) {
  const tech = String(sheetTechnician || "").trim();
  const emp = String(employeeId || "").trim();
  if (!tech || !emp) return false;
  return tech === emp || tech.toLowerCase() === emp.toLowerCase();
}

export function proposalAssignedToEmployee(doc, employeeId) {
  const machineType = resolveMachineType(doc?.motorPower, "AC");
  const key = datasheetStorageKey(machineType);
  const sheet = doc?.[key];
  if (!sheet || typeof sheet !== "object") return false;
  return technicianMatchesEmployee(sheet.technician, employeeId);
}

export function normalizeDatasheetForMachine(machineType, raw, documentNumber) {
  const type = resolveMachineType(machineType, "AC");
  let sheet;
  if (type === "DC") sheet = normalizeDcDatasheet(raw || {});
  else if (type === "Pump") sheet = normalizePumpDatasheet(raw || {});
  else if (type === "Generator") sheet = normalizeGeneratorDatasheet(raw || {});
  else sheet = normalizeAcDatasheet(raw || {});
  return syncDatasheetJobNumber(sheet, documentNumber);
}

export function closedStatusSet(mergedSettings) {
  return new Set(
    (workOrderClosedStatusesFromMerged(mergedSettings) || [])
      .map((s) => String(s || "").trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isJobStatusClosed(jobStatus, mergedSettings) {
  const key = String(jobStatus || "").trim().toLowerCase();
  if (!key) return false;
  return closedStatusSet(mergedSettings).has(key);
}

export async function loadShopMergedSettings(ownerEmail) {
  const settingsDoc = await UserSettings.findOne({
    ownerEmail: String(ownerEmail || "").trim().toLowerCase(),
  }).lean();
  return mergeUserSettings(settingsDoc?.settings);
}

/**
 * Mongo filter: JOBs where any machine datasheet technician matches employeeId.
 * Open-list callers should also exclude closed jobStatus in JS or via $nin.
 */
export function mongoMyJobsTechnicianClause(employeeId) {
  const id = String(employeeId || "").trim();
  if (!id) return { _id: null };
  return {
    recordType: RECORD_TYPE_JOB,
    $or: [
      { "acDatasheet.technician": id },
      { "dcDatasheet.technician": id },
      { "pumpDatasheet.technician": id },
      { "generatorDatasheet.technician": id },
    ],
  };
}

export function serializeMyJobListRow(doc, mergedSettings) {
  const machineType = resolveMachineType(doc?.motorPower, "AC");
  const key = datasheetStorageKey(machineType);
  const sheet = doc?.[key] && typeof doc[key] === "object" ? doc[key] : null;
  const documentNumber = String(doc?.documentNumber || doc?.quote || "").trim();
  const jobStatus = String(doc?.jobStatus || "").trim();
  const manufacturer = String(sheet?.dataSheet?.manufacturer || sheet?.manufacturer || doc?.manufacturer || "").trim();
  const model =
    String(sheet?.dataSheet?.model || sheet?.modelNumber || doc?.modelNumber || "").trim();
  return {
    id: String(doc?._id || ""),
    documentNumber,
    companyName: String(doc?.companyName || sheet?.company || "").trim(),
    machineType,
    jobStatus,
    jobStatusClosed: isJobStatusClosed(jobStatus, mergedSettings),
    motorLabel: [manufacturer, model].filter(Boolean).join(" · "),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

export function serializeMyJobDetail(doc, mergedSettings) {
  const list = serializeMyJobListRow(doc, mergedSettings);
  const machineType = list.machineType;
  const key = datasheetStorageKey(machineType);
  const rawSheet = doc?.[key];
  const datasheet = normalizeDatasheetForMachine(machineType, rawSheet, list.documentNumber);
  const statusOptions = workOrderStatusSelectOptionsFromMerged(mergedSettings);
  return {
    ...list,
    customerId: String(doc?.customerId || "").trim(),
    manufacturer: String(doc?.manufacturer || "").trim(),
    hpKw: String(doc?.hpKw || "").trim(),
    datasheetKey: key,
    datasheet,
    statusOptions,
  };
}

export async function requireTimeClockEmployee(request, token) {
  const session = await getTimeClockSessionFromRequest(request);
  if (!session || session.timeClockToken !== token) {
    return { error: { status: 401, body: { error: "Sign in with your passkey first." } } };
  }
  const shop = await findShopByTimeClockToken(token);
  if (!shop || shop.ownerEmail !== session.shopEmail) {
    return { error: { status: 401, body: { error: "Invalid session." } } };
  }
  const emp = await Employee.findOne({
    _id: session.employeeId,
    createdByEmail: shop.ownerEmail,
  }).lean();
  if (!emp || emp.employmentStatus !== "Active" || emp.timeClockEnabled === false) {
    return { error: { status: 403, body: { error: "Employee not eligible for time clock." } } };
  }
  return { session, shop, emp };
}

export async function requireTechnicianSession(request, token) {
  const auth = await requireTimeClockEmployee(request, token);
  if (auth.error) return auth;
  if (!auth.emp.technicianAppAccess) {
    return { error: { status: 403, body: { error: "Technician access is not enabled for this employee." } } };
  }
  return auth;
}

export async function findAssignedJob(ownerEmail, employeeId, proposalId) {
  const id = String(proposalId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await SimpleServiceProposal.findOne({
    _id: id,
    createdByEmail: String(ownerEmail || "").trim().toLowerCase(),
    recordType: RECORD_TYPE_JOB,
    ...notRemovedClause(),
  }).lean();
  if (!doc) return null;
  if (!proposalAssignedToEmployee(doc, employeeId)) return null;
  return doc;
}
