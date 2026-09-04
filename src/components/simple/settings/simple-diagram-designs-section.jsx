"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form, FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";

const FORM_ID = "shop-diagram-template-form";

export default function SimpleDiagramDesignsSection() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/diagram-templates?mine=1", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast.error(e.message || "Could not load diagram designs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setImageUrl("");
    setEditOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setName(String(row.name || ""));
    setDescription(String(row.description || ""));
    setImageUrl(String(row.imageUrl || ""));
    setEditOpen(true);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/dashboard/diagram-templates/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(String(data.url || ""));
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), imageUrl: imageUrl.trim() };
      const res = await fetch("/api/dashboard/diagram-templates", {
        method: editing?.id ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing?.id ? { id: editing.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditOpen(false);
      await load();
      toast.success(editing?.id ? "Updated." : "Added.");
    } catch (err) {
      toast.error(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: "Delete diagram design?",
      message: `Remove "${row.name}" from your shop designs?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/dashboard/diagram-templates", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
      toast.success("Deleted.");
    } catch (err) {
      toast.error(err.message || "Could not delete");
    }
  };

  const columns = [
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1.5 text-primary hover:bg-primary/10"
            title="Edit"
            onClick={() => openEdit(row)}
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded p-1.5 text-danger hover:bg-danger/10"
            title="Delete"
            onClick={() => handleDelete(row)}
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      key: "preview",
      label: "Preview",
      render: (_, row) =>
        row.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.imageUrl} alt="" className="h-12 w-16 rounded border border-border object-contain bg-white" />
        ) : (
          "—"
        ),
    },
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    {
      key: "status",
      label: "Status",
      render: (_, row) => (
        <Badge
          variant={row.isActive !== false ? "success" : "default"}
          className="rounded-full px-2.5 py-0.5 text-xs"
        >
          {row.isActive !== false ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <FormContainer>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <FormSectionTitle>Diagram designs</FormSectionTitle>
          <p className="mt-1 text-sm text-secondary">
            Upload blank diagrams for your shop. Platform designs from admin are also available when drawing on a job.
          </p>
        </div>
        <Button type="button" size="sm" variant="primary" onClick={openCreate}>
          <FiPlus className="h-4 w-4 shrink-0" />
          Add design
        </Button>
      </div>

      <Table columns={columns} data={items} loading={loading} emptyMessage="No shop diagram designs yet." />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? "Edit diagram design" : "Add diagram design"}
        size="lg"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              size="sm"
              variant="primary"
              disabled={saving || uploading || !imageUrl}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id={FORM_ID} onSubmit={handleSave} className="flex flex-col gap-4 !space-y-0">
          <div>
            <label className="mb-1 block text-sm font-medium text-title">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-title">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-title">Blank design image</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleUpload(f);
              }}
              className="block w-full text-sm text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            />
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Preview"
                className="mt-3 max-h-48 rounded border border-border object-contain bg-white"
              />
            ) : null}
          </div>
        </Form>
      </Modal>
    </FormContainer>
  );
}
