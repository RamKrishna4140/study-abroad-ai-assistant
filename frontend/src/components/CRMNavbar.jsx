function CRMNavbar() {
  const role = localStorage.getItem("role");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  return (
    <div className="mb-8 flex items-center justify-between border-b border-slate-700 pb-4">
      <div className="flex gap-6 text-sm">

        <a href="/dashboard" className="hover:text-blue-400">
          Dashboard
        </a>

        <a href="/students" className="hover:text-blue-400">
          Students
        </a>

        <a href="/applications" className="hover:text-blue-400">
          Applications
        </a>

        <a href="/tasks" className="hover:text-blue-400">
          Tasks
        </a>

        <a href="/ai-crm" className="hover:text-blue-400">
          AI CRM
        </a>

        {role === "admin" && (
          <a href="/admin" className="hover:text-blue-400">
            Admin
          </a>
        )}
      </div>

      <button
        onClick={logout}
        className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
}

export default CRMNavbar;