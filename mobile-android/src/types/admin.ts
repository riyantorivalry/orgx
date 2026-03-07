export type AdminAuthUser = {
  username: string;
};

export type AdminSessionDashboard = {
  id: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  totalCheckIns: number;
  totalActiveMembers: number;
  checkInRatePercent: number;
};

export type AdminSessionListItem = {
  id: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  mandatory: boolean;
  status: string;
};

export type AdminMember = {
  id: string;
  memberCode: string;
  fullName: string;
  active: boolean;
  dob?: string | null;
  bloodType?: string | null;
  address?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
};
