import { useEffect, useState } from "react";
import axios from "axios";
import CRMNavbar from "../components/CRMNavbar";

function Applications() {
  const API_BASE = "http://127.0.0.1:8000";

  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchApplications = async () => {
    const res = await axios.get(`${API_BASE}/all-applications`);
    setApplications(res.data.applications || []);
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApplications = applications.filter((app) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      app.student_name?.toLowerCase().includes(searchText) ||
      app.university?.toLowerCase().includes(searchText) ||
      app.course?.toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All" || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white">
      <CRMNavbar />
      <h1 className="mb-8 text-4xl font-bold">Applications</h1>

      <div className="mb-5 flex gap-4">
        <input
          placeholder="Search by student, university, course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        >
          <option>All</option>
          <option>Applied</option>
          <option>Under Evaluation</option>
          <option>Interview Scheduled</option>
          <option>Offer Letter Received</option>
          <option>Pre-Enrolment Submitted</option>
          <option>Visa Applied</option>
          <option>Visa Approved</option>
          <option>Rejected</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">University</th>
              <th className="p-4 text-left">Course</th>
              <th className="p-4 text-left">Country</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Notes</th>
            </tr>
          </thead>

          <tbody>
            {filteredApplications.map((app, index) => (
              <tr key={index} className="border-t border-slate-700">
                <td className="p-4">{app.student_name}</td>
                <td className="p-4">{app.university}</td>
                <td className="p-4">{app.course}</td>
                <td className="p-4">{app.country}</td>
                <td className="p-4">
                  <span className="rounded-lg bg-blue-600 px-3 py-1 text-sm">
                    {app.status}
                  </span>
                </td>
                <td className="p-4">{app.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Applications;