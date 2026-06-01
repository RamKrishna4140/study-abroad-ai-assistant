import { useEffect, useState } from "react";
import axios from "axios";

function Tasks() {
  const API_BASE = "http://127.0.0.1:8000";

  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  const fetchTasks = async () => {
    const res = await axios.get(`${API_BASE}/all-tasks`);
    setTasks(res.data.tasks || []);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      task.student_name?.toLowerCase().includes(searchText) ||
      task.title?.toLowerCase().includes(searchText) ||
      task.description?.toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All" || task.status === statusFilter;

    const matchesPriority =
      priorityFilter === "All" || task.priority === priorityFilter;

    const today = new Date().toISOString().split("T")[0];

    const matchesDate =
      dateFilter === "All" ||
      (dateFilter === "Due Today" && task.due_date === today) ||
      (dateFilter === "Overdue" &&
        task.due_date &&
        task.due_date < today &&
        task.status !== "Completed");

    return matchesSearch && matchesStatus && matchesPriority && matchesDate;
  });

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white">
      <h1 className="mb-8 text-4xl font-bold">Tasks</h1>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <input
          placeholder="Search by student, task, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        >
          <option>All</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        >
          <option>All</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
      </div>

      <select
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
      >
        <option>All</option>
        <option>Due Today</option>
        <option>Overdue</option>
      </select>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Task</th>
              <th className="p-4 text-left">Due Date</th>
              <th className="p-4 text-left">Priority</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Description</th>
            </tr>
          </thead>

          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task._id} className="border-t border-slate-700">
                <td className="p-4">
                  <a
                    href={`/student/${task.student_id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {task.student_name}
                  </a>
                </td>

                <td className="p-4">{task.title}</td>
                <td className="p-4">{task.due_date || "No due date"}</td>

                <td className="p-4">
                  <span
                    className={`rounded-lg px-3 py-1 text-sm ${
                      task.priority === "High"
                        ? "bg-red-600"
                        : task.priority === "Medium"
                          ? "bg-yellow-600"
                          : "bg-green-600"
                    }`}
                  >
                    {task.priority}
                  </span>
                </td>

                <td className="p-4">
                  <span className="rounded-lg bg-blue-600 px-3 py-1 text-sm">
                    {task.status}
                  </span>
                </td>

                <td className="p-4">{task.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Tasks;
