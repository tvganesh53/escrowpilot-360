
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  FileText,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  Download,
} from "lucide-react";
import "./EvidenceHistory.css";

const API_BASE = "http://127.0.0.1:8000";

function normalizeScore(score) {
  const value = Number(score ?? 0);
  return Math.round(value <= 1 ? value * 100 : value);
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getStatusClass(status = "") {
  const normalized = status.toLowerCase();

  if (normalized === "completed") return "completed";
  if (normalized === "partially completed") return "partial";

  return "review";
}

function EvidenceHistory() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/evidence/history`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setRecords(data.history || []);
    } catch (err) {
      setError(
        "Could not load assessment history. Check that your FastAPI backend is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        (record.project_name || "").toLowerCase().includes(searchText) ||
        (record.milestone_title || "").toLowerCase().includes(searchText) ||
        (record.evidence_filename || "").toLowerCase().includes(searchText);

      const matchesFilter =
        filter === "All" || record.overall_status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [records, search, filter]);

  const completedCount = records.filter(
    (record) => record.overall_status === "Completed"
  ).length;

  const partialCount = records.filter(
    (record) => record.overall_status === "Partially Completed"
  ).length;

  const reviewCount = records.filter(
    (record) => record.overall_status === "Needs Review"
  ).length;

  const openRecord = async (id) => {
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/evidence/history/${id}`
      );

      if (!response.ok) {
        throw new Error("Could not retrieve this assessment.");
      }

      const data = await response.json();
      setSelected(data.record);
    } catch (err) {
      setError(err.message || "Unable to open assessment.");
    }
  };

  const printRecord = () => {
    if (!selected) return;
    window.print();
  };

  return (
    <div className="history-page">
      <div className="history-heading">
        <div>
          <div className="eyebrow">
            <History size={15} />
            ASSESSMENT RECORDS
          </div>

          <h1>Evidence History</h1>

          <p>
            Review previously analyzed milestone evidence and AI assessments.
          </p>
        </div>

        <button
          className="history-refresh"
          onClick={loadHistory}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="history-error">{error}</div>}

      <div className="history-stats">
        <article>
          <span>Total assessments</span>
          <strong>{records.length}</strong>
        </article>

        <article>
          <span>Completed</span>
          <strong className="history-green">{completedCount}</strong>
        </article>

        <article>
          <span>Partially completed</span>
          <strong className="history-amber">{partialCount}</strong>
        </article>

        <article>
          <span>Needs review</span>
          <strong className="history-red">{reviewCount}</strong>
        </article>
      </div>

      <section className="history-panel">
        <div className="history-toolbar">
          <div>
            <h3>Previous assessments</h3>
            <p>Saved AI evidence analysis records</p>
          </div>

          <div className="history-controls">
            <div className="history-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search project or milestone..."
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Completed">Completed</option>
              <option value="Partially Completed">
                Partially Completed
              </option>
              <option value="Needs Review">Needs Review</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="history-empty">
            <RefreshCw size={25} />
            <p>Loading assessment history...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="history-empty">
            <FileText size={32} />
            <h3>No assessments found</h3>
            <p>
              Analyze milestone evidence or change your search filters.
            </p>
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>PROJECT / MILESTONE</th>
                  <th>EVIDENCE FILE</th>
                  <th>SCORE</th>
                  <th>STATUS</th>
                  <th>RECOMMENDATION</th>
                  <th>DATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.project_name}</strong>
                      <small>{record.milestone_title}</small>
                      <small>Record #{record.id}</small>
                    </td>

                    <td>{record.evidence_filename}</td>

                    <td>
                      <strong>{normalizeScore(record.completion_score)}%</strong>
                    </td>

                    <td>
                      <span
                        className={`history-status ${getStatusClass(
                          record.overall_status
                        )}`}
                      >
                        {record.overall_status}
                      </span>
                    </td>

                    <td>{record.recommendation}</td>

                    <td>{formatDate(record.created_at)}</td>

                    <td>
                      <button
                        className="history-view"
                        onClick={() => openRecord(record.id)}
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="history-footer">
          Showing {filteredRecords.length} of {records.length} assessments
        </div>
      </section>

      {selected && (
        <div
          className="history-modal-overlay"
          onClick={() => setSelected(null)}
        >
          <section
            className="history-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-modal-heading">
              <div>
                <span>ASSESSMENT #{selected.id}</span>
                <h2>{selected.project_name}</h2>
                <p>{selected.milestone_title}</p>
              </div>

              <button onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="history-detail-score">
              <span>Completion score</span>
              <strong>{normalizeScore(selected.completion_score)}%</strong>
              <span>{selected.overall_status}</span>
            </div>

            <div className="history-detail-row">
              <span>Evidence file</span>
              <strong>{selected.evidence_filename}</strong>
            </div>

            <div className="history-detail-row">
              <span>Recommendation</span>
              <strong>{selected.recommendation}</strong>
            </div>

            <div className="history-detail-row">
              <span>Assessment date</span>
              <strong>{formatDate(selected.created_at)}</strong>
            </div>

            <div className="history-detail-section">
              <h3>
                <CheckCircle2 size={17} />
                Matched criteria
              </h3>

              {(selected.analysis?.matched_criteria || []).length ? (
                selected.analysis.matched_criteria.map((item, index) => (
                  <div className="history-criterion" key={index}>
                    <strong>{item.criterion}</strong>
                    <span>{item.status}</span>
                    <p>{item.evidence}</p>
                  </div>
                ))
              ) : (
                <p>No matched criteria recorded.</p>
              )}
            </div>

            <div className="history-detail-section">
              <h3>
                <AlertTriangle size={17} />
                Missing criteria
              </h3>

              {(selected.analysis?.missing_criteria || []).length ? (
                selected.analysis.missing_criteria.map((item, index) => (
                  <div className="history-criterion" key={index}>
                    <strong>
                      {typeof item === "string" ? item : item.criterion}
                    </strong>
                    {typeof item === "object" && item.reason && (
                      <p>{item.reason}</p>
                    )}
                  </div>
                ))
              ) : (
                <p>No missing criteria recorded.</p>
              )}
            </div>

            <div className="history-detail-section">
              <h3>
                <Clock size={17} />
                Identified risks
              </h3>

              {(selected.analysis?.risks || []).length ? (
                selected.analysis.risks.map((risk, index) => (
                  <p key={index}>
                    {typeof risk === "string" ? risk : risk.description || JSON.stringify(risk)}
                  </p>
                ))
              ) : (
                <p>No risks recorded.</p>
              )}
            </div>

            <div className="history-detail-section">
              <h3>AI recommendation reason</h3>
              <p>{selected.analysis?.recommendation_reason || "Not available."}</p>
            </div>

            <div className="history-human-note">
              AI recommendations are advisory only. A human must review and
              explicitly approve any payment action.
            </div>

            <div className="history-modal-actions">
              <button
                className="history-cancel"
                onClick={() => setSelected(null)}
              >
                Close
              </button>

              <button
                className="history-print"
                onClick={printRecord}
              >
                <Download size={16} />
                Print / Save PDF
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default EvidenceHistory;
