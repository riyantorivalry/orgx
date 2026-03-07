export type PublicSession = {
  id: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  tokenExpiresAt: string;
};

export type Member = {
  id: string;
  memberCode: string;
  fullName: string;
  active: boolean;
};

export type AttendanceResult = {
  status: string;
  message: string;
};
