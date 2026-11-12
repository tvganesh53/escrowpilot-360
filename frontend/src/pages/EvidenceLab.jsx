
import { useState } from "react";
import {
  Upload,
  FileText,
  BrainCircuit,
  LoaderCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
} from "lucide-react";

import "./EvidenceLab.css";

const API_URL = "http://127.0.0.1:8000";

function EvidenceLab() {
  const [projectName, setProjectName] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [criteria, setCriteria] = useState("");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setError("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const extension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setFile(null);
      setError("Please upload a PDF, DOCX or TXT file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError("File size must not exceed 10 MB.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!projectName.trim() || !milestoneTitle.trim() ||
        !criteria.trim() || !file) {
      setError("Please complete all fields and upload an evidence file.");
      return;
    }

    const formData = new FormData();

    formData.append("project_name", projectName.trim());
    formData.append("milestone_title", milestoneTitle.trim());
    formData.append("acceptance_criteria", criteria.trim());
    formData.append("file", file);

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/evidence/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Evidence analysis failed. Please try again."
        );
      }

      setResult(data.analysis);
    } catch (err) {
      setError(
        err.message ||
        "Unable to connect to the backend. Check whether FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderCriteria = (items, emptyMessage) => {
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="evidence-muted">{emptyMessage}</p>;
    }

    return items.map((item, index) => (
      <div className="evidence-criterion" key={index}>
        <div>
          <strong>{item.criterion || "Criterion"}</strong>
          <p>{item.evidence || "No supporting explanation provided."}</p>
        </div>
        <span className={`criterion-status ${
          (item.status || "Unclear").toLowerCase().replaceAll(" ", "-")
        }`}>
          {item.status || "Unclear"}
        </span>
      </div>
    ));
  };

  return (
    <div className="evidence-lab">
      <div className="evidence-intro">
        <div>
          <div className="evidence-eyebrow">
            <BrainCircuit size={15} />
            GROQ-POWERED EVIDENCE ANALYSIS
          </div>

          <h2>AI Evidence Lab</h2>

          <p>
            Analyze milestone deliverables against acceptance criteria
            and identify missing evidence before payment approval.
          </p>
        </div>

        <div className="evidence-ai-badge">
          <ShieldCheck size={18} />
          Human approval required
        </div>
      </div>

      <div className="evidence-layout">
        <form className="evidence-card" onSubmit={handleAnalyze}>
          <div className="evidence-card-heading">
            <div className="evidence-heading-icon">
              <FileText size={21} />
            </div>
            <div>
              <h3>Milestone information</h3>
              <p>Provide the details and acceptance criteria.</p>
            </div>
          </div>

          <label htmlFor="projectName">Project name</label>
          <input
            id="projectName"
            type="text"
            placeholder="e.g. EscrowPilot 360"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />

          <label htmlFor="milestoneTitle">Milestone title</label>
          <input
            id="milestoneTitle"
            type="text"
            placeholder="e.g. Dashboard Development"
            value={milestoneTitle}
            onChange={(e) => setMilestoneTitle(e.target.value)}
          />

          <label htmlFor="criteria">Acceptance criteria</label>
          <textarea
            id="criteria"
            rows={7}
            placeholder={
              "Enter each requirement on a separate line.\n\n1. Dashboard must be implemented.\n2. Login validation must work.\n3. Transaction history must be displayed."
            }
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
          />

          <label>Upload milestone evidence</label>

          <label className="evidence-upload" htmlFor="evidenceFile">
            <Upload size={27} />
            <strong>
              {file ? file.name : "Click to upload your evidence"}
            </strong>
            <span>PDF, DOCX or TXT · Maximum 10 MB</span>
            <input
              id="evidenceFile"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
            />
          </label>

          {file && (
            <div className="selected-evidence">
              <FileText size={17} />
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
              >
                Remove
              </button>
            </div>
          )}

          {error && (
            <div className="evidence-error">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            className="evidence-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="evidence-spinner" size={19} />
                Analyzing evidence...
              </>
            ) : (
              <>
                <BrainCircuit size={19} />
                Analyze Evidence
              </>
            )}
          </button>

          <p className="evidence-disclaimer">
            AI recommendations are advisory. Payments are never
            automatically released by this analysis.
          </p>
        </form>

        <section className="evidence-results">
          {!result && !loading && (
            <div className="evidence-empty">
              <div className="evidence-empty-icon">
                <BrainCircuit size={34} />
              </div>
              <h3>Analysis results</h3>
              <p>
                Upload milestone evidence and start an analysis.
                Your results will appear here.
              </p>
            </div>
          )}

          {loading && (
            <div className="evidence-empty">
              <LoaderCircle
                className="evidence-spinner"
                size={38}
              />
              <h3>Analyzing your evidence</h3>
              <p>
                Groq AI is comparing the uploaded document
                against your acceptance criteria.
              </p>
            </div>
          )}

          {result && (
            <div className="evidence-result-content">
              
<div className="evidence-result-header">
  <div>
    <div className="evidence-eyebrow">
      <CheckCircle2 size={15} />
      ANALYSIS COMPLETE
    </div>
    <h3>Evidence analysis report</h3>
  </div>

  <div className="report-actions">
    <span className="result-status">
      {result.overall_status}
    </span>

    <button
      type="button"
      className="report-download"
      onClick={() => window.print()}
    >
      Download PDF
    </button>
  </div>
</div>

<div className="report-document-header">
  <h2>EscrowPilot 360</h2>
  <p>Milestone Evidence Assessment Report</p>
  <span>AI-assisted assessment · Human review required</span>
</div>

<div className="report-meta">
  <div>
    <span>Project</span>
    <strong>{projectName}</strong>
  </div>
  <div>
    <span>Milestone</span>
    <strong>{milestoneTitle}</strong>
  </div>
  <div>
    <span>Evidence file</span>
    <strong>{file?.name || "Not available"}</strong>
  </div>
  <div>
    <span>Report generated</span>
    <strong>{new Date().toLocaleString()}</strong>
  </div>
</div>


              <div className="completion-card">
                <span>Completion score</span>
                <strong>{result.completion_score}%</strong>
                <div className="completion-track">
                  <div
                    className="completion-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, result.completion_score)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="result-section">
                <h4>Summary</h4>
                <p>{result.summary}</p>
              </div>

              <div className="result-section">
                <h4>
                  <CheckCircle2 size={17} />
                  Matched criteria
                </h4>
                {renderCriteria(
                  result.matched_criteria,
                  "No matched criteria returned."
                )}
              </div>

              <div className="result-section">
                <h4>
                  <XCircle size={17} />
                  Missing criteria
                </h4>
                {renderCriteria(
                  result.missing_criteria,
                  "No missing criteria returned."
                )}
              </div>

              <div className="result-section">
                <h4>
                  <AlertTriangle size={17} />
                  Identified risks
                </h4>

                {Array.isArray(result.risks) &&
                result.risks.length > 0 ? (
                  <ul className="evidence-risks">
                    {result.risks.map((risk, index) => (
                      <li key={index}>
                        {typeof risk === "string"
                          ? risk
                          : JSON.stringify(risk)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="evidence-muted">
                    No risks returned by the AI.
                  </p>
                )}
              </div>

              <div className="recommendation-card">
                <span>AI recommendation (advisory only)</span>
                <strong>{result.recommendation}</strong>
                <p>{result.recommendation_reason}</p>
              </div>

              <div className="human-review-note">
                <ShieldCheck size={20} />
                <span>
                  A human must review the evidence and explicitly
                  approve any payment action.
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default EvidenceLab;
