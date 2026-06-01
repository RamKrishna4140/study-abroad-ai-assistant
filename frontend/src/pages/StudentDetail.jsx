import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function StudentDetail() {
  const API_BASE = "http://127.0.0.1:8000";
  const { studentId } = useParams();

  const [student, setStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStudent = async () => {
    const res = await axios.get(`${API_BASE}/students/${studentId}`);
    setStudent(res.data.student);
  };
  const fetchTimeline = async () => {
    const res = await axios.get(`${API_BASE}/student-timeline/${studentId}`);

    setTimeline(res.data.events || []);
  };

  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState("Passport");
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [applications, setApplications] = useState([]);

  const [newApplication, setNewApplication] = useState({
    university: "",
    course: "",
    country: "Italy",
    status: "Applied",
    notes: "",
  });

  const fetchDocuments = async () => {
    const res = await axios.get(`${API_BASE}/student-documents/${studentId}`);
    setDocuments(res.data.documents || []);
  };

  const fetchApplications = async () => {
    const res = await axios.get(
      `${API_BASE}/student-applications/${studentId}`,
    );

    setApplications(res.data.applications || []);
  };

  const addApplication = async () => {
    if (!newApplication.university.trim()) return;

    await axios.post(`${API_BASE}/student-applications`, {
      student_id: studentId,
      ...newApplication,
    });

    setNewApplication({
      university: "",
      course: "",
      country: "Italy",
      status: "Applied",
      notes: "",
    });

    fetchApplications();
    fetchTimeline();
  };

  const [tasks, setTasks] = useState([]);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    status: "Pending",
    priority: "Medium",
  });

  const updateApplicationStatus = async (application, newStatus) => {
    await axios.put(`${API_BASE}/student-applications/${application._id}`, {
      student_id: studentId,
      university: application.university,
      course: application.course,
      country: application.country,
      status: newStatus,
      notes: application.notes || "",
    });

    fetchApplications();
    fetchTimeline();
  };

  const uploadDocument = async () => {
    if (!selectedDocument) return;

    const formData = new FormData();
    formData.append("file", selectedDocument);
    formData.append("document_type", documentType);

    await axios.post(`${API_BASE}/student-documents/${studentId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    setSelectedDocument(null);
    fetchDocuments();
  };

  const addTimelineEvent = async () => {
    if (!newEvent.title.trim()) return;

    await axios.post(`${API_BASE}/student-timeline`, {
      student_id: studentId,
      title: newEvent.title,
      description: newEvent.description,
    });

    setNewEvent({
      title: "",
      description: "",
    });

    fetchTimeline();
  };

  const fetchTasks = async () => {
    const res = await axios.get(`${API_BASE}/student-tasks/${studentId}`);
    setTasks(res.data.tasks || []);
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;

    await axios.post(`${API_BASE}/student-tasks`, {
      student_id: studentId,
      ...newTask,
    });

    setNewTask({
      title: "",
      description: "",
      due_date: "",
      status: "Pending",
      priority: "Medium",
    });

    fetchTasks();
    fetchTimeline();
  };

  const updateTaskStatus = async (task, newStatus) => {
    await axios.put(`${API_BASE}/student-tasks/${task._id}`, {
      student_id: studentId,
      title: task.title,
      description: task.description || "",
      due_date: task.due_date || "",
      status: newStatus,
      priority: task.priority || "Medium",
    });

    fetchTasks();
    fetchTimeline();
  };

  const deleteTask = async (taskId) => {
    await axios.delete(`${API_BASE}/student-tasks/${taskId}`);
    fetchTasks();
  };

  const [timeline, setTimeline] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
  });

  const updateStudent = async () => {
    setIsSaving(true);

    await axios.put(`${API_BASE}/students/${studentId}`, {
      name: student.name || "",
      phone: student.phone || "",
      email: student.email || "",
      country: student.country || "India",
      course: student.course || "",
      university: student.university || "",
      status: student.status || "New Lead",
      notes: student.notes || "",
    });

    setIsSaving(false);
    fetchStudent();
  };

  useEffect(() => {
    fetchStudent();
    fetchTimeline();
    fetchDocuments();
    fetchApplications();
    fetchTasks();
  }, []);

  if (!student) {
    return (
      <div className="min-h-screen bg-[#020617] p-8 text-white">Loading...</div>
    );
  }

  const requiredDocuments = [
    "Passport",
    "Transcript",
    "Degree",
    "IELTS",
    "Bank Balance",
    "Offer Letter",
    "Visa File",
  ];

  const isDocumentUploaded = (type) => {
    return documents.some((doc) => doc.document_type === type);
  };

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Student Profile</h1>
          <p className="mt-2 text-slate-400">
            Edit student details and update application status.
          </p>
        </div>

        <button
          onClick={updateStudent}
          disabled={isSaving}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Name</label>
            <input
              value={student.name || ""}
              onChange={(e) => setStudent({ ...student, name: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Phone</label>
            <input
              value={student.phone || ""}
              onChange={(e) =>
                setStudent({ ...student, phone: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Email</label>
            <input
              value={student.email || ""}
              onChange={(e) =>
                setStudent({ ...student, email: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Country</label>
            <input
              value={student.country || ""}
              onChange={(e) =>
                setStudent({ ...student, country: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Course</label>
            <input
              value={student.course || ""}
              onChange={(e) =>
                setStudent({ ...student, course: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              University
            </label>
            <input
              value={student.university || ""}
              onChange={(e) =>
                setStudent({ ...student, university: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Status</label>
            <select
              value={student.status || "New Lead"}
              onChange={(e) =>
                setStudent({ ...student, status: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            >
              <option>New Lead</option>
              <option>Pending</option>
              <option>Offer Letter Received</option>
              <option>Pre-Enrolment Done</option>
              <option>Visa Applied</option>
              <option>Visa Approved</option>
              <option>Rejected</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Notes</label>
            <textarea
              value={student.notes || ""}
              onChange={(e) =>
                setStudent({ ...student, notes: e.target.value })
              }
              rows="4"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />
          </div>

          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Student Timeline</h2>

            <div className="mb-6 space-y-3">
              <input
                placeholder="Event Title"
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    title: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              />

              <textarea
                placeholder="Description"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    description: e.target.value,
                  })
                }
                rows="3"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              />

              <button
                onClick={addTimelineEvent}
                className="rounded-lg bg-green-600 px-5 py-3 font-semibold hover:bg-green-700"
              >
                Add Timeline Event
              </button>
            </div>

            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                >
                  <h3 className="font-semibold text-lg">{event.title}</h3>

                  <p className="mt-1 text-slate-300">{event.description}</p>

                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              ))}

              <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-semibold">
                  Student Documents
                </h2>

                <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
                  <h2 className="mb-4 text-2xl font-semibold">
                    University Applications
                  </h2>
                  <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
                    <h2 className="mb-4 text-2xl font-semibold">
                      Student Tasks
                    </h2>

                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <input
                        placeholder="Task Title"
                        value={newTask.title}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            title: e.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                      />

                      <input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            due_date: e.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                      />

                      <select
                        value={newTask.priority}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            priority: e.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>

                      <select
                        value={newTask.status}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            status: e.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                      >
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>

                      <textarea
                        placeholder="Description"
                        value={newTask.description}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            description: e.target.value,
                          })
                        }
                        rows="3"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 md:col-span-2"
                      />
                    </div>

                    <button
                      onClick={addTask}
                      className="mb-6 rounded-lg bg-yellow-600 px-6 py-3 font-semibold hover:bg-yellow-700"
                    >
                      Add Task
                    </button>

                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div
                          key={task._id}
                          className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold">
                                {task.title}
                              </h3>

                              <p className="mt-1 text-sm text-slate-400">
                                {task.description}
                              </p>

                              <p className="mt-2 text-sm">
                                Due:{" "}
                                <span className="text-slate-300">
                                  {task.due_date || "No due date"}
                                </span>
                              </p>

                              <p className="mt-1 text-sm">
                                Priority:{" "}
                                <span
                                  className={
                                    task.priority === "High"
                                      ? "text-red-400"
                                      : task.priority === "Medium"
                                        ? "text-yellow-400"
                                        : "text-green-400"
                                  }
                                >
                                  {task.priority}
                                </span>
                              </p>
                            </div>

                            <div className="flex gap-3">
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  updateTaskStatus(task, e.target.value)
                                }
                                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none"
                              >
                                <option>Pending</option>
                                <option>In Progress</option>
                                <option>Completed</option>
                              </select>

                              <button
                                onClick={() => deleteTask(task._id)}
                                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input
                      placeholder="University"
                      value={newApplication.university}
                      onChange={(e) =>
                        setNewApplication({
                          ...newApplication,
                          university: e.target.value,
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                    />

                    <input
                      placeholder="Course"
                      value={newApplication.course}
                      onChange={(e) =>
                        setNewApplication({
                          ...newApplication,
                          course: e.target.value,
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                    />

                    <input
                      placeholder="Country"
                      value={newApplication.country}
                      onChange={(e) =>
                        setNewApplication({
                          ...newApplication,
                          country: e.target.value,
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                    />

                    <select
                      value={newApplication.status}
                      onChange={(e) =>
                        setNewApplication({
                          ...newApplication,
                          status: e.target.value,
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                    >
                      <option>Applied</option>
                      <option>Under Evaluation</option>
                      <option>Interview Scheduled</option>
                      <option>Offer Letter Received</option>
                      <option>Pre-Enrolment Submitted</option>
                      <option>Visa Applied</option>
                      <option>Visa Approved</option>
                      <option>Rejected</option>
                    </select>

                    <textarea
                      placeholder="Notes"
                      value={newApplication.notes}
                      onChange={(e) =>
                        setNewApplication({
                          ...newApplication,
                          notes: e.target.value,
                        })
                      }
                      rows="3"
                      className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 md:col-span-2"
                    />
                  </div>

                  <button
                    onClick={addApplication}
                    className="mb-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-700"
                  >
                    Add Application
                  </button>

                  <div className="space-y-4">
                    {applications.map((app, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                      >
                        <h3 className="text-lg font-semibold">
                          {app.university}
                        </h3>

                        <p className="mt-1 text-slate-300">{app.course}</p>

                        <select
                          value={app.status}
                          onChange={(e) =>
                            updateApplicationStatus(app, e.target.value)
                          }
                          className="mt-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-blue-400 outline-none"
                        >
                          <option>Applied</option>
                          <option>Under Evaluation</option>
                          <option>Interview Scheduled</option>
                          <option>Offer Letter Received</option>
                          <option>Pre-Enrolment Submitted</option>
                          <option>Visa Applied</option>
                          <option>Visa Approved</option>
                          <option>Rejected</option>
                        </select>

                        <p className="mt-2 text-sm text-slate-500">
                          {app.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {requiredDocuments.map((docType) => (
                    <div
                      key={docType}
                      className={`rounded-lg border p-4 ${
                        isDocumentUploaded(docType)
                          ? "border-green-700 bg-green-950/40"
                          : "border-red-700 bg-red-950/40"
                      }`}
                    >
                      <p className="font-semibold">{docType}</p>
                      <p className="mt-1 text-sm">
                        {isDocumentUploaded(docType)
                          ? "✅ Uploaded"
                          : "❌ Missing"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option>Passport</option>
                    <option>Transcript</option>
                    <option>Degree</option>
                    <option>IELTS</option>
                    <option>Bank Balance</option>
                    <option>Offer Letter</option>
                    <option>Visa File</option>
                    <option>Other</option>
                  </select>

                  <input
                    type="file"
                    onChange={(e) => setSelectedDocument(e.target.files[0])}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                  />

                  <button
                    onClick={uploadDocument}
                    className="rounded-lg bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-700"
                  >
                    Upload Document
                  </button>
                </div>

                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                    >
                      <h3 className="font-semibold">{doc.document_type}</h3>
                      <p className="text-sm text-slate-400">{doc.filename}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(doc.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDetail;
