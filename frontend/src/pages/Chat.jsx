import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! Ask me about universities, eligibility, or admissions.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState("default-session");

  const messagesEndRef = useRef(null);

  const fetchSessions = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/sessions");
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.log(error);
    }
  };

  const loadChatHistory = async (sessionId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/chat-history/${sessionId}`,
      );

      const data = await response.json();

      const formattedMessages = [];

      data.messages.forEach((msg) => {
        formattedMessages.push({
          role: "user",
          content: msg.user_message,
        });

        formattedMessages.push({
          role: "assistant",
          content: msg.assistant_reply,
        });
      });

      setMessages(formattedMessages);
      setCurrentSession(sessionId);
    } catch (error) {
      console.log(error);
    }
  };

  const handleNewChat = () => {
    const newSessionId = `session-${Date.now()}`;

    setCurrentSession(newSessionId);

    setMessages([
      {
        role: "assistant",
        content:
          "Hello! Ask me about universities, eligibility, or admissions.",
      },
    ]);

    setInput("");
  };

  const deleteSession = async (sessionId) => {
    try {
      await fetch(`http://127.0.0.1:8000/sessions/${sessionId}`, {
        method: "DELETE",
      });

      await fetchSessions();

      if (currentSession === sessionId) {
        handleNewChat();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: currentInput,
      },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          session_id: currentSession,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);

      fetchSessions();
    } catch (error) {
      console.log(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please check if backend is running.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  return (
    <div className="flex h-screen bg-[#020617] text-white">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-800 bg-[#0f172a] p-4">
        <h2 className="mb-6 text-xl font-bold">Chat Sessions</h2>

        <button
          onClick={handleNewChat}
          className="mb-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium hover:bg-blue-700"
        >
          + New Chat
        </button>

        <div className="space-y-2 overflow-y-auto">
          {sessions.map((session, index) => (
            <div
              key={session.session_id || index}
              className={`flex items-center justify-between rounded-lg px-3 py-3 text-sm hover:bg-slate-800 ${
                currentSession === session.session_id
                  ? "bg-slate-800 text-white"
                  : "text-slate-300"
              }`}
            >
              <button
                onClick={() => loadChatHistory(session.session_id)}
                className="flex-1 text-left"
              >
                {session.last_message
                  ? session.last_message.slice(0, 28)
                  : session.session_id
                    ? session.session_id.slice(0, 20)
                    : "Untitled Chat"}
                ...
              </button>

              <button
                onClick={() => deleteSession(session.session_id)}
                className="ml-2 text-red-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex flex-1 flex-col">
        <div className="border-b border-slate-800 px-8 py-5">
          <h1 className="text-3xl font-bold">AI Study Abroad Assistant</h1>
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
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-800 px-5 py-4 text-sm">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-slate-800 p-6">
          <div className="mx-auto flex max-w-4xl gap-4">
            <input
              type="text"
              placeholder="Ask about universities..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />

            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="rounded-xl bg-blue-600 px-6 py-3 font-medium hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Chat;
