
import { useState } from "react";
import {
  Plus, CalendarDays, CheckCircle2, Clock3,
  AlertCircle, FileCheck2, X, IndianRupee,
  ArrowRight, ShieldCheck
} from "lucide-react";

const initialMilestones = [
  {
    id: "MS-001",
    project: "E-Commerce Website",
    title: "Frontend Development",
    amount: 15000,
    deadline: "2026-11-15",
    status: "In Progress",
    criteria: "Responsive homepage, product listing and navigation.",
    evidence: "",
  },
  {
    id: "MS-002",
    project: "E-Commerce Website",
    title: "Backend Integration",
    amount: 18000,
    deadline: "2026-11-18",
    status: "Submitted",
    criteria: "Working API integration and database connectivity.",
    evidence: "API integration demonstration",
  },
  {
    id: "MS-003",
    project: "Mobile Banking UI",
    title: "UI Design",
    amount: 12000,
    deadline: "2026-11-20",
    status: "Approved",
    criteria: "Complete mobile banking screen designs.",
    evidence: "Design prototype",
  },
  {
    id: "MS-004",
    project: "Brand Identity Design",
    title: "Logo Concepts",
    amount: 8000,
    deadline: "2026-11-25",
    status: "In Progress",
    criteria: "Three unique logo concepts and brand colors.",
    evidence: "",
  },
];

const statusClass = (status) =>
  status.toLowerCase().replaceAll(" ", "-");

function Milestones() {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    project: "E-Commerce Website",
    title: "",
    amount: "",
    deadline: "",
    criteria: "",
  });

  const notify = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const updateStatus = (id, status) => {
    setMilestones((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );

    if (selected?.id === id) {
      setSelected((previous) => ({ ...previous, status }));
    }

    notify(`Milestone updated to ${status}. Demo only.`);
  };

  const createMilestone = (e) => {
    e.preventDefault();

    const item = {
      id: `MS-${String(milestones.length + 1).padStart(3, "0")}`,
      ...form,
      amount: Number(form.amount),
      status: "In Progress",
      evidence: "",
    };

    setMilestones((previous) => [item, ...previous]);
    setShowForm(false);

    setForm({
      project: "E-Commerce Website",
      title: "",
      amount: "",
      deadline: "",
      criteria: "",
    });

    notify("Milestone created successfully in this demo.");
  };

  const filtered = milestones.filter(
    (item) => filter === "All" || item.status === filter
  );

  const total = milestones.reduce((sum, item) => sum + item.amount, 0);

  const stats = [
    { label: "Total Milestones", value: milestones.length, icon: FileCheck2 },
    { label: "In Progress", value: milestones.filter(m => m.status === "In Progress").length, icon: Clock3 },
    { label: "Submitted", value: milestones.filter(m => m.status === "Submitted").length, icon: AlertCircle },
    { label: "Approved", value: milestones.filter(m => m.status === "Approved").length, icon: CheckCircle2 },
  ];

  const currency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="milestones-page">

      <div className="milestone-heading">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={14} /> PAYMENT WORKFLOW
          </div>
          <h1>Milestone Management</h1>
          <p>Track deliverables, review submissions and manage approvals.</p>
        </div>

        <button className="primary-button" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Create Milestone
        </button>
      </div>

      {notice && <div className="project-message">{notice}</div>}

      <div className="project-summary">
        {stats.map(({ label, value, icon: Icon }) => (
          <div className="project-summary-card" key={label}>
            <span><Icon size={15} /> {label}</span>
            <h2>{value}</h2>
          </div>
        ))}
      </div>

      <div className="milestone-total panel">
        <div>
          <span>Total milestone value</span>
          <h2>{currency(total)}</h2>
          <small>Across all demonstration milestones</small>
        </div>
        <div className="milestone-total-icon">
          <IndianRupee size={26} />
        </div>
      </div>

      <div className="milestone-toolbar">
        <div>
          <h3>Project Milestones</h3>
          <p>Manage each project's deliverables and approvals.</p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="project-filter"
        >
          <option>All</option>
          <option>In Progress</option>
          <option>Submitted</option>
          <option>Approved</option>
        </select>
      </div>

      <div className="milestone-list">
        {filtered.map((item) => (
          <article className="milestone-card" key={item.id}>
            <div className="milestone-card-top">
              <div>
                <small className="project-id">{item.id}</small>
                <h3>{item.title}</h3>
                <span className="milestone-project">{item.project}</span>
              </div>
              <span className={`project-status ${statusClass(item.status)}`}>
                {item.status}
              </span>
            </div>

            <p className="milestone-criteria">{item.criteria}</p>

            <div className="milestone-info">
              <div>
                <IndianRupee size={15} />
                <span>Milestone amount</span>
                <strong>{currency(item.amount)}</strong>
              </div>
              <div>
                <CalendarDays size={15} />
                <span>Deadline</span>
                <strong>{item.deadline}</strong>
              </div>
            </div>

            {item.evidence && (
              <div className="evidence-label">
                <FileCheck2 size={15} />
                Evidence: {item.evidence}
              </div>
            )}

            <div className="milestone-actions">
              <button
                className="milestone-details-button"
                onClick={() => setSelected(item)}
              >
                View Details <ArrowRight size={15} />
              </button>

              {item.status === "In Progress" && (
                <button
                  className="milestone-action-button"
                  onClick={() => updateStatus(item.id, "Submitted")}
                >
                  Submit Work
                </button>
              )}

              {item.status === "Submitted" && (
                <>
                  <button
                    className="milestone-action-button"
                    onClick={() => updateStatus(item.id, "Approved")}
                  >
                    Demo Approve
                  </button>
                  <button
                    className="milestone-reject-button"
                    onClick={() => updateStatus(item.id, "In Progress")}
                  >
                    Request Changes
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="project-empty">
          <FileCheck2 size={32} />
          <h3>No milestones found</h3>
          <p>Try another status filter or create a milestone.</p>
        </div>
      )}

      {showForm && (
        <div className="project-modal-overlay">
          <div className="project-modal">
            <div className="modal-heading">
              <div>
                <h2>Create Milestone</h2>
                <p>Define the work and payment requirements.</p>
              </div>
              <button onClick={() => setShowForm(false)}><X /></button>
            </div>

            <form onSubmit={createMilestone}>
              <label>Project</label>
              <select
                value={form.project}
                onChange={(e) => setForm({...form, project: e.target.value})}
                className="milestone-form-select"
              >
                <option>E-Commerce Website</option>
                <option>Mobile Banking UI</option>
                <option>Backend API Development</option>
                <option>Brand Identity Design</option>
              </select>

              <label>Milestone Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({...form, title: e.target.value})}
                placeholder="e.g. Frontend Development"
              />

              <label>Milestone Amount (INR)</label>
              <input
                required
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm({...form, amount: e.target.value})}
                placeholder="15000"
              />

              <label>Deadline</label>
              <input
                required
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({...form, deadline: e.target.value})}
              />

              <label>Acceptance Criteria</label>
              <textarea
                required
                rows="3"
                value={form.criteria}
                onChange={(e) => setForm({...form, criteria: e.target.value})}
                placeholder="Describe what must be delivered..."
              />

              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Create Milestone <Plus size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="project-modal-overlay" onClick={() => setSelected(null)}>
          <div className="project-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <small className="project-id">{selected.id}</small>
                <h2>{selected.title}</h2>
                <p>{selected.project}</p>
              </div>
              <button onClick={() => setSelected(null)}><X /></button>
            </div>

            <div className="detail-row">
              <span>Amount</span>
              <strong>{currency(selected.amount)}</strong>
            </div>
            <div className="detail-row">
              <span>Deadline</span>
              <strong>{selected.deadline}</strong>
            </div>
            <div className="detail-row">
              <span>Status</span>
              <strong>{selected.status}</strong>
            </div>
            <div className="detail-row">
              <span>Acceptance Criteria</span>
              <strong>{selected.criteria}</strong>
            </div>
            <div className="detail-row">
              <span>Evidence</span>
              <strong>{selected.evidence || "Not submitted"}</strong>
            </div>

            <p className="demo-note">
              Demonstration workflow only. No real payment has been authorized,
              approved or captured.
            </p>

            <button className="primary-button detail-close" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <p className="demo-note">
        Milestone records are stored in temporary React state. PostgreSQL persistence
        and actual PayPal payment operations will be implemented later.
      </p>
    </div>
  );
}

export default Milestones;
