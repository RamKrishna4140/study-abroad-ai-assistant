import { useEffect, useState } from "react";
import axios from "axios";
import CRMLayout from "../layouts/CRMLayout";

function MissingDocuments() {
  const API_BASE = "http://127.0.0.1:8000";

  const [students, setStudents] = useState([]);

  const fetchMissingDocuments = async () => {
    const res = await axios.get(`${API_BASE}/missing-documents`);
    setStudents(res.data || []);
  };

  useEffect(() => {
    fetchMissingDocuments();
  }, []);

  return (
    <CRMLayout>
      <h1 className="mb-8 text-4xl font-bold">Missing Documents</h1>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Missing Documents</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr
                key={student.student_id}
                className="border-t border-slate-700"
              >
                <td className="p-4">
                  <a
                    href={`/student/${student.student_id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {student.name}
                  </a>
                </td>

                <td className="p-4">{student.email}</td>

                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {student.missing_documents.length > 0 ? (
                      student.missing_documents.map((doc) => (
                        <span
                          key={doc}
                          className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold"
                        >
                          {doc}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-lg bg-green-600 px-3 py-1 text-sm font-semibold">
                        Complete
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CRMLayout>
  );
}

export default MissingDocuments;