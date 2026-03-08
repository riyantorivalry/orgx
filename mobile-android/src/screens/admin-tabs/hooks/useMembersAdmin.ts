import { useState } from "react";
import { adminApi, type CreateMemberInput } from "../../../services/adminApi";
import type { AdminMember } from "../../../types/admin";
import type { MemberFormState } from "../types";

const EMPTY_MEMBER_FORM: MemberFormState = {
  fullName: "",
  dob: "",
  bloodType: "",
  address: "",
  email: "",
  mobileNumber: "",
  active: true,
};

function formToInput(form: MemberFormState): CreateMemberInput {
  return {
    fullName: form.fullName.trim(),
    active: form.active,
    dob: form.dob.trim() || undefined,
    bloodType: form.bloodType.trim() || undefined,
    address: form.address.trim() || undefined,
    email: form.email.trim() || undefined,
    mobileNumber: form.mobileNumber.trim() || undefined,
  };
}

function memberToForm(member: AdminMember): MemberFormState {
  return {
    fullName: member.fullName ?? "",
    dob: member.dob ?? "",
    bloodType: member.bloodType ?? "",
    address: member.address ?? "",
    email: member.email ?? "",
    mobileNumber: member.mobileNumber ?? "",
    active: member.active,
  };
}

type UseMembersAdminOptions = {
  openConfirm: (options: { title: string; message: string; confirmLabel: string; tone: "primary" | "danger" }) => Promise<boolean>;
  setError: (value: string) => void;
  setSuccess: (value: string) => void;
};

export function useMembersAdmin({ openConfirm, setError, setSuccess }: UseMembersAdminOptions) {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [membersQuery, setMembersQuery] = useState("");
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberCreateOpen, setMemberCreateOpen] = useState(false);
  const [memberListOpen, setMemberListOpen] = useState(false);
  const [expandedMemberIds, setExpandedMemberIds] = useState<Record<string, boolean>>({});
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);

  async function refreshMembers(query = membersQuery) {
    const data = await adminApi.listMembers(query, true);
    setMembers(data);
  }

  function clearMemberMenu() {
    setOpenMemberMenuId(null);
  }

  function toggleMemberExpanded(memberId: string) {
    setExpandedMemberIds((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  }

  function toggleMemberMenu(memberId: string) {
    setOpenMemberMenuId((prev) => (prev === memberId ? null : memberId));
  }

  function resetMemberForm() {
    setEditingMemberId(null);
    setMemberForm(EMPTY_MEMBER_FORM);
  }

  function startEditMember(member: AdminMember) {
    setEditingMemberId(member.id);
    setMemberCreateOpen(true);
    setMemberForm(memberToForm(member));
    setError("");
    setSuccess("");
  }

  async function saveMember() {
    if (!memberForm.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setMemberSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = formToInput(memberForm);
      if (editingMemberId) {
        await adminApi.updateMember(editingMemberId, payload);
        setSuccess("Member updated.");
      } else {
        await adminApi.createMember(payload);
        setSuccess("Member created.");
        setMemberCreateOpen(false);
      }
      resetMemberForm();
      await refreshMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save member");
    } finally {
      setMemberSaving(false);
    }
  }

  async function toggleMemberActive(member: AdminMember) {
    const nextActive = !member.active;
    const ok = await openConfirm({
      title: `${nextActive ? "Activate" : "Deactivate"} Member`,
      message: `Do you want to ${nextActive ? "activate" : "deactivate"} ${member.fullName}?`,
      confirmLabel: nextActive ? "Activate" : "Deactivate",
      tone: nextActive ? "primary" : "danger",
    });
    if (!ok) {
      return;
    }

    setMemberSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateMember(member.id, {
        fullName: member.fullName,
        active: nextActive,
        dob: member.dob ?? undefined,
        bloodType: member.bloodType ?? undefined,
        address: member.address ?? undefined,
        email: member.email ?? undefined,
        mobileNumber: member.mobileNumber ?? undefined,
      });
      setSuccess(`Member ${nextActive ? "activated" : "deactivated"}.`);
      await refreshMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update member status");
    } finally {
      setMemberSaving(false);
    }
  }

  async function deleteMember(member: AdminMember) {
    const ok = await openConfirm({
      title: "Delete Member",
      message: `Delete ${member.fullName}? This action cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) {
      return;
    }

    setMemberSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.deleteMember(member.id);
      if (editingMemberId === member.id) {
        resetMemberForm();
      }
      setSuccess("Member deleted.");
      await refreshMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete member");
    } finally {
      setMemberSaving(false);
    }
  }

  return {
    members,
    membersQuery,
    setMembersQuery,
    memberForm,
    setMemberForm,
    editingMemberId,
    memberSaving,
    memberCreateOpen,
    setMemberCreateOpen,
    memberListOpen,
    setMemberListOpen,
    expandedMemberIds,
    openMemberMenuId,
    refreshMembers,
    clearMemberMenu,
    toggleMemberExpanded,
    toggleMemberMenu,
    resetMemberForm,
    startEditMember,
    saveMember,
    toggleMemberActive,
    deleteMember,
  };
}
