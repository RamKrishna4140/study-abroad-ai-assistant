import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const API_BASE = "http://127.0.0.1:8000";

  const [stats, setStats] = useState({
    total_students: 0,
    offer_letters: 0,
    visa_approved: 0,
    pending: 0,
  });

  const fetchStats = async () => {
    const res = await axios.get(`${API_BASE}/dashboard-stats`);
    setStats(res.data);
  };

  const fetchApplicationStats = async () => {
    const res = await axios.get(`${API_BASE}/application-stats`);
    setApplicationStats(res.data);
  };

  const [applicationStats, setApplicationStats] = useState({
    total_applications: 0,
    applied: 0,
    under_evaluation: 0,
    offer_letters: 0,
    visa_approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchStats();
    fetchApplicationStats();
  }, []);

  const cards = [
    { title: "Total Students", value: stats.total_students },
    { title: "Offer Letters", value: stats.offer_letters },
    { title: "Visa Approved", value: stats.visa_approved },
    { title: "Pending", value: stats.pending },
  ];

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white">
      <h1 className="mb-8 text-4xl font-bold">FLCS Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-700 bg-slate-900 p-6"
          >
            <p className="text-slate-400">{card.title}</p>
            <h2 className="mt-3 text-4xl font-bold">{card.value}</h2>

            <h2 className="mb-4 mt-10 text-2xl font-bold">Application Stats</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  title: "Total Applications",
                  value: applicationStats.total_applications,
                },
                { title: "Applied", value: applicationStats.applied },
                {
                  title: "Under Evaluation",
                  value: applicationStats.under_evaluation,
                },
                {
                  title: "Offer Letters",
                  value: applicationStats.offer_letters,
                },
                {
                  title: "Visa Approved",
                  value: applicationStats.visa_approved,
                },
                { title: "Rejected", value: applicationStats.rejected },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-6"
                >
                  <p className="text-slate-400">{card.title}</p>
                  <h2 className="mt-3 text-4xl font-bold">{card.value}</h2>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
