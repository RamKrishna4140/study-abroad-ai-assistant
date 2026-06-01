function Navbar() {
  const role = localStorage.getItem("role");

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-white">AI Study Abroad</h1>
        </div>

        <div className="hidden gap-6 text-sm text-slate-300 md:flex">
          <a href="#features" className="hover:text-white">
            Features
          </a>

          <a href="#universities" className="hover:text-white">
            Universities
          </a>

          {role && (
            <a href="/dashboard" className="hover:text-white">
              Dashboard
            </a>
          )}
        </div>

        {!role ? (
          <a
            href="/login"
            className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Login
          </a>
        ) : (
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("role");
              window.location.href = "/";
            }}
            className="rounded-xl bg-red-500 px-5 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
