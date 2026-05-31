import { useEffect, useState } from "react";
import axios from "axios";

function Students() {
  const API_BASE = "http://127.0.0.1:8000";

  const [students, setStudents] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    country: "India",
    course: "",
    university: "",
    status: "New Lead",
    notes: "",
  });

  const fetchStudents = async () => {
    const res = await axios.get(`${API_BASE}/students`);
    setStudents(res.data.students || []);
  };

  const addStudent = async () => {
    if (!form.name.trim()) return;

    await axios.post(`${API_BASE}/students`, form);

    setForm({
      name: "",
      phone: "",
      email: "",
      country: "India",
      course: "",
      university: "",
      status: "New Lead",
      notes: "",
    });

    fetchStudents();
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      student.name?.toLowerCase().includes(searchText) ||
      student.phone?.toLowerCase().includes(searchText) ||
      student.email?.toLowerCase().includes(searchText) ||
      student.course?.toLowerCase().includes(searchText) ||
      student.university?.toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white">
      <h1 className="mb-8 text-4xl font-bold">Student CRM</h1>

      <div className="mb-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Add Student</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
          />

          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value,
              })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
          />

          <input
            placeholder="Country"
            value={form.country}
            onChange={(e) =>
              setForm({
                ...form,
                country: e.target.value,
              })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
          />

          <input
            placeholder="Course"
            value={form.course}
            onChange={(e) =>
              setForm({
                ...form,
                course: e.target.value,
              })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
          />

          <input
            placeholder="University"
            value={form.university}
            onChange={(e) =>
              setForm({
                ...form,
                university: e.target.value,
              })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
          />

          <select
            value={form.status}
            onChange={(e) =>
              setForm({
                ...form,
                status: e.target.value,
              })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
          >
            <option>New Lead</option>
            <option>Pending</option>
            <option>Offer Letter Received</option>
            <option>Visa Approved</option>
            <option>Rejected</option>
          </select>

          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none md:col-span-2"
          />
        </div>

        <button
          onClick={addStudent}
          className="mt-5 rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
        >
          Add Student
        </button>
      </div>

      <div className="mb-5 flex gap-4">
        <input
          placeholder="Search by name, phone, email, course, university..."
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
          <option>New Lead</option>
          <option>Pending</option>
          <option>Offer Letter Received</option>
          <option>Visa Approved</option>
          <option>Rejected</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Phone</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Course</th>
              <th className="p-4 text-left">University</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Notes</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.map((student, index) => (
              <tr key={index} className="border-t border-slate-700">
                <td className="p-4">
                  <a
                    href={`/student/${student._id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {student.name}
                  </a>
                </td>
                <td className="p-4">{student.phone}</td>
                <td className="p-4">{student.email}</td>
                <td className="p-4">{student.course}</td>
                <td className="p-4">{student.university}</td>
                <td className="p-4">
                  <span className="rounded-lg bg-blue-600 px-3 py-1 text-sm">
                    {student.status}
                  </span>
                </td>
                <td className="p-4">{student.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Students;
