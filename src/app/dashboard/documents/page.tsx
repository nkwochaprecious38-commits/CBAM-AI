"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FolderPlus, History, Lock, Search, Trash2, Upload, FileUp } from "lucide-react";
import { PageHeader, Modal, Notice, Spinner, EmptyState, Table, Confirm, useToast } from "@/components/dash/ui";
import { useApp } from "@/components/dash/AppContext";
import { fmtDate, label } from "@/lib/format";
import { useRefs } from "@/components/dash/ResourceManager";

const cats: [string, string][] = [["supplier_declaration", "Supplier emissions declaration"], ["production_record", "Production record"], ["product_information", "Product information"], ["customs_document", "Customs document"], ["import_record", "Import record"], ["carbon_price_evidence", "Carbon price evidence"], ["verification_document", "Verification document"], ["calculation_file", "Supporting calculation file"], ["compliance_report", "Compliance report"], ["other", "Other"]];
const MAX = 25 * 1024 * 1024;
const safe = (n: string) => n.replace(/[^\w.]+/g, "_");
const size = (b?: number | null) => (b ? (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`) : "Unknown");

export default function Page() {
  const { supabase, orgId, userId, canWrite } = useApp();
  const toast = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [folder, setFolder] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [up, setUp] = useState<{ version?: any } | null>(null);
  const [preview, setPreview] = useState<{ doc: any; url: string } | null>(null);
  const [hist, setHist] = useState<any | null>(null);
  const [del, setDel] = useState<any | null>(null);
  const [newFolder, setNewFolder] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("documents").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    if (error) setErr(error.message); else { setErr(""); setDocs(data || []); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const folders = useMemo(() => Array.from(new Set(["General", ...docs.map((d) => d.folder), ...extra])).sort(), [docs, extra]);
  const shown = docs.filter((d) => (!folder || d.folder === folder) && (!cat || d.category === cat) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));

  async function signed(path: string, download?: string) {
    const { data, error } = await supabase.storage.from("cbam-documents").createSignedUrl(path, 300, download ? { download } : undefined);
    if (error || !data) { toast("error", error?.message || "Could not create a link."); return null; }
    return data.signedUrl;
  }
  async function open(d: any) { const url = await signed(d.storage_path); if (url) setPreview({ doc: d, url }); }
  async function dl(d: any) { const url = await signed(d.storage_path, d.name); if (url) window.location.href = url; }
  async function toggleAccess(d: any) {
    const next = d.access_level === "all" ? "managers" : "all";
    const { error } = await supabase.from("documents").update({ access_level: next }).eq("id", d.id).eq("org_id", orgId);
    if (error) toast("error", error.message); else { toast("success", next === "managers" ? "Restricted to managers." : "Visible to all members."); load(); }
  }
  async function remove(d: any) {
    const { error } = await supabase.from("documents").delete().eq("id", d.id).eq("org_id", orgId);
    setDel(null);
    if (error) return toast("error", error.message);
    toast("success", "Document record deleted."); load();
  }
  const canPreview = (m?: string) => !!m && (m.startsWith("image/") || m === "application/pdf" || m.startsWith("text/"));

  return (
    <>
      <PageHeader title="Documents" desc="Upload, organize and review supporting evidence. Files are private to your organization." actions={canWrite && <><button className="btn-secondary" onClick={() => setNewFolder("")}><FolderPlus size={16} />New folder</button><button className="btn-primary" onClick={() => setUp({})}><Upload size={16} />Upload</button></>} />
      {err && <Notice kind="error">Could not load documents: {err}</Notice>}
      <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="card h-fit p-3"><div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">Folders</div>
          {["", ...folders].map((f) => <button key={f || "all"} onClick={() => setFolder(f)} className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${folder === f ? "bg-mint font-semibold text-forest" : "hover:bg-offwhite"}`}>{f || "All documents"}</button>)}
          <p className="px-2 pt-2 text-xs text-muted">A new folder is saved once it holds a document.</p></aside>
        <div>
          <div className="mb-4 flex flex-wrap gap-2"><div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input pl-9" placeholder="Search by file name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search documents" /></div>
            <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          {loading ? <Spinner /> : !shown.length ? <EmptyState title={docs.length ? "No matching documents" : "No documents yet"} text={docs.length ? "Try another search, folder or category." : "Upload supplier declarations, customs documents and other evidence."} /> : (
            <Table head={["Name", "Category", "Folder", "Version", "Uploaded", "Access", "Actions"]}>
              {shown.map((d) => (
                <tr key={d.id}><td className="td font-medium">{d.name}<div className="text-xs font-normal text-muted">{size(d.size_bytes)}</div></td><td className="td">{label(d.category)}</td><td className="td">{d.folder}</td><td className="td">v{d.version}</td><td className="td">{fmtDate(d.created_at)}</td>
                  <td className="td">{d.access_level === "managers" ? <span className="badge bg-warn/15 text-[#8a5a0f]">Managers</span> : <span className="badge bg-mint text-forest">All members</span>}</td>
                  <td className="td"><div className="flex gap-0.5 text-forest">
                    <button className="rounded p-1.5 hover:bg-mint" onClick={() => open(d)} aria-label="Preview" title="Preview"><Eye size={16} /></button>
                    <button className="rounded p-1.5 hover:bg-mint" onClick={() => dl(d)} aria-label="Download" title="Download"><Download size={16} /></button>
                    <button className="rounded p-1.5 hover:bg-mint" onClick={() => setHist(d)} aria-label="History" title="Version history"><History size={16} /></button>
                    {canWrite && <><button className="rounded p-1.5 hover:bg-mint" onClick={() => setUp({ version: d })} aria-label="Upload new version" title="Upload new version"><FileUp size={16} /></button>
                      <button className="rounded p-1.5 hover:bg-mint" onClick={() => toggleAccess(d)} aria-label="Change access" title="Change access"><Lock size={16} /></button>
                      <button className="rounded p-1.5 text-danger hover:bg-danger/10" onClick={() => setDel(d)} aria-label="Delete" title="Delete"><Trash2 size={16} /></button></>}
                  </div></td></tr>))}
            </Table>)}
        </div>
      </div>
      {up && <UploadModal version={up.version} folders={folders} defaultFolder={folder} onClose={() => setUp(null)} onDone={() => { setUp(null); load(); }} />}
      {preview && <Modal title={preview.doc.name} onClose={() => setPreview(null)} wide>{canPreview(preview.doc.mime_type) ? (preview.doc.mime_type.startsWith("image/") ? <img src={preview.url} alt={preview.doc.name} className="max-h-[70vh] w-full object-contain" /> : <iframe src={preview.url} title={preview.doc.name} className="h-[70vh] w-full rounded-lg border border-line" />) : <Notice>Preview is not available for this file type. Use download instead.</Notice>}</Modal>}
      {hist && <History_ doc={hist} onClose={() => setHist(null)} signed={signed} />}
      {del && <Confirm danger title="Delete document" text={`Delete "${del.name}" and its version history? The deletion is written to the audit log. Only administrators and compliance managers can delete.`} confirmLabel="Delete" onConfirm={() => remove(del)} onCancel={() => setDel(null)} />}
      {newFolder !== null && <Modal title="New folder" onClose={() => setNewFolder(null)}><input className="input" autoFocus placeholder="Folder name" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} /><div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setNewFolder(null)}>Cancel</button><button className="btn-primary" onClick={() => { const n = newFolder.trim(); if (!n) return toast("error", "Enter a folder name."); setExtra((p) => [...p, n]); setFolder(n); setNewFolder(null); }}>Create</button></div></Modal>}
    </>
  );
}

function UploadModal({ version, folders, defaultFolder, onClose, onDone }: { version?: any; folders: string[]; defaultFolder: string; onClose: () => void; onDone: () => void }) {
  const { supabase, orgId, userId } = useApp();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("other"); const [folder, setFolder] = useState(defaultFolder || "General"); const [access, setAccess] = useState("all");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!file) return setErr("Choose a file.");
    if (file.size > MAX) return setErr("File is larger than 25 MB.");
    setBusy(true);
    const path = `${orgId}/${crypto.randomUUID()}_${safe(file.name)}`;
    const { error: ue } = await supabase.storage.from("cbam-documents").upload(path, file, { contentType: file.type || undefined });
    if (ue) { setBusy(false); return setErr(ue.message); }
    if (version) {
      const v = version.version + 1;
      const { error } = await supabase.from("documents").update({ storage_path: path, version: v, size_bytes: file.size, mime_type: file.type, name: file.name }).eq("id", version.id).eq("org_id", orgId);
      if (error) { setBusy(false); return setErr(error.message); }
      await supabase.from("document_revisions").insert({ org_id: orgId, document_id: version.id, version: v, storage_path: path, size_bytes: file.size, uploaded_by: (await supabase.auth.getUser()).data.user?.id });
    } else {
      const { data, error } = await supabase.from("documents").insert({ org_id: orgId, name: file.name, category, folder, access_level: access, storage_path: path, mime_type: file.type, size_bytes: file.size, uploaded_by: (await supabase.auth.getUser()).data.user?.id }).select("id").single();
      if (error || !data) { setBusy(false); return setErr(error?.message || "Could not save the document."); }
      await supabase.from("document_revisions").insert({ org_id: orgId, document_id: data.id, version: 1, storage_path: path, size_bytes: file.size, uploaded_by: (await supabase.auth.getUser()).data.user?.id });
    }
    setBusy(false); toast("success", version ? "New version uploaded." : "Document uploaded."); onDone();
  }
  return (
    <Modal title={version ? `New version of ${version.name}` : "Upload document"} onClose={onClose}>
      <form onSubmit={go} className="space-y-4">{err && <Notice kind="error">{err}</Notice>}
        <div><label className="label">File (up to 25 MB)</label><input ref={ref} type="file" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        {!version && <>
          <div><label className="label">Category</label><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label">Folder</label><select className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>{folders.map((f) => <option key={f}>{f}</option>)}</select></div>
          <div><label className="label">Who can see this</label><select className="input" value={access} onChange={(e) => setAccess(e.target.value)}><option value="all">All organization members</option><option value="managers">Managers only</option></select></div></>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? "Uploading" : "Upload"}</button></div>
      </form>
    </Modal>
  );
}

function History_({ doc, onClose, signed }: { doc: any; onClose: () => void; signed: (p: string, n?: string) => Promise<string | null> }) {
  const { supabase, orgId } = useApp();
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { supabase.from("document_revisions").select("*").eq("document_id", doc.id).eq("org_id", orgId).order("version", { ascending: false }).then(({ data }) => setRows(data || [])); }, [doc.id, supabase, orgId]);
  return (
    <Modal title={`Version history: ${doc.name}`} onClose={onClose}>
      {!rows ? <Spinner /> : !rows.length ? <p className="text-sm text-muted">No revisions recorded.</p> : (
        <ul className="divide-y divide-line text-sm">{rows.map((r) => (<li key={r.id} className="flex items-center justify-between py-2"><span>Version {r.version} <span className="text-muted">uploaded {fmtDate(r.created_at)}, {size(r.size_bytes)}</span></span>
          <button className="btn-ghost !py-1" onClick={async () => { const u = await signed(r.storage_path, doc.name); if (u) window.location.href = u; }}>Download</button></li>))}</ul>)}
    </Modal>
  );
}
