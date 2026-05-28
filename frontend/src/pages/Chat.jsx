import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! Ask me about universities, eligibility, admissions, or upload a PDF and ask from it.",
    },
  ]);

  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(`session-${Date.now()}`);
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfMode, setPdfMode] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");

  const messagesEndRef = useRef(null);

  const API_BASE = "http://127.0.0.1:8000";

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/sessions`);
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadChat = async (id) => {
    try {
      const response = await axios.get(
        `${API_BASE}/chat-history/${id}`
      );

      const loadedMessages = [];

      response.data.messages.forEach((msg) => {
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

      const pdfMessage = response.data.messages.find((m) =>
        m.assistant_reply?.includes("PDF uploaded successfully")
      );

      if (pdfMessage) {
        setPdfMode(true);

        const match =
          pdfMessage.assistant_reply.match(
            /PDF uploaded successfully:\s(.+)/
          );

        if (match) {
          setPdfFileName(match[1]);
        }
      } else {
        setPdfMode(false);
        setPdfFileName("");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const createNewChat = () => {
    const newSession = `session-${Date.now()}`;

    setSessionId(newSession);

    setMessages([
      {
        role: "assistant",
        content:
          "Hello! Ask me about universities, eligibility, admissions, or upload a PDF and ask from it.",
      },
    ]);

    setPdfMode(false);
    setPdfFileName("");
  };

  const deleteSession = async (id) => {
    try {
      await axios.delete(`${API_BASE}/sessions/${id}`);

      fetchSessions();

      if (id === sessionId) {
        createNewChat();
      }
    } catch (error) {
      console.error(error);
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

      const response = await axios.post(
        `${API_BASE}/upload-pdf`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setPdfMode(true);
      setPdfFileName(selectedFile.name);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `PDF uploaded successfully: ${selectedFile.name}\n\nPDF Mode is ready. Ask questions from this document.`,
        },
      ]);

      fetchSessions();
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "PDF upload failed.",
        },
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentInput = input;

    setInput("");

    try {
      const endpoint = pdfMode ? "/ask-pdf" : "/chat";

      const response = await axios.post(
        `${API_BASE}${endpoint}`,
        {
          message: currentInput,
          session_id: sessionId,
        }
      );

      const data = response.data;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ||
            data.error ||
            "No response received.",
          sources: data.sources_used || [],
        },
      ]);

      fetchSessions();
    } catch (error) {
      console.error(error);

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
      {/* SIDEBAR */}
      <div className="w-[290px] border-r border-slate-800 bg-[#08112b] p-4">
        <h1 className="mb-6 text-3xl font-bold">
          Chat Sessions
        </h1>

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
              className={`flex items-center justify-between rounded-xl px-4 py-4 text-sm cursor-pointer ${
                session.session_id === sessionId
                  ? "bg-slate-700"
                  : "bg-transparent hover:bg-slate-800"
              }`}
            >
              <div
                className="truncate"
                onClick={() =>
                  loadChat(session.session_id)
                }
              >
                {session.last_message || "Untitled Chat"}
              </div>

              <button
                onClick={() =>
                  deleteSession(session.session_id)
                }
                className="ml-3 text-red-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 flex-col">
        {/* HEADER */}
        <div className="border-b border-slate-800 px-8 py-5">
          <h1 className="text-5xl font-bold">
            AI Study Abroad Assistant
          </h1>

          <p className="mt-2 text-lg text-slate-400">
            {pdfMode
              ? `PDF Mode Active — ${pdfFileName}`
              : "Normal Chat Mode"}
          </p>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto scroll-smooth px-8 py-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-5 py-4 text-sm leading-7 ${
                    msg.role === "user"
                      ? "bg-blue-600"
                      : "bg-slate-800"
                  }`}
                >
                  <ReactMarkdown>
                    {msg.content || ""}
                  </ReactMarkdown>

                  {Array.isArray(msg.sources) &&
                    msg.sources.length > 0 && (
                      <div className="mt-4 border-t border-slate-700 pt-3">
                        <p className="mb-2 text-xs font-semibold text-slate-400">
                          Sources used:
                        </p>

                        <div className="space-y-1">
                          {msg.sources.map(
                            (source, sourceIndex) => (
                              <div
                                key={sourceIndex}
                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300"
                              >
                                {source?.source ||
                                  "Uploaded PDF"}{" "}
                                — relevance{" "}
                                {typeof source?.score ===
                                "number"
                                  ? `${(
                                      source.score * 100
                                    ).toFixed(1)}%`
                                  : "N/A"}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT AREA */}
        <div className="border-t border-slate-800 px-8 py-6">
          <div className="mx-auto max-w-4xl">
            {/* PDF UPLOAD */}
            <div className="mb-4 flex gap-4">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) =>
                  setSelectedFile(e.target.files[0])
                }
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
              />

              <button
                onClick={uploadPDF}
                className="rounded-xl bg-green-600 px-6 py-3 font-semibold hover:bg-green-700"
              >
                Upload PDF
              </button>

              <button
                onClick={() =>
                  setPdfMode(!pdfMode)
                }
                className={`rounded-xl px-6 py-3 font-semibold ${
                  pdfMode
                    ? "bg-green-600"
                    : "bg-slate-700"
                }`}
              >
                {pdfMode
                  ? "PDF Mode On"
                  : "PDF Mode Off"}
              </button>
            </div>

            {/* CHAT INPUT */}
            <div className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder={
                  pdfMode
                    ? "Ask a question from uploaded PDF..."
                    : "Ask about universities..."
                }
                className="flex-1 rounded-2xl border border-slate-700 bg-[#0f172a] px-6 py-4 text-white outline-none"
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
      </div>
    </div>
  );
}

export default Chat;