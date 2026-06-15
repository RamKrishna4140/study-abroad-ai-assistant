function CRMLayout({ children }) {
  const role = localStorage.getItem("role");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-white">
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-800 bg-slate-950 p-6">
        <h1 className="mb-8 text-2xl font-bold">FLCS CRM</h1>

        <nav className="space-y-3 text-sm">
          <a
            href="/dashboard"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Dashboard
          </a>

          <a
            href="/students"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Students
          </a>

          <a
            href="/applications"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Applications
          </a>

          <a
            href="/tasks"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Tasks
          </a>
          <a
            href="/missing-documents"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Missing Documents
          </a>

          <a
            href="/ai-crm"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            AI CRM
          </a>

          {role === "admin" && (
            <a
              href="/admin"
              className="block rounded-lg px-4 py-3 hover:bg-slate-800"
            >
              Admin
            </a>
          )}
        </nav>

        <button
          onClick={logout}
          className="absolute bottom-6 left-6 right-6 rounded-lg bg-red-600 px-4 py-3 font-semibold hover:bg-red-700"
        >
          Logout
        </button>
      </aside>

      <main className="ml-64 min-h-screen flex-1 p-8">{children}</main>
    </div>
  );
}

export default CRMLayout;
