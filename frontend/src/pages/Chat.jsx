import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

function Chat() {
  const API_BASE = "http://127.0.0.1:8000";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! Ask me about universities, eligibility, admissions, or upload a PDF/knowledge document.",
    },
  ]);

  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(`session-${Date.now()}`);
  const [selectedFile, setSelectedFile] = useState(null);

  const [pdfMode, setPdfMode] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");

  const [knowledgeMode, setKnowledgeMode] = useState(false);
  const [knowledgeFile, setKnowledgeFile] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions`);
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadChat = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/chat-history/${id}`);

      const loadedMessages = [];

      res.data.messages.forEach((msg) => {
        loadedMessages.push({
          role: "user",
          content: msg.user_message || "",
        });

        loadedMessages.push({
          role: "assistant",
          content: msg.assistant_reply || "",
          sources: msg.sources_used || [],
        });
      });

      setMessages(loadedMessages);
      setSessionId(id);
      setPdfMode(false);
      setKnowledgeMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  const createNewChat = () => {
    const newSession = `session-${Date.now()}`;

    setSessionId(newSession);
    setMessages([
      {
        role: "assistant",
        content:
          "Hello! Ask me about universities, eligibility, admissions, or upload a PDF/knowledge document.",
      },
    ]);

    setPdfMode(false);
    setPdfFileName("");
    setKnowledgeMode(false);
    setKnowledgeFile("");
    setSelectedFile(null);
  };

  const deleteSession = async (id) => {
    try {
      await axios.delete(`${API_BASE}/sessions/${id}`);
      fetchSessions();

      if (id === sessionId) {
        createNewChat();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const uploadPDF = async () => {
    if (!selectedFile) return;

    try {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Uploading PDF: ${selectedFile.name}...`,
        },
      ]);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("session_id", sessionId);

      await axios.post(`${API_BASE}/upload-pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPdfMode(true);
      setKnowledgeMode(false);
      setPdfFileName(selectedFile.name);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `PDF uploaded successfully: ${selectedFile.name}\n\nPDF Mode is ready. Ask questions from this document.`,
        },
      ]);

      fetchSessions();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "PDF upload failed.",
        },
      ]);
    }
  };

  const uploadKnowledge = async () => {
    if (!selectedFile) return;

    try {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Uploading knowledge document: ${selectedFile.name}...`,
        },
      ]);

      const formData = new FormData();
      formData.append("file", selectedFile);

      await axios.post(`${API_BASE}/upload-knowledge`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setKnowledgeMode(true);
      setPdfMode(false);
      setKnowledgeFile(selectedFile.name);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Knowledge document uploaded successfully: ${selectedFile.name}\n\nKnowledge Mode is ready.`,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Knowledge upload failed.",
        },
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const currentInput = input;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: currentInput,
      },
    ]);

    setInput("");

    try {
      if (!pdfMode && !knowledgeMode) {
        const response = await fetch(`${API_BASE}/chat-stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: currentInput,
            session_id: sessionId,
          }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let assistantMessage = "";

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
          },
        ]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: assistantMessage,
            };
            return updated;
          });
        }

        fetchSessions();
        return;
      }

      const endpoint = knowledgeMode ? "/ask-knowledge" : "/ask-pdf";

      const res = await axios.post(`${API_BASE}${endpoint}`, {
        message: currentInput,
        session_id: sessionId,
        document_id: knowledgeMode ? knowledgeFile : null,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.reply || res.data.error || "No response received.",
          sources: res.data.sources_used || [],
        },
      ]);

      fetchSessions();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong.",
        },
      ]);
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-white">
      <aside className="w-[290px] border-r border-slate-800 bg-[#08112b] p-4">
        <h1 className="mb-6 text-3xl font-bold">Chat Sessions</h1>

        <button
          onClick={createNewChat}
          className="mb-6 w-full rounded-xl bg-blue-600 py-4 font-semibold hover:bg-blue-700"
        >
          + New Chat
        </button>

        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className={`flex items-center justify-between rounded-xl px-4 py-4 text-sm ${
                session.session_id === sessionId
                  ? "bg-slate-700"
                  : "hover:bg-slate-800"
              }`}
            >
              <div
                className="cursor-pointer truncate"
                onClick={() => loadChat(session.session_id)}
              >
                {session.last_message || "Untitled Chat"}
              </div>

              <button
                onClick={() => deleteSession(session.session_id)}
                className="ml-3 text-red-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="border-b border-slate-800 px-8 py-5">
          <h1 className="text-5xl font-bold">AI Study Abroad Assistant</h1>

          <p className="mt-2 text-lg text-slate-400">
            {knowledgeMode
              ? `Knowledge Mode Active${knowledgeFile ? ` — ${knowledgeFile}` : ""}`
              : pdfMode
                ? `PDF Mode Active${pdfFileName ? ` — ${pdfFileName}` : ""}`
                : "Normal Chat Mode"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth px-8 py-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-5 py-4 text-sm leading-7 ${
                    msg.role === "user" ? "bg-blue-600" : "bg-slate-800"
                  }`}
                >
                  <ReactMarkdown>{msg.content || ""}</ReactMarkdown>

                  {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                    <div className="mt-4 border-t border-slate-700 pt-3">
                      <p className="mb-2 text-xs font-semibold text-slate-400">
                        Sources used:
                      </p>

                      <div className="space-y-1">
                        {msg.sources.map((source, sourceIndex) => (
                          <div
                            key={sourceIndex}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300"
                          >
                            {source?.source || "Uploaded Document"} — relevance{" "}
                            {typeof source?.score === "number"
                              ? `${(source.score * 100).toFixed(1)}%`
                              : "N/A"}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-slate-800 px-8 py-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex gap-4">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
              />

              <button
                onClick={uploadPDF}
                className="rounded-xl bg-green-600 px-5 py-3 font-semibold hover:bg-green-700"
              >
                Upload PDF
              </button>

              <button
                onClick={uploadKnowledge}
                className="rounded-xl bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-700"
              >
                Upload Knowledge
              </button>

              <button
                onClick={() => {
                  setPdfMode(!pdfMode);
                  if (!pdfMode) setKnowledgeMode(false);
                }}
                className={`rounded-xl px-5 py-3 font-semibold ${
                  pdfMode ? "bg-green-600" : "bg-slate-700"
                }`}
              >
                {pdfMode ? "PDF On" : "PDF Off"}
              </button>

              <button
                onClick={() => {
                  setKnowledgeMode(!knowledgeMode);
                  if (!knowledgeMode) setPdfMode(false);
                }}
                className={`rounded-xl px-5 py-3 font-semibold ${
                  knowledgeMode ? "bg-purple-600" : "bg-slate-700"
                }`}
              >
                {knowledgeMode ? "Knowledge On" : "Knowledge Off"}
              </button>
            </div>

            <div className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder={
                  knowledgeMode
                    ? "Ask from FLCS knowledgebase..."
                    : pdfMode
                      ? "Ask a question from uploaded PDF..."
                      : "Ask about universities..."
                }
                className="flex-1 rounded-2xl border border-slate-700 bg-[#0f172a] px-6 py-4 outline-none"
              />

              <button
                onClick={handleSendMessage}
                className="rounded-2xl bg-blue-600 px-8 py-4 font-semibold hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Chat;
