
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Upload,
  X,
  Eye,
  LoaderCircle,
} from "lucide-react";

import "./ClaimLoop.css";

const API_BASE = "http://127.0.0.1:8000";

const INITIAL_FORM = {
  project_name: "",
  milestone_title: "",
  dispute_title: "",
  claimant_role: "Client",
  counterparty_name: "",
  disputed_amount: "",
  currency: "INR",
  dispute_reason: "",
  claimant_statement: "",
  respondent_statement: "",
};

const DECISIONS = [
  "Request More Evidence",
  "Resolved - Claimant",
  "Resolved - Respondent",
  "Escalated",
];

const formatCurrency = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const statusClass = (status = "") =>
  status.toLowerCase().replaceAll(" ", "-").replaceAll("_", "-");

function ClaimLoop() {
  const [disputes, setDisputes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);
  const [evidenceFiles, setEvidenceFiles] = useState([]);

  const [decision, setDecision] = useState("Request More Evidence");
  const [decisionNotes, setDecisionNotes] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const notify = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  };

  const getErrorMessage = (err) => {
    if (err?.response?.detail) return err.response.detail;
    if (typeof err?.detail === "string") return err.detail;
    return err?.message || "Something went wrong. Please try again.";
  };

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, options);

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = Array.isArray(result.detail)
        ? result.detail.map((item) => item.msg).join(", ")
        : result.detail;

      throw new Error(detail || `Request failed (${response.status}).`);
    }

    return result;
  };

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await request("/api/claimloop/disputes");
      setDisputes(result.disputes || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const openDispute = async (id) => {
    setError("");

    try {
      const result = await request(
        `/api/claimloop/disputes/${id}`
      );

      setSelected(result.dispute);
      setDecision(result.dispute?.decision || "Request More Evidence");
      setDecisionNotes(result.dispute?.decision_notes || "");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const maxSize = 10 * 1024 * 1024;

    const validFiles = [];
    const invalidFiles = [];

    selectedFiles.forEach((file) => {
      const extension = file.name
        .slice(file.name.lastIndexOf("."))
        .toLowerCase();

      if (!allowedExtensions.includes(extension)) {
        invalidFiles.push(`${file.name}: unsupported file type`);
      } else if (file.size > maxSize) {
        invalidFiles.push(`${file.name}: exceeds 10 MB`);
      } else {
        validFiles.push(file);
      }
    });

    setEvidenceFiles(validFiles);

    if (invalidFiles.length) {
      setError(invalidFiles.join(". "));
    } else {
      setError("");
    }
  };

  const createDispute = async (event) => {
    event.preventDefault();

    setCreating(true);
    setError("");

    try {
      const data = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        data.append(key, value);
      });

      evidenceFiles.forEach((file) => {
        data.append("files", file);
      });

      const result = await request("/api/claimloop/disputes", {
        method: "POST",
        body: data,
      });

      setShowForm(false);
      setForm(INITIAL_FORM);
      setEvidenceFiles([]);

      notify(`Dispute #${result.dispute_id} created successfully.`);

      await loadDisputes();
      await openDispute(result.dispute_id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const runInvestigation = async () => {
    if (!selected?.id) return;

    setAnalyzing(true);
    setError("");

    try {
      await request(
        `/api/claimloop/disputes/${selected.id}/analyze`,
        { method: "POST" }
      );

      const result = await request(
        `/api/claimloop/disputes/${selected.id}`
      );

      setSelected(result.dispute);
      notify("AI investigation completed successfully.");

      await loadDisputes();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const saveDecision = async (event) => {
    event.preventDefault();

    if (!selected?.id) return;

    setSavingDecision(true);
    setError("");

    try {
      await request(
        `/api/claimloop/disputes/${selected.id}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            decision_notes: decisionNotes,
          }),
        }
      );

      const result = await request(
        `/api/claimloop/disputes/${selected.id}`
      );

      setSelected(result.dispute);

      notify("Human decision saved successfully.");
      await loadDisputes();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingDecision(false);
    }
  };

  const filteredDisputes = disputes.filter((item) => {
    const query = search.toLowerCase();

    const matchesSearch = [
      item.project_name,
      item.milestone_title,
      item.dispute_title,
      item.counterparty_name,
      String(item.id),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));

    const matchesFilter =
      filter === "All" || item.status === filter;

    return matchesSearch && matchesFilter;
  });

  const openCount = disputes.filter(
    (item) => item.status === "Open"
  ).length;

  const reviewCount = disputes.filter(
    (item) => item.status === "Under Review"
  ).length;

  const resolvedCount = disputes.filter(
    (item) =>
      item.status === "Resolved - Claimant" ||
      item.status === "Resolved - Respondent"
  ).length;

  const totalDisputed = disputes.reduce(
    (sum, item) => sum + Number(item.disputed_amount || 0),
    0
  );

  const analysis = selected?.analysis || null;

  return (
    <div className="claimloop-page">
      <div className="claimloop-heading">
        <div>
          <div className="eyebrow">
            <Scale size={14} />
            DISPUTE RESOLUTION INTELLIGENCE
          </div>

          <h1>ClaimLoop</h1>

          <p>
            Investigate disputes, evaluate evidence and record
            transparent human decisions.
          </p>
        </div>

        <div className="claimloop-heading-actions">
          <button
            className="cl-secondary-button"
            onClick={loadDisputes}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "cl-spinning" : ""}
            />
            Refresh
          </button>

          <button
            className="primary-button"
            onClick={() => {
              setError("");
              setShowForm(true);
            }}
          >
            <Plus size={17} />
            New Dispute
          </button>
        </div>
      </div>

      {notice && (
        <div className="cl-notice success">
          <CheckCircle2 size={17} />
          {notice}
          <button onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="cl-notice error">
          <AlertTriangle size={17} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      <section className="cl-stats-grid">
        <article className="cl-stat-card">
          <div className="cl-stat-top">
            <span>Total Disputes</span>
            <div className="cl-stat-icon blue">
              <Scale size={19} />
            </div>
          </div>
          <h2>{disputes.length}</h2>
          <small>All recorded cases</small>
        </article>

        <article className="cl-stat-card">
          <div className="cl-stat-top">
            <span>Open Disputes</span>
            <div className="cl-stat-icon amber">
              <CircleAlert size={19} />
            </div>
          </div>
          <h2>{openCount}</h2>
          <small>Awaiting investigation</small>
        </article>

        <article className="cl-stat-card">
          <div className="cl-stat-top">
            <span>Under Review</span>
            <div className="cl-stat-icon purple">
              <BrainCircuit size={19} />
            </div>
          </div>
          <h2>{reviewCount}</h2>
          <small>AI analysis completed or in review</small>
        </article>

        <article className="cl-stat-card">
          <div className="cl-stat-top">
            <span>Resolved</span>
            <div className="cl-stat-icon green">
              <CheckCircle2 size={19} />
            </div>
          </div>
          <h2>{resolvedCount}</h2>
          <small>Human decisions recorded</small>
        </article>
      </section>

      <section className="cl-total-panel">
        <div>
          <span>Total disputed amount</span>
          <h2>{formatCurrency(totalDisputed)}</h2>
          <small>Sum of amounts across recorded disputes</small>
        </div>

        <div className="cl-total-icon">
          <ShieldCheck size={26} />
        </div>
      </section>

      <section className="cl-list-panel">
        <div className="cl-list-heading">
          <div>
            <h3>Dispute Records</h3>
            <p>Review and investigate saved dispute cases.</p>
          </div>

          <span className="cl-record-count">
            {filteredDisputes.length} records
          </span>
        </div>

        <div className="cl-toolbar">
          <div className="cl-search">
            <Search size={16} />

            <input
              type="search"
              placeholder="Search project, dispute or counterparty..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="cl-filter"
          >
            <option value="All">All statuses</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Request More Evidence">
              Request More Evidence
            </option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved - Claimant">
              Resolved - Claimant
            </option>
            <option value="Resolved - Respondent">
              Resolved - Respondent
            </option>
          </select>
        </div>

        {loading ? (
          <div className="cl-empty">
            <LoaderCircle className="cl-spinning" size={25} />
            <p>Loading dispute records...</p>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="cl-empty">
            <FileText size={34} />
            <h3>No disputes found</h3>
            <p>
              Create a dispute to begin an evidence-based investigation.
            </p>
            <button
              className="primary-button"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} />
              Create First Dispute
            </button>
          </div>
        ) : (
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th>CASE</th>
                  <th>PROJECT / MILESTONE</th>
                  <th>COUNTERPARTY</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>CREATED</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {filteredDisputes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>#{item.id}</strong>
                    </td>

                    <td>
                      <strong>{item.project_name}</strong>
                      <small>{item.milestone_title}</small>
                    </td>

                    <td>{item.counterparty_name}</td>

                    <td className="cl-amount">
                      {formatCurrency(item.disputed_amount, item.currency)}
                    </td>

                    <td>
                      <span
                        className={`cl-status ${statusClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>{formatDate(item.created_at)}</td>

                    <td>
                      <button
                        className="cl-view-button"
                        onClick={() => openDispute(item.id)}
                      >
                        View <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="cl-disclaimer">
        <ShieldCheck size={17} />
        <p>
          AI findings are advisory and must be reviewed by an authorized
          human. ClaimLoop does not automatically authorize, capture,
          release or refund payments.
        </p>
      </div>

      {showForm && (
        <div
          className="cl-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating) {
              setShowForm(false);
            }
          }}
        >
          <div className="cl-modal">
            <div className="cl-modal-heading">
              <div>
                <span className="eyebrow">
                  <Scale size={13} /> CASE REGISTRATION
                </span>
                <h2>Create New Dispute</h2>
                <p>Provide the case details and supporting evidence.</p>
              </div>

              <button
                className="cl-close-button"
                onClick={() => setShowForm(false)}
                disabled={creating}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createDispute}>
              <div className="cl-form-grid">
                <label>
                  Project Name *
                  <input
                    required
                    name="project_name"
                    value={form.project_name}
                    onChange={updateForm}
                    placeholder="Website Development"
                  />
                </label>

                <label>
                  Milestone Title *
                  <input
                    required
                    name="milestone_title"
                    value={form.milestone_title}
                    onChange={updateForm}
                    placeholder="Homepage Development"
                  />
                </label>

                <label className="cl-full">
                  Dispute Title *
                  <input
                    required
                    name="dispute_title"
                    value={form.dispute_title}
                    onChange={updateForm}
                    placeholder="Describe the dispute briefly"
                  />
                </label>

                <label>
                  Claimant Role *
                  <select
                    name="claimant_role"
                    value={form.claimant_role}
                    onChange={updateForm}
                  >
                    <option value="Client">Client</option>
                    <option value="Freelancer">Freelancer</option>
                  </select>
                </label>

                <label>
                  Counterparty Name *
                  <input
                    required
                    name="counterparty_name"
                    value={form.counterparty_name}
                    onChange={updateForm}
                    placeholder="Other party's name"
                  />
                </label>

                <label>
                  Disputed Amount *
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="disputed_amount"
                    value={form.disputed_amount}
                    onChange={updateForm}
                    placeholder="15000"
                  />
                </label>

                <label>
                  Currency
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={updateForm}
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </label>

                <label className="cl-full">
                  Dispute Reason *
                  <textarea
                    required
                    rows="3"
                    name="dispute_reason"
                    value={form.dispute_reason}
                    onChange={updateForm}
                    placeholder="Explain why this dispute was raised..."
                  />
                </label>

                <label className="cl-full">
                  Claimant Statement *
                  <textarea
                    required
                    rows="3"
                    name="claimant_statement"
                    value={form.claimant_statement}
                    onChange={updateForm}
                    placeholder="Describe the claimant's position..."
                  />
                </label>

                <label className="cl-full">
                  Respondent Statement
                  <textarea
                    rows="3"
                    name="respondent_statement"
                    value={form.respondent_statement}
                    onChange={updateForm}
                    placeholder="Describe the respondent's position, if available..."
                  />
                </label>

                <div className="cl-full">
                  <label className="cl-upload-label">
                    <Upload size={19} />
                    <strong>Supporting Evidence</strong>
                    <span>PDF, DOCX or TXT · Maximum 10 MB per file</span>

                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      multiple
                      onChange={handleFileChange}
                    />
                  </label>

                  {evidenceFiles.length > 0 && (
                    <div className="cl-selected-files">
                      {evidenceFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`}>
                          <FileText size={15} />
                          <span>{file.name}</span>
                          <small>
                            {(file.size / 1024).toFixed(1)} KB
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="cl-modal-actions">
                <button
                  type="button"
                  className="cl-secondary-button"
                  onClick={() => setShowForm(false)}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <LoaderCircle className="cl-spinning" size={16} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Dispute
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="cl-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <div className="cl-modal cl-detail-modal">
            <div className="cl-modal-heading">
              <div>
                <span className="eyebrow">
                  <Activity size={13} /> DISPUTE CASE #{selected.id}
                </span>

                <h2>{selected.dispute_title}</h2>
                <p>
                  {selected.project_name} · {selected.milestone_title}
                </p>
              </div>

              <button
                className="cl-close-button"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="cl-detail-summary">
              <div>
                <span>Disputed amount</span>
                <strong>
                  {formatCurrency(selected.disputed_amount, selected.currency)}
                </strong>
              </div>

              <div>
                <span>Case status</span>
                <strong>{selected.status}</strong>
              </div>

              <div>
                <span>Claimant role</span>
                <strong>{selected.claimant_role}</strong>
              </div>
            </div>

            <div className="cl-detail-section">
              <h3>Dispute Information</h3>

              <div className="cl-detail-row">
                <span>Counterparty</span>
                <strong>{selected.counterparty_name}</strong>
              </div>

              <div className="cl-detail-row">
                <span>Reason</span>
                <strong>{selected.dispute_reason}</strong>
              </div>

              <div className="cl-detail-row">
                <span>Claimant statement</span>
                <strong>{selected.claimant_statement}</strong>
              </div>

              <div className="cl-detail-row">
                <span>Respondent statement</span>
                <strong>
                  {selected.respondent_statement || "Not provided"}
                </strong>
              </div>
            </div>

            <div className="cl-detail-section">
              <h3>Uploaded Evidence</h3>

              {selected.evidence_files?.length > 0 ? (
                <div className="cl-evidence-list">
                  {selected.evidence_files.map((file, index) => (
                    <div key={`${file.stored_name}-${index}`}>
                      <FileText size={17} />
                      <span>{file.original_name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cl-muted">No evidence files uploaded.</p>
              )}
            </div>

            <div className="cl-analysis-section">
              <div className="cl-analysis-heading">
                <div>
                  <span className="eyebrow">
                    <BrainCircuit size={13} /> GROQ AI INVESTIGATION
                  </span>
                  <h3>Evidence Analysis</h3>
                </div>

                <button
                  className="primary-button"
                  onClick={runInvestigation}
                  disabled={
                    analyzing ||
                    selected.status === "Resolved - Claimant" ||
                    selected.status === "Resolved - Respondent"
                  }
                >
                  {analyzing ? (
                    <>
                      <LoaderCircle className="cl-spinning" size={15} />
                      Investigating...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={15} />
                      {analysis ? "Run Again" : "Investigate"}
                    </>
                  )}
                </button>
              </div>

              {analysis ? (
                <div className="cl-analysis-results">
                  <div className="cl-risk-row">
                    <span>Risk Level</span>
                    <strong
                      className={`cl-risk ${String(
                        analysis.risk_level || ""
                      ).toLowerCase()}`}
                    >
                      {analysis.risk_level || "Not specified"}
                    </strong>
                  </div>

                  <div className="cl-analysis-card">
                    <h4>Case Summary</h4>
                    <p>{analysis.case_summary}</p>
                  </div>

                  <div className="cl-analysis-card">
                    <h4>Dispute Category</h4>
                    <p>{analysis.dispute_category}</p>
                  </div>

                  <div className="cl-analysis-card">
                    <h4>Claimant Findings</h4>

                    {analysis.claimant_findings?.length ? (
                      analysis.claimant_findings.map((item, index) => (
                        <div className="cl-finding" key={index}>
                          <strong>{item.finding}</strong>
                          <p>{item.supporting_evidence}</p>
                        </div>
                      ))
                    ) : (
                      <p>No claimant findings returned.</p>
                    )}
                  </div>

                  <div className="cl-analysis-card">
                    <h4>Respondent Findings</h4>

                    {analysis.respondent_findings?.length ? (
                      analysis.respondent_findings.map((item, index) => (
                        <div className="cl-finding" key={index}>
                          <strong>{item.finding}</strong>
                          <p>{item.supporting_evidence}</p>
                        </div>
                      ))
                    ) : (
                      <p>No respondent findings returned.</p>
                    )}
                  </div>

                  <div className="cl-analysis-card">
                    <h4>Conflicting Claims</h4>

                    {analysis.conflicts?.length ? (
                      analysis.conflicts.map((item, index) => (
                        <div className="cl-finding" key={index}>
                          <strong>{item.issue}</strong>
                          <p>
                            Claimant: {item.claimant_position}
                          </p>
                          <p>
                            Respondent: {item.respondent_position}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p>No explicit conflicts identified.</p>
                    )}
                  </div>

                  <div className="cl-analysis-card">
                    <h4>Missing Evidence</h4>

                    {analysis.missing_evidence?.length ? (
                      <ul>
                        {analysis.missing_evidence.map((item, index) => (
                          <li key={index}>
                            {typeof item === "string"
                              ? item
                              : item.description || JSON.stringify(item)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No missing evidence listed.</p>
                    )}
                  </div>

                  <div className="cl-recommendation">
                    <span>AI Recommendation</span>
                    <h4>{analysis.recommendation}</h4>
                    <p>{analysis.recommendation_reason}</p>
                  </div>

                  <div className="cl-analysis-card">
                    <h4>Suggested Next Steps</h4>

                    {analysis.suggested_next_steps?.length ? (
                      <ul>
                        {analysis.suggested_next_steps.map((item, index) => (
                          <li key={index}>
                            {typeof item === "string"
                              ? item
                              : item.description || JSON.stringify(item)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No next steps returned.</p>
                    )}
                  </div>

                  <div className="cl-human-warning">
                    <ShieldCheck size={17} />
                    Human review required. This AI recommendation is
                    advisory and is not a binding decision.
                  </div>
                </div>
              ) : (
                <div className="cl-empty cl-analysis-empty">
                  <BrainCircuit size={31} />
                  <h3>Investigation not started</h3>
                  <p>
                    Run AI investigation to evaluate the available
                    statements and uploaded evidence.
                  </p>
                </div>
              )}
            </div>

            <div className="cl-detail-section">
              <h3>Human Decision</h3>

              {selected.decision ? (
                <div className="cl-recorded-decision">
                  <span>Recorded decision</span>
                  <strong>{selected.decision}</strong>
                  <p>{selected.decision_notes}</p>
                </div>
              ) : null}

              {analysis && (
                <form onSubmit={saveDecision} className="cl-decision-form">
                  <label>
                    Decision
                    <select
                      value={decision}
                      onChange={(event) => setDecision(event.target.value)}
                    >
                      {DECISIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Decision Notes
                    <textarea
                      required
                      minLength={5}
                      maxLength={3000}
                      rows="4"
                      value={decisionNotes}
                      onChange={(event) =>
                        setDecisionNotes(event.target.value)
                      }
                      placeholder="Explain the reason for this human decision..."
                    />
                  </label>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={savingDecision}
                  >
                    {savingDecision ? (
                      <>
                        <LoaderCircle className="cl-spinning" size={15} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Record Human Decision
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="cl-human-warning">
              <AlertTriangle size={17} />
              Recording a decision does not execute any payment operation.
            </div>

            <div className="cl-report-actions">
  <button
    type="button"
    className="cl-primary-button cl-print-report"
    onClick={() => window.print()}
  >
    <FileText size={16} />
    Download Dispute Report (PDF)
  </button>

  <button
    type="button"
    className="cl-secondary-button cl-close-detail"
    onClick={() => setSelected(null)}
  >
    Close Case Details
  </button>
</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaimLoop;
