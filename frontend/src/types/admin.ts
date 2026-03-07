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

export type AdminAttendanceRecord = {
  id: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  checkedInAt: string;
  source: string;
};

export type AdminTokenResponse = {
  sessionId: string;
  token: string;
  expiresAt: string;
};

export type AdminSessionState = {
  id: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  mandatory: boolean;
  status: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSessionListItem = {
  id: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  mandatory: boolean;
  status: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminMember = {
  id: string;
  memberCode: string;
  fullName: string;
  active: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  dob?: string | null;
  bloodType?: string | null;
  address?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
};

export type AdminMemberAttendanceSession = {
  sessionId: string;
  eventName: string;
  mandatory: boolean;
  checkedInAt: string;
  source: string;
  sessionStatus: string;
};

export type AdminMemberAttendanceStats = {
  mandatoryAttended: number;
  mandatoryTotal: number;
  mandatoryRatePercent: number;
  optionalAttended: number;
  optionalTotal: number;
  optionalRatePercent: number;
};
