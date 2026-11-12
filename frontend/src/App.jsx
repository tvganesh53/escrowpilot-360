import { useLocation, useNavigate } from "react-router-dom";
import Projects from "./pages/Projects";
import Milestones from "./pages/Milestones.jsx";
import EvidenceLab from "./pages/EvidenceLab.jsx";
import EvidenceHistory from "./pages/EvidenceHistory.jsx";
import ClaimLoop from "./pages/ClaimLoop.jsx";
import Payments from "./pages/Payments.jsx";

import { useState } from "react";
import {
  LayoutDashboard, FolderKanban, Wallet, BrainCircuit,
  ShieldCheck, Scale, BarChart3, Settings, Bell,
  Search, Menu, X, ArrowUpRight, ArrowDownRight,
  CircleDollarSign, Clock3, CheckCircle2, AlertTriangle,
  Sun, Moon, Plus, ChevronRight, Activity,Milestone, History
} from "lucide-react";

import "./index.css";

const navigation = [
  { name: "Overview", icon: LayoutDashboard, path: "/" },
  { name: "Projects", icon: FolderKanban, path: "/projects" },
  { name: "Payments", icon: Wallet, path: "/payments" },
  { name: "AI Intelligence", icon: BrainCircuit, path: "/ai" },
  { name: "ClaimLoop", icon: Scale, path: "/claimloop" },
  { name: "Trust Intelligence", icon: ShieldCheck, path: "/trust" },
  { name: "Analytics", icon: BarChart3, path: "/analytics" },
  { name: "Settings", icon: Settings, path: "/settings" },
  { name: "Milestones", icon: Milestone, path: "/milestones" },
  { name: "Evidence History", icon: History, path: "/evidence-history" },
];

const transactions = [
  { name: "Website Development", user: "Alex Morgan", amount: "₹30,000", status: "Authorized", date: "10 Nov 2026" },
  { name: "Mobile App UI", user: "Sarah Wilson", amount: "₹18,000", status: "Pending", date: "09 Nov 2026" },
  { name: "Backend Integration", user: "David Lee", amount: "₹12,000", status: "Captured", date: "08 Nov 2026" },
  { name: "Brand Identity", user: "Emma Davis", amount: "₹8,500", status: "Review", date: "07 Nov 2026" },
];

function App() {

  const navigate = useNavigate();
  const location = useLocation();

  const routeNames = {

    "/": "Overview",
    "/projects": "Projects",
    "/payments": "Payments",
    "/ai": "AI Intelligence",
    "/claimloop": "ClaimLoop",
    "/trust": "Trust Intelligence",
    "/analytics": "Analytics",
    "/settings": "Settings",
    "/milestones": "Milestones",
    "/evidence-history": "Evidence History",
};

  const active = routeNames[location.pathname] || "Overview";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const stats = [
    { title: "Active Projects", value: "24", change: "+12.5%", icon: FolderKanban, positive: true },
    { title: "Authorized Payments", value: "₹2.45L", change: "+8.2%", icon: Wallet, positive: true },
    { title: "Pending Approvals", value: "08", change: "Needs attention", icon: Clock3 },
    { title: "Open Disputes", value: "03", change: "2 require review", icon: AlertTriangle },
  ];

  return (
    <div className={dark ? "app dark" : "app"}>
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><ShieldCheck size={25} /></div>
          <div>
            <h2>EscrowPilot<span>360</span></h2>
            <small>PAYMENT TRUST PLATFORM</small>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={21} />
          </button>
        </div>

        <div className="workspace">
          <span className="workspace-avatar">E</span>
          <div>
            <strong>Enterprise Workspace</strong>
            <small>Sandbox Environment</small>
          </div>
          <ChevronRight size={16} />
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`nav-item ${active === item.name ? "active" : ""}`}
                onClick={() => {

                  navigate(item.path);
                  setMobileOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
                {item.name === "ClaimLoop" && <span className="nav-count">3</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <BrainCircuit size={21} />
            <strong>AI Assistant</strong>
            <p>Your intelligent financial companion.</p>
            <button onClick={() => navigate("/ai")}>
              Explore AI <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="profile">
            <div className="profile-avatar">G</div>
            <div>
              <strong>Ganesh</strong>
              <small>Administrator</small>
            </div>
            <Settings size={18} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="breadcrumb">Workspace <ChevronRight size={15} /> <strong>{active}</strong></div>
          </div>

          <div className="topbar-actions">
            <div className="environment"><span /> Sandbox Mode</div>
            <button className="icon-button" onClick={() => setDark(!dark)} title="Toggle theme">
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="icon-button notification-button" title="Notifications">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <div className="top-avatar">G</div>
          </div>
        </header>

        <div className="page-content">
          {active !== "ClaimLoop" && (
          <section className="welcome-section">
            <div>
              <div className="eyebrow"><Activity size={14} /> FINANCIAL COMMAND CENTER</div>
              <h1>{active === "Overview" ? "Good evening, Ganesh 👋" : active}</h1>
              <p>
                {active === "Overview"
                  ? "Here's what's happening with your projects and payments today."
                  : `Manage and monitor your ${active.toLowerCase()} activities.`}
              </p>
            </div>
            <button className="primary-button" onClick={() => navigate("/projects")}>
              <Plus size={18} /> New Project
            </button>
          </section>
        )}

          {active === "Overview" ? (
            <>
              <section className="stats-grid">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <article className="stat-card" key={stat.title}>
                      <div className="stat-top">
                        <span>{stat.title}</span>
                        <div className="stat-icon"><Icon size={20} /></div>
                      </div>
                      <h2>{stat.value}</h2>
                      <div className="stat-change">
                        {stat.positive && <ArrowUpRight size={15} />}
                        <span>{stat.change}</span>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="content-grid">
                <article className="panel payment-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Payment Overview</h3>
                      <p>Financial activity summary</p>
                    </div>
                    <span className="period-label">November 2026</span>
                  </div>

                  <div className="balance">
                    <span>Authorized payment volume</span>
                    <h2>₹2,45,000</h2>
                    <span className="positive"><ArrowUpRight size={15} /> 8.2% from last month</span>
                  </div>

                  <div className="chart-bars">
                    {[35, 55, 43, 75, 52, 90, 65, 78, 48, 85, 68, 100].map((height, i) => (
                      <div className="bar-column" key={i}>
                        <div className="bar" style={{ height: `${height}%` }} />
                        <small>{["J","F","M","A","M","J","J","A","S","O","N","D"][i]}</small>
                      </div>
                    ))}
                  </div>
                  <p className="demo-note">Illustrative dashboard data · Not actual PayPal balances</p>
                </article>

                <article className="panel intelligence-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Trust Intelligence</h3>
                      <p>Project health indicators</p>
                    </div>
                    <ShieldCheck size={22} className="teal-icon" />
                  </div>

                  <div className="intelligence-item">
                    <div className="intelligence-icon teal-bg"><CheckCircle2 /></div>
                    <div><strong>Project health</strong><small>18 projects progressing normally</small></div>
                  </div>
                  <div className="intelligence-item">
                    <div className="intelligence-icon amber-bg"><Clock3 /></div>
                    <div><strong>Pending approvals</strong><small>8 milestones need attention</small></div>
                  </div>
                  <div className="intelligence-item">
                    <div className="intelligence-icon red-bg"><AlertTriangle /></div>
                    <div><strong>Dispute alerts</strong><small>3 cases need review</small></div>
                  </div>
                  <button className="text-button" onClick={() => navigate("/trust")}>
                    View intelligence <ArrowUpRight size={16} />
                  </button>
                </article>
              </section>

              <section className="panel transactions-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Recent Transactions</h3>
                    <p>Latest project payment activity</p>
                  </div>
                  <button className="text-button" onClick={() => navigate("/payments")}>
                    View all <ArrowUpRight size={16} />
                  </button>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>PROJECT</th>
                        <th>CLIENT / USER</th>
                        <th>AMOUNT</th>
                        <th>STATUS</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.name}>
                          <td><strong>{tx.name}</strong></td>
                          <td>{tx.user}</td>
                          <td className="amount">{tx.amount}</td>
                          <td><span className={`status ${tx.status.toLowerCase()}`}>{tx.status}</span></td>
                          <td>{tx.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="demo-note">All transactions shown are synthetic demonstration records.</p>
              </section>
            </>
            ) : active === "AI Intelligence" ? (
              <EvidenceLab />
            ) : active === "Evidence History" ? (
              <EvidenceHistory />
            ) : active === "Projects" ? (
              <Projects />
            ) : active === "Milestones" ? (
              <Milestones />
            ) : active === "Payments" ? (
              <Payments />
            ) : active === "ClaimLoop" ? (
              <ClaimLoop />
          ) : (
            <section className="panel placeholder-panel">
              <div className="placeholder-icon"><CircleDollarSign size={32} /></div>
              <h2>{active}</h2>
              <p>This workspace is ready for the next development stage.</p>
              <span>Module under development</span>
            </section>
          )}

          <footer className="footer">
            <span>© 2026 EscrowPilot 360</span>
            <span>AI-powered payment trust platform</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
