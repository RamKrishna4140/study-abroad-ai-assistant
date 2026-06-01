import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const API_BASE = "http://127.0.0.1:8000";
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_BASE}/login`, {
        username,
        password,
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role", res.data.role);

      navigate("/dashboard");
    } catch (error) {
      alert("Invalid username or password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          FLCS Login
        </h1>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />

        <button
          onClick={handleLogin}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default Login;