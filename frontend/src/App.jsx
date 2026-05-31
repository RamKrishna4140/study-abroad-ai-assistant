import { BrowserRouter, Routes, Route } from "react-router-dom";
import Students from "./pages/Students";

import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import StudentDetail from "./pages/StudentDetail";
import AiCrm from "./pages/AiCrm";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/students" element={<Students />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/student/:studentId" element={<StudentDetail />} />
        <Route path="/ai-crm" element={<AiCrm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
