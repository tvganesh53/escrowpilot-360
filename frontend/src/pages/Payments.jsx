
import React, { useEffect, useState } from "react";
import "./Payments.css";

const API = "http://127.0.0.1:8000";

export default function Payments() {
  const [amount, setAmount] = useState("10");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API}/api/paypal/history`);
      const data = await response.json();
      if (!response.ok) throw new Error("Could not load payment history");
      setTransactions(data.transactions || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    loadHistory();

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (window.location.pathname === "/paypal/success" && token) {
      setMessage("PayPal approved the order. Capture it through the backend to complete the payment.");
    } else if (window.location.pathname === "/paypal/cancel") {
      setMessage("PayPal checkout was cancelled.");
    }
  }, []);

  const createPayment = async () => {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0 || value > 100000) {
      setMessage("Enter a valid amount between 0 and 100000 USD.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/api/paypal/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: value,
          currency: "USD",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Payment creation failed");
      }

      window.location.href = data.approval_url;
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="payments-page">
      <div className="payments-heading">
        <div>
          <span className="payments-eyebrow">PAYMENT MANAGEMENT</span>
          <h1>Payments</h1>
          <p>Create Sandbox payments and monitor transaction records.</p>
        </div>
        <span className="sandbox-label">PayPal Sandbox</span>
      </div>

      {message && (
        <div className="payment-message" role="status">
          {message}
        </div>
      )}

      <section className="payment-create-card">
        <h2>Create a payment</h2>
        <p>Test a payment using your PayPal Sandbox buyer account.</p>

        <label htmlFor="payment-amount">Amount (USD)</label>
        <input
          id="payment-amount"
          type="number"
          min="0.01"
          max="100000"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <button onClick={createPayment} disabled={loading}>
          {loading ? "Creating..." : "Continue with PayPal"}
        </button>
      </section>

      <section className="payment-history-card">
        <div className="payment-history-heading">
          <div>
            <h2>Transaction History</h2>
            <p>Records retrieved from your backend database.</p>
          </div>
          <button onClick={loadHistory}>Refresh</button>
        </div>

        <div className="payment-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Capture ID</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="5">No transactions recorded yet.</td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.paypal_order_id}</td>
                    <td>{transaction.amount}</td>
                    <td>{transaction.currency}</td>
                    <td>
                      <span className={`payment-status ${transaction.status?.toLowerCase()}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>{transaction.paypal_capture_id || "Pending"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
