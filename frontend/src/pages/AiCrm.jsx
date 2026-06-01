import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import CRMNavbar from "../components/CRMNavbar";

function AiCrm() {
  const API_BASE = "http://127.0.0.1:8000";

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const askCrm = async () => {
    if (!question.trim()) return;

    const res = await axios.post(`${API_BASE}/crm-chat`, {
      message: question,
      session_id: "crm-assistant",
    });

    setAnswer(res.data.reply || res.data.error);
  };

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white">
      <CRMNavbar />
      <h1 className="mb-2 text-4xl font-bold">AI CRM Assistant</h1>
      <p className="mb-8 text-slate-400">
        Ask questions from your student CRM data.
      </p>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <textarea
          placeholder="Ask: Which students are missing IELTS?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows="4"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        />

        <button
          onClick={askCrm}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
        >
          Ask CRM
        </button>
      </div>

      {answer && (
        <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6 leading-7">
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default AiCrm;