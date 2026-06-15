import { useEffect, useState } from "react";
import axios from "axios";
import CRMLayout from "../layouts/CRMLayout";

function Dashboard() {
  const API_BASE = "http://127.0.0.1:8000";

  const [stats, setStats] = useState({
    total_students: 0,
    offer_letters: 0,
    visa_approved: 0,
    pending: 0,
  });

  const [applicationStats, setApplicationStats] = useState({
    total_applications: 0,
    applied: 0,
    under_evaluation: 0,
    offer_letters: 0,
    visa_approved: 0,
    rejected: 0,
  });

  const [taskStats, setTaskStats] = useState({
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    high_priority_tasks: 0,
  });

  const fetchStats = async () => {
    const res = await axios.get(`${API_BASE}/dashboard-stats`);
    setStats(res.data);
  };

  const fetchApplicationStats = async () => {
    const res = await axios.get(`${API_BASE}/application-stats`);
    setApplicationStats(res.data);
  };

  const fetchDocumentStats = async () => {
    const res = await axios.get(`${API_BASE}/pending-document-stats`);
    setDocumentStats(res.data);
  };

  const [documentStats, setDocumentStats] = useState({
    total_students: 0,
    documents: {},
  });

  const fetchTaskStats = async () => {
    const res = await axios.get(`${API_BASE}/task-stats`);
    setTaskStats(res.data);
  };

  useEffect(() => {
    fetchStats();
    fetchApplicationStats();
    fetchTaskStats();
    fetchDocumentStats();
  }, []);

  const studentCards = [
    { title: "Total Students", value: stats.total_students },
    { title: "Offer Letters", value: stats.offer_letters },
    { title: "Visa Approved", value: stats.visa_approved },
    { title: "Pending", value: stats.pending },
  ];

  const applicationCards = [
    { title: "Total Applications", value: applicationStats.total_applications },
    { title: "Applied", value: applicationStats.applied },
    { title: "Under Evaluation", value: applicationStats.under_evaluation },
    { title: "Offer Letters", value: applicationStats.offer_letters },
    { title: "Visa Approved", value: applicationStats.visa_approved },
    { title: "Rejected", value: applicationStats.rejected },
  ];

  const taskCards = [
    { title: "Total Tasks", value: taskStats.total_tasks },
    { title: "Pending", value: taskStats.pending_tasks },
    { title: "In Progress", value: taskStats.in_progress_tasks },
    { title: "Completed", value: taskStats.completed_tasks },
    { title: "High Priority", value: taskStats.high_priority_tasks },
  ];

  return (
    <CRMLayout>
      <h1 className="mb-8 text-4xl font-bold">FLCS Dashboard</h1>

      <h2 className="mb-4 text-2xl font-bold">Student Stats</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {studentCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-700 bg-slate-900 p-6"
          >
            <p className="text-slate-400">{card.title}</p>
            <h2 className="mt-3 text-4xl font-bold">{card.value}</h2>
          </div>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-bold">Application Stats</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {applicationCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-700 bg-slate-900 p-6"
          >
            <p className="text-slate-400">{card.title}</p>
            <h2 className="mt-3 text-4xl font-bold">{card.value}</h2>
          </div>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-bold">Task Stats</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        {taskCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-700 bg-slate-900 p-6"
          >
            <p className="text-slate-400">{card.title}</p>
            <h2 className="mt-3 text-4xl font-bold">{card.value}</h2>
          </div>
        ))}
      </div>
      <h2 className="mb-4 mt-10 text-2xl font-bold">Pending Documents</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Object.entries(documentStats.documents).map(([docType, data]) => (
          <div
            key={docType}
            className="rounded-xl border border-slate-700 bg-slate-900 p-6"
          >
            <p className="text-slate-400">{docType}</p>

            <div className="mt-4 flex justify-between">
              <div>
                <p className="text-sm text-green-400">Uploaded</p>
                <h2 className="text-3xl font-bold">{data.uploaded}</h2>
              </div>

              <div>
                <p className="text-sm text-red-400">Missing</p>
                <h2 className="text-3xl font-bold">{data.missing}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CRMLayout>
  );
}

export default Dashboard;
