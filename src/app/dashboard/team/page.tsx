"use client";
import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { PageHeader, Notice, Spinner, Table, Modal, Confirm, useToast, EmptyState } from "@/components/dash/ui";
import { useApp, roleLabels, type Role } from "@/components/dash/AppContext";
import { emailOk } from "@/lib/validation";
import { fmtDate } from "@/lib/format";

const rolesList = Object.entries(roleLabels) as [Role, string][];
export default function Page() {
  const { supabase, orgId, isAdmin, userId } = useApp();
  const toast = useToast();
  const [members, setMembers] = useState<any[]>([]); const [invs, setInvs] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false); const [email, setEmail] = useState(""); const [role, setRole] = useState<Role>("team_member"); const [err, setErr] = useState("");
  const [link, setLink] = useState(""); const [rm, setRm] = useState<any | null>(null);
  async function load() {
    const { data: m } = await supabase.from("memberships").select("*").eq("org_id", orgId).order("created_at");
    const ids = (m || []).map((x) => x.user_id);
    const { data: p } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] as any[] };
    setMembers((m || []).map((x) => ({ ...x, profile: (p || []).find((y: any) => y.id === x.user_id) })));
    if (isAdmin) { const { data: i } = await supabase.from("invitations").select("*").eq("org_id", orgId).order("created_at", { ascending: false }); setInvs(i || []); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function invite(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!emailOk(email)) return setErr("Enter a valid email address.");
    if (members.some((m) => m.profile?.email?.toLowerCase() === email.trim().toLowerCase())) return setErr("This person is already a member.");
    const { data, error } = await supabase.from("invitations").insert({ org_id: orgId, email: email.trim(), role, invited_by: userId }).select("token").single();
    if (error || !data) return setErr(error?.message || "Could not create the invitation.");
    setLink(`${window.location.origin}/signup?invite=${data.token}&email=${encodeURIComponent(email.trim())}`); setEmail(""); load();
  }
  async function setMemberRole(id: string, r: string) {
    const { error } = await supabase.from("memberships").update({ role: r }).eq("id", id).eq("org_id", orgId);
    if (error) toast("error", error.message); else { toast("success", "Role updated."); load(); }
  }
  if (loading) return <Spinner />;
  return (
    <>
      <PageHeader title="Team Management" desc="Invite colleagues and control what they can do." actions={isAdmin && <button className="btn-primary" onClick={() => { setShow(true); setLink(""); }}>Invite team member</button>} />
      {!isAdmin && <div className="mb-4"><Notice>Only Organization Admins can invite members or change roles.</Notice></div>}
      <Table head={["Name", "Email", "Role", "Joined", ""]}>{members.map((m) => (<tr key={m.id}><td className="td font-medium">{m.profile?.full_name || "Not set"}</td><td className="td">{m.profile?.email}</td>
        <td className="td">{isAdmin && m.user_id !== userId ? <select className="input !py-1.5" value={m.role} onChange={(e) => setMemberRole(m.id, e.target.value)} aria-label="Role">{rolesList.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select> : roleLabels[m.role as Role]}</td>
        <td className="td">{fmtDate(m.created_at)}</td><td className="td">{isAdmin && m.user_id !== userId && <button className="rounded p-1.5 text-danger hover:bg-danger/10" aria-label="Remove member" onClick={() => setRm(m)}><Trash2 size={16} /></button>}</td></tr>))}</Table>
      {isAdmin && (<><h2 className="mb-3 mt-8 text-xl font-bold">Pending invitations</h2>{!invs.filter((i) => i.status === "pending").length ? <EmptyState title="No pending invitations" /> : <Table head={["Email", "Role", "Invited", "Link", ""]}>{invs.filter((i) => i.status === "pending").map((i) => (<tr key={i.id}><td className="td">{i.email}</td><td className="td">{roleLabels[i.role as Role]}</td><td className="td">{fmtDate(i.created_at)}</td>
        <td className="td"><button className="btn-ghost !py-1" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/signup?invite=${i.token}&email=${encodeURIComponent(i.email)}`).catch(() => {}); toast("success", "Invitation link copied."); }}><Copy size={14} />Copy link</button></td>
        <td className="td"><button className="btn-ghost !py-1 text-danger" onClick={async () => { await supabase.from("invitations").update({ status: "revoked" }).eq("id", i.id); load(); }}>Revoke</button></td></tr>))}</Table>}</>)}
      <div className="mt-8"><h2 className="mb-2 text-lg font-bold">Roles</h2><p className="text-sm text-muted">Organization Admin can manage the team, settings and approvals. Compliance Manager can approve declarations. Analyst has read only access. All other roles can create and edit records. Suppliers do not join the team: they use the supplier portal and see only their own requests. Permissions are enforced in the database.</p></div>
      {show && <Modal title="Invite team member" onClose={() => setShow(false)}>
        {link ? (<><Notice kind="warn">Email delivery is not configured, so no email was sent. Copy this link and send it to the invited person. It only works for the email address you entered.</Notice><input readOnly className="input mt-3" value={link} onFocus={(e) => e.currentTarget.select()} /><div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setShow(false)}>Close</button><button className="btn-primary" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); toast("success", "Link copied."); }}>Copy link</button></div></>) : (
          <form onSubmit={invite} className="space-y-4" noValidate>{err && <Notice kind="error">{err}</Notice>}<div><label className="label">Work email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="label">Role</label><select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>{rolesList.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setShow(false)}>Cancel</button><button className="btn-primary">Create invitation</button></div></form>)}
      </Modal>}
      {rm && <Confirm danger title="Remove member" text={`Remove ${rm.profile?.full_name || rm.profile?.email} from this organization? They lose access immediately.`} confirmLabel="Remove" onConfirm={async () => { const { error } = await supabase.from("memberships").delete().eq("id", rm.id).eq("org_id", orgId); setRm(null); if (error) toast("error", error.message); else { toast("success", "Member removed."); load(); } }} onCancel={() => setRm(null)} />}
    </>
  );
}
