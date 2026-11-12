
import { useState } from "react";
import {
  Plus, Search, FolderKanban, CalendarDays,
  Users, ArrowUpRight, X, IndianRupee
} from "lucide-react";

const initialProjects = [
  {
    id: "EP-001",
    name: "E-Commerce Website",
    client: "Alex Morgan",
    freelancer: "DevStudio Pro",
    budget: 45000,
    progress: 75,
    status: "In Progress",
    deadline: "20 Nov 2026",
    milestones: 3,
  },
  {
    id: "EP-002",
    name: "Mobile Banking UI",
    client: "Sarah Wilson",
    freelancer: "Creative Labs",
    budget: 32000,
    progress: 40,
    status: "In Progress",
    deadline: "25 Nov 2026",
    milestones: 4,
  },
  {
    id: "EP-003",
    name: "Backend API Development",
    client: "David Lee",
    freelancer: "CodeCraft",
    budget: 25000,
    progress: 100,
    status: "Completed",
    deadline: "08 Nov 2026",
    milestones: 3,
  },
  {
    id: "EP-004",
    name: "Brand Identity Design",
    client: "Emma Davis",
    freelancer: "Pixel Studio",
    budget: 18000,
    progress: 20,
    status: "Pending",
    deadline: "30 Nov 2026",
    milestones: 2,
  },
];

function Projects() {
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    client: "",
    freelancer: "",
    budget: "",
    deadline: "",
  });

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.client.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || project.status === filter;

    return matchesSearch && matchesFilter;
  });

  const createProject = (e) => {
    e.preventDefault();

    const newProject = {
      id: `EP-${String(projects.length + 1).padStart(3, "0")}`,
      name: form.name.trim(),
      client: form.client.trim(),
      freelancer: form.freelancer.trim(),
      budget: Number(form.budget),
      deadline: form.deadline,
      progress: 0,
      status: "Pending",
      milestones: 0,
    };

    setProjects((previous) => [newProject, ...previous]);
    setShowForm(false);
    setForm({
      name: "",
      client: "",
      freelancer: "",
      budget: "",
      deadline: "",
    });

    setMessage("Project created successfully in this demo session.");
    setTimeout(() => setMessage(""), 3000);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="projects-page">

      <div className="projects-heading">
        <div>
          <div className="eyebrow">
            <FolderKanban size={14} /> PROJECT MANAGEMENT
          </div>
          <h1>Projects</h1>
          <p>Manage projects, clients, budgets and progress in one place.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowForm(true)}
        >
          <Plus size={18} /> Create Project
        </button>
      </div>

      {message && (
        <div className="project-message">{message}</div>
      )}

      <div className="project-summary">
        <div className="project-summary-card">
          <span>Total Projects</span>
          <h2>{projects.length}</h2>
        </div>
        <div className="project-summary-card">
          <span>In Progress</span>
          <h2>{projects.filter(p => p.status === "In Progress").length}</h2>
        </div>
        <div className="project-summary-card">
          <span>Completed</span>
          <h2>{projects.filter(p => p.status === "Completed").length}</h2>
        </div>
        <div className="project-summary-card">
          <span>Total Project Value</span>
          <h2>{formatCurrency(projects.reduce((sum, p) => sum + p.budget, 0))}</h2>
        </div>
      </div>

      <div className="project-toolbar">
        <div className="project-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or clients..."
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="project-filter"
        >
          <option value="All">All Projects</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="projects-grid">
        {filteredProjects.map((project) => (
          <article className="project-card" key={project.id}>
            <div className="project-card-top">
              <div className="project-symbol">
                <FolderKanban size={21} />
              </div>
              <span className={`project-status ${project.status.toLowerCase().replace(" ", "-")}`}>
                {project.status}
              </span>
            </div>

            <small className="project-id">{project.id}</small>
            <h3>{project.name}</h3>

            <div className="project-people">
              <div><Users size={15} /> Client: {project.client}</div>
              <div><FolderKanban size={15} /> Freelancer: {project.freelancer}</div>
            </div>

            <div className="project-budget">
              <span>Project Budget</span>
              <strong>{formatCurrency(project.budget)}</strong>
            </div>

            <div className="project-progress-heading">
              <span>Project Progress</span>
              <strong>{project.progress}%</strong>
            </div>

            <div className="project-progress">
              <div style={{ width: `${project.progress}%` }} />
            </div>

            <div className="project-card-footer">
              <span><CalendarDays size={14} /> {project.deadline}</span>
              <button onClick={() => setSelected(project)}>
                View Details <ArrowUpRight size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="project-empty">
          <FolderKanban size={35} />
          <h3>No projects found</h3>
          <p>Try another search or create a new project.</p>
        </div>
      )}

      {showForm && (
        <div className="project-modal-overlay">
          <div className="project-modal">
            <div className="modal-heading">
              <div>
                <h2>Create New Project</h2>
                <p>Enter project information to get started.</p>
              </div>
              <button onClick={() => setShowForm(false)}><X /></button>
            </div>

            <form onSubmit={createProject}>
              <label>Project Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="e.g. Website Development"
              />

              <label>Client Name</label>
              <input
                required
                value={form.client}
                onChange={e => setForm({...form, client: e.target.value})}
                placeholder="Enter client name"
              />

              <label>Freelancer / Agency</label>
              <input
                required
                value={form.freelancer}
                onChange={e => setForm({...form, freelancer: e.target.value})}
                placeholder="Enter freelancer name"
              />

              <label>Project Budget (INR)</label>
              <div className="budget-input">
                <IndianRupee size={17} />
                <input
                  required
                  type="number"
                  min="1"
                  value={form.budget}
                  onChange={e => setForm({...form, budget: e.target.value})}
                  placeholder="30000"
                />
              </div>

              <label>Project Deadline</label>
              <input
                required
                type="date"
                value={form.deadline}
                onChange={e => setForm({...form, deadline: e.target.value})}
              />

              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Create Project <Plus size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="project-modal-overlay" onClick={() => setSelected(null)}>
          <div className="project-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <small className="project-id">{selected.id}</small>
                <h2>{selected.name}</h2>
                <p>Project details · Demonstration record</p>
              </div>
              <button onClick={() => setSelected(null)}><X /></button>
            </div>

            <div className="detail-row">
              <span>Client</span><strong>{selected.client}</strong>
            </div>
            <div className="detail-row">
              <span>Freelancer</span><strong>{selected.freelancer}</strong>
            </div>
            <div className="detail-row">
              <span>Budget</span><strong>{formatCurrency(selected.budget)}</strong>
            </div>
            <div className="detail-row">
              <span>Deadline</span><strong>{selected.deadline}</strong>
            </div>
            <div className="detail-row">
              <span>Status</span><strong>{selected.status}</strong>
            </div>
            <div className="detail-row">
              <span>Progress</span><strong>{selected.progress}%</strong>
            </div>

            <button className="primary-button detail-close" onClick={() => setSelected(null)}>
              Close Details
            </button>
          </div>
        </div>
      )}

      <p className="demo-note">
        Sample project records and newly created projects are stored locally in this demo session.
        They are not yet saved to PostgreSQL.
      </p>
    </div>
  );
}

export default Projects;
