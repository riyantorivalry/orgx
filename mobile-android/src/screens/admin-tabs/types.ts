import type { AdminSessionListItem } from "../../types/admin";

export type SessionGroup = {
  key: string;
  label: string;
  timeStart: string;
  timeEnd: string;
  items: AdminSessionListItem[];
};

export type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "primary" | "danger";
  resolve: (value: boolean) => void;
};

export type SessionFormState = {
  eventName: string;
  startsAtLocal: string;
  endsAtLocal: string;
  mandatory: boolean;
};

export type MemberFormState = {
  fullName: string;
  dob: string;
  bloodType: string;
  address: string;
  email: string;
  mobileNumber: string;
  active: boolean;
};
