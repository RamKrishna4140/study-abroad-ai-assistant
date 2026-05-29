import { useEffect, useState } from "react";
import axios from "axios";

function Admin() {
  const API_BASE = "http://127.0.0.1:8000";
  const [documents, setDocuments] = useState([]);

  const fetchDocuments = async () => {
    const res = await axios.get(`${API_BASE}/knowledge-documents`);
    setDocuments(res.data.documents || []);
  };

  const deleteDocument = async (documentId) => {
    await axios.delete(`${API_BASE}/knowledge-documents/${documentId}`);
    fetchDocuments();
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white">
      <h1 className="mb-6 text-4xl font-bold">Admin Knowledge Library</h1>

      <div className="space-y-4">
        {documents.map((doc) => (
          <div
            key={doc.document_id}
            className="rounded-xl border border-slate-700 bg-slate-900 p-5"
          >
            <h2 className="text-xl font-semibold">{doc.source}</h2>

            <p className="mt-2 text-sm text-slate-400">
              Chunks: {doc.chunks}
            </p>

            <p className="text-sm text-slate-400">
              Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
            </p>

            <button
              onClick={() => deleteDocument(doc.document_id)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-medium hover:bg-red-700"
            >
              Delete Document
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;