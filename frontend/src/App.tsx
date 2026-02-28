export function App() {
  return (
    <main style={{ fontFamily: 'Arial, sans-serif', maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Organization Attendance</h1>
      <p>Initial scaffold is ready:</p>
      <ul>
        <li>Admin can maintain members (manual CRUD via backend).</li>
        <li>Admin can create/start/close attendance sessions.</li>
        <li>Admin can issue 5-minute QR tokens.</li>
        <li>Public page flow can submit attendance without login.</li>
      </ul>
      <p>Next step: implement full UI screens and QR rendering.</p>
    </main>
  );
}
