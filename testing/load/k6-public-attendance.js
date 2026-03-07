import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    read_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<800"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:8080";
const token = __ENV.TOKEN;
const memberId = __ENV.MEMBER_ID;

export default function () {
  if (!token || !memberId) {
    throw new Error("TOKEN and MEMBER_ID environment variables are required.");
  }

  const sessionRes = http.get(`${baseUrl}/api/public/sessions/by-token/${encodeURIComponent(token)}`);
  check(sessionRes, {
    "session lookup succeeded": (r) => r.status === 200,
  });

  if (sessionRes.status !== 200) {
    sleep(1);
    return;
  }

  const session = sessionRes.json();
  const sessionId = session.id;

  const membersRes = http.get(`${baseUrl}/api/public/sessions/${sessionId}/members`);
  check(membersRes, {
    "members lookup succeeded": (r) => r.status === 200,
  });

  const submitRes = http.post(
    `${baseUrl}/api/public/attendance`,
    JSON.stringify({ token, memberId }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(submitRes, {
    "attendance submit accepted": (r) => r.status === 200 || r.status === 429,
  });

  sleep(1);
}
