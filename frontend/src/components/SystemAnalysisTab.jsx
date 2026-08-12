import React, { useState, useEffect } from "react";
import "./SystemAnalysisTab.css";
import {
  testClusterConnection,
  runJMeterSimulation,
  getPodMetrics,
  getNamespaces
} from "../api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

function SystemAnalysisTab() {
  // Load Testing State
  const [backendRoute, setBackendRoute] = useState("");
  const [configureCredentials, setConfigureCredentials] = useState(true);
  const [clusterServerUrl, setClusterServerUrl] = useState("");
  const [clusterToken, setClusterToken] = useState("");
  const [loadTestError, setLoadTestError] = useState("");
  const [loadTestRunning, setLoadTestRunning] = useState(false);
  const [loadTestStatus, setLoadTestStatus] = useState(""); // "", "cleaning", "starting"
  const [connectionStatus, setConnectionStatus] = useState(null); // null, 'success', or 'error'
  const [connectionMessage, setConnectionMessage] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);

  // Namespace State
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState("");
  const [loadingNamespaces, setLoadingNamespaces] = useState(false);
  const [namespacesError, setNamespacesError] = useState("");

  // JMeter Simulation Status
  const [simulationStatus, setSimulationStatus] = useState(null); // null, 'success', or 'error'
  const [simulationMessage, setSimulationMessage] = useState("");

  // Pod Resource State
  const [podMetricsStatus, setPodMetricsStatus] = useState(null); // null, 'success', or 'error'
  const [podMetricsMessage, setPodMetricsMessage] = useState("");
  const [podMetricsLoading, setPodMetricsLoading] = useState(false);
  const [podMetrics, setPodMetrics] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState([]);
  const [cpuTimeSeries, setCpuTimeSeries] = useState([]);
  const [memoryTimeSeries, setMemoryTimeSeries] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Section collapse state
  const [loadTestExpanded, setLoadTestExpanded] = useState(true);
  const [podMetricsExpanded, setPodMetricsExpanded] = useState(true);

  // Load Testing Functions
  async function handleTestConnection() {
    if (!clusterServerUrl || !clusterToken) {
      setConnectionStatus("error");
      setConnectionMessage("Please provide both cluster server URL and token");
      return;
    }

    try {
      setTestingConnection(true);
      setConnectionStatus(null);
      setConnectionMessage("");
      setLoadTestError("");
      
      const result = await testClusterConnection(clusterServerUrl, clusterToken);
      setConnectionStatus("success");
      setConnectionMessage(result.message || "Connection test successful!");
      
      // Automatically fetch namespaces after successful connection
      await fetchNamespaces();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Connection test failed";
      setConnectionStatus("error");
      setConnectionMessage(errorMsg);
    } finally {
      setTestingConnection(false);
    }
  }

  async function fetchNamespaces() {
    if (!clusterServerUrl || !clusterToken) {
      return;
    }

    try {
      setLoadingNamespaces(true);
      setNamespacesError("");
      
      const result = await getNamespaces(clusterServerUrl, clusterToken);
      
      if (result.success && result.namespaces && result.namespaces.length > 0) {
        setNamespaces(result.namespaces);
        // Set default namespace if current selection is not in the list
        if (!result.namespaces.includes(selectedNamespace)) {
          setSelectedNamespace(result.namespaces[0]);
        }
      } else {
        setNamespacesError("No namespaces starting with 'retail' found");
        setNamespaces([]);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch namespaces";
      setNamespacesError(errorMsg);
      setNamespaces([]);
    } finally {
      setLoadingNamespaces(false);
    }
  }

  async function handleRunJMeterSimulation() {
    if (!backendRoute) {
      setSimulationStatus("error");
      setSimulationMessage("Please provide backend route");
      return;
    }

    if (!clusterServerUrl || !clusterToken) {
      setSimulationStatus("error");
      setSimulationMessage("Cluster credentials are required to run JMeter simulation. Please provide both cluster server URL and token.");
      return;
    }

    if (!selectedNamespace) {
      setSimulationStatus("error");
      setSimulationMessage("Please select a namespace from the dropdown.");
      return;
    }

    try {
      setLoadTestRunning(true);
      setLoadTestStatus("cleaning");
      setLoadTestError("");
      setSimulationStatus(null);
      setSimulationMessage("");

      const result = await runJMeterSimulation(
        backendRoute,
        clusterServerUrl,
        clusterToken,
        selectedNamespace
      );

      setLoadTestStatus("starting");
      setSimulationStatus("success");
      setSimulationMessage(result.message || "JMeter simulation started in background");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to start JMeter simulation";
      setSimulationStatus("error");
      setSimulationMessage(errorMsg);
    } finally {
      setLoadTestRunning(false);
      setLoadTestStatus("");
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    let intervalId;
    if (autoRefresh && clusterServerUrl && clusterToken) {
      // Refresh every 5 seconds
      intervalId = setInterval(() => {
        handleRefreshMetrics(true);
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, clusterServerUrl, clusterToken]);

  // Pod Resource Functions
  async function handleRefreshMetrics(isAutoRefresh = false) {
    if (!clusterServerUrl || !clusterToken) {
      setPodMetricsStatus("error");
      setPodMetricsMessage(
        'Please provide cluster server URL and token in the "Load Testing Simulation" section above, then click "Refresh Metrics".'
      );
      return;
    }

    try {
      setPodMetricsLoading(true);
      setPodMetricsStatus(null);
      setPodMetricsMessage("");
      
      const result = await getPodMetrics(clusterServerUrl, clusterToken, selectedNamespace);
      console.log("Pod metrics:", result);
      
      setPodMetrics(result);
      
      // Calculate deployment status
      const deployments = {};
      result.pods.forEach(pod => {
        const deploymentName = pod.name.split('-').slice(0, -2).join('-');
        if (!deployments[deploymentName]) {
          deployments[deploymentName] = { ready: 0, total: 0 };
        }
        deployments[deploymentName].total++;
        if (pod.status === 'Running') {
          deployments[deploymentName].ready++;
        }
      });
      
      const deploymentList = Object.keys(deployments).map(name => ({
        name,
        ready: deployments[name].ready,
        available: deployments[name].total
      }));
      
      setDeploymentStatus(deploymentList);
      
      // Update time series data
      const timestamp = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // Calculate average CPU and memory for backend pods
      const backendPods = result.pods.filter(pod => pod.name.startsWith('retail-backend'));
      const avgCpu = backendPods.reduce((sum, pod) => {
        return sum + (parseInt(pod.cpuUsage.replace('m', '')) || 0);
      }, 0) / (backendPods.length || 1);
      
      const avgMemory = backendPods.reduce((sum, pod) => {
        return sum + (parseInt(pod.memoryUsage.replace('Mi', '')) || 0);
      }, 0) / (backendPods.length || 1);
      
      // Add to time series (keep last 30 data points)
      setCpuTimeSeries(prev => {
        const newData = [...prev, { time: timestamp, cpu: Math.round(avgCpu * 10) / 10 }];
        return newData.slice(-30);
      });
      
      setMemoryTimeSeries(prev => {
        const newData = [...prev, { time: timestamp, memory: Math.round(avgMemory) }];
        return newData.slice(-30);
      });
      
      if (!isAutoRefresh) {
        setPodMetricsStatus("success");
        setPodMetricsMessage(
          `Metrics refreshed successfully! Found ${result.podCount} pods in ${result.namespace} namespace.`
        );
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch pod metrics";
      setPodMetricsStatus("error");
      setPodMetricsMessage(errorMsg);
    } finally {
      setPodMetricsLoading(false);
    }
  }

  return (
    <div className="system-analysis-container">
      {/* Operations Dashboard Link Section */}
      <div className="analysis-section">
        <div className="section-header">
          <h3 className="section-title">Operations Dashboard</h3>
        </div>
        <div className="section-content">
          <p className="section-description">
            Access the comprehensive operations dashboard for detailed metrics, monitoring, and system insights.
          </p>
          <div className="dashboard-link-container">
            <a
              href="https://operations-dashboard-operations-dashboard.automationbb-d01-2bef1f4b4097001da9502000c44fc2b2-0000.us-south.containers.appdomain.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-link"
            >
              🔗 Open Operations Dashboard
              <span className="external-icon">↗</span>
            </a>
            <p className="link-help">
              Opens in a new tab. Provides real-time monitoring, alerts, and advanced analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Load Testing Simulation Section */}
      <div className="analysis-section">
        <div className="section-header">
          <h3 className="section-title">Load Testing Simulation</h3>
          <button
            className="collapse-btn"
            onClick={() => setLoadTestExpanded(!loadTestExpanded)}
            aria-label={loadTestExpanded ? "Collapse section" : "Expand section"}
          >
            {loadTestExpanded ? "−" : "+"}
          </button>
        </div>

        {loadTestExpanded && (
          <div className="section-content">
          <p className="section-description">
            Run a JMeter spike test to simulate user load on the application.
            This will execute a three-phase test (warm-up, spike, cool-down)
            with up to 300 concurrent users.
          </p>

          <p className="section-note">
            <strong>Note:</strong> The simulation runs in the background and may
            take several minutes to complete. Results will be logged to the
            JMeter directory.
          </p>

          <div className="form-group">
            <label className="form-label">Namespace</label>
            <select
              className="form-input"
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              disabled={namespaces.length === 0 || loadingNamespaces}
              style={{ cursor: namespaces.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              <option value="">-- Select a namespace --</option>
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
            <p className="form-help">
              {loadingNamespaces ? (
                "Loading namespaces..."
              ) : namespacesError ? (
                <span style={{ color: "#dc2626" }}>{namespacesError}</span>
              ) : namespaces.length > 0 ? (
                `Select the namespace for load testing (${namespaces.length} available)`
              ) : (
                "Test connection to load namespaces starting with 'retail'"
              )}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Backend Route</label>
            <input
              type="text"
              className="form-input"
              value={backendRoute}
              onChange={(e) => setBackendRoute(e.target.value)}
              placeholder="Enter the backend route to run the JMeter simulation against"
            />
            <p className="form-help">
              Enter the backend route to run the JMeter simulation against
            </p>
          </div>

          <div className="credentials-section">
            <div className="form-group">
              <label className="form-label" style={{ color: "#dc2626", fontWeight: 600 }}>
                Cluster Credentials (Required)
              </label>
              <p className="form-help" style={{ marginTop: 4 }}>
                OpenShift/Kubernetes credentials are required to create and run the JMeter job
              </p>
            </div>
              <div className="form-group">
                <label className="form-label">Cluster Server URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={clusterServerUrl}
                  onChange={(e) => setClusterServerUrl(e.target.value)}
                  placeholder="https://c104-e.us-east.containers.cloud.ibm.com:31258"
                />
                <p className="form-help">
                  The OpenShift/Kubernetes API server URL
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Cluster Token</label>
                <input
                  type="password"
                  className="form-input"
                  value={clusterToken}
                  onChange={(e) => setClusterToken(e.target.value)}
                  placeholder="Enter your cluster token"
                />
                <p className="form-help">
                  Service account token or user token with Job creation
                  permissions
                </p>
              </div>

              <button
                className="btn-test-connection"
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? "Testing..." : "Test Connection"}
              </button>

              {connectionStatus && (
                <div className={`connection-status ${connectionStatus}`}>
                  {connectionMessage}
                </div>
              )}
            </div>

          {simulationStatus && (
            <div className={`connection-status ${simulationStatus}`}>
              {simulationMessage}
            </div>
          )}

          <button
            className="btn-run-simulation"
            onClick={handleRunJMeterSimulation}
            disabled={loadTestRunning}
          >
            {loadTestRunning
              ? loadTestStatus === "cleaning"
                ? "Cleaning up old job..."
                : "Starting simulation..."
              : "Run JMeter Simulation"}
          </button>
          </div>
        )}
      </div>

      {/* Pod Resource Utilization Section */}
      <div className="analysis-section">
        <div className="section-header">
          <h3 className="section-title">
            Pod Resource Utilization ({selectedNamespace} namespace)
          </h3>
          <button
            className="collapse-btn"
            onClick={() => setPodMetricsExpanded(!podMetricsExpanded)}
            aria-label={podMetricsExpanded ? "Collapse section" : "Expand section"}
          >
            {podMetricsExpanded ? "−" : "+"}
          </button>
        </div>

        {podMetricsExpanded && (
          <div className="section-content">
          <p className="section-description">
            Real-time CPU and memory usage for all pods in the{" "}
            <strong>{selectedNamespace}</strong> namespace. This helps monitor
            resource consumption during load testing.
          </p>

          <p className="section-note">
            <strong>Note:</strong> Cluster credentials (Server URL and Token)
            must be provided in the "Load Testing Simulation" section above to
            view pod metrics.
          </p>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <button
              className="btn-refresh-metrics"
              onClick={() => handleRefreshMetrics(false)}
              disabled={podMetricsLoading}
            >
              {podMetricsLoading ? "⟳ Loading..." : "🔄 Refresh Metrics"}
            </button>
            
            <label className="auto-refresh-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                disabled={!clusterServerUrl || !clusterToken}
              />
              <span>Auto-refresh (5s)</span>
            </label>
          </div>

          {podMetricsStatus && (
            <div className={`connection-status ${podMetricsStatus}`}>
              {podMetricsMessage}
            </div>
          )}

          {!clusterServerUrl || !clusterToken && !podMetrics ? (
            <div className="warning-message">
              ⚠️ <strong>Credentials Required:</strong> Please provide cluster
              server URL and token in the "Load Testing Simulation" section
              above, then click "Refresh Metrics".
            </div>
          ) : null}

          {podMetrics && (
            <>
              {/* Deployment Status Table */}
              <div className="metrics-section">
                <h4 className="metrics-title">Deployment Status</h4>
                <table className="metrics-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>READY</th>
                      <th>AVAILABLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deploymentStatus.map((dep) => (
                      <tr key={dep.name}>
                        <td>{dep.name}</td>
                        <td className="status-ready">{dep.ready}/{dep.available}</td>
                        <td className="status-available">{dep.available}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CPU Utilization */}
              <div className="metrics-section">
                <h4 className="metrics-title">CPU Utilization</h4>
                <div className="metrics-bars">
                  {podMetrics.pods.map((pod) => {
                    const cpuValue = parseInt(pod.cpuUsage.replace('m', '')) || 0;
                    const maxCpu = Math.max(...podMetrics.pods.map(p => parseInt(p.cpuUsage.replace('m', '')) || 0));
                    const percentage = maxCpu > 0 ? (cpuValue / maxCpu) * 100 : 0;
                    
                    return (
                      <div key={pod.name} className="metric-bar-row">
                        <div className="metric-label">{pod.name}</div>
                        <div className="metric-bar-container">
                          <div
                            className="metric-bar cpu-bar"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="metric-value">{pod.cpuUsage}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Memory Utilization */}
              <div className="metrics-section">
                <h4 className="metrics-title">Memory Utilization</h4>
                <div className="metrics-bars">
                  {podMetrics.pods.map((pod) => {
                    const memValue = parseInt(pod.memoryUsage.replace('Mi', '')) || 0;
                    const maxMem = Math.max(...podMetrics.pods.map(p => parseInt(p.memoryUsage.replace('Mi', '')) || 0));
                    const percentage = maxMem > 0 ? (memValue / maxMem) * 100 : 0;
                    
                    return (
                      <div key={pod.name} className="metric-bar-row">
                        <div className="metric-label">{pod.name}</div>
                        <div className="metric-bar-container">
                          <div
                            className="metric-bar memory-bar"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="metric-value">{pod.memoryUsage}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CPU Time Series Chart */}
              {cpuTimeSeries.length > 0 && (
                <div className="metrics-section">
                  <h4 className="metrics-title">Backend Pods CPU Pattern (Time-Series)</h4>
                  <div className="chart-info">
                    <span>Current: {cpuTimeSeries[cpuTimeSeries.length - 1]?.cpu.toFixed(1)}m</span>
                    <span>Peak: {Math.max(...cpuTimeSeries.map(d => d.cpu)).toFixed(1)}m</span>
                    <span>Min: {Math.min(...cpuTimeSeries.map(d => d.cpu)).toFixed(1)}m</span>
                    <span>Avg: {(cpuTimeSeries.reduce((sum, d) => sum + d.cpu, 0) / cpuTimeSeries.length).toFixed(1)}m</span>
                    <span>Duration: {cpuTimeSeries.length * 5}s</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={cpuTimeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        fontSize={11}
                        label={{ value: 'CPU (millicores)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cpu"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Average CPU"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Memory Time Series Chart */}
              {memoryTimeSeries.length > 0 && (
                <div className="metrics-section">
                  <h4 className="metrics-title">Backend Pods Memory Pattern (Time-Series)</h4>
                  <div className="chart-info">
                    <span>Current: {memoryTimeSeries[memoryTimeSeries.length - 1]?.memory}Mi</span>
                    <span>Peak: {Math.max(...memoryTimeSeries.map(d => d.memory))}Mi</span>
                    <span>Min: {Math.min(...memoryTimeSeries.map(d => d.memory))}Mi</span>
                    <span>Avg: {Math.round(memoryTimeSeries.reduce((sum, d) => sum + d.memory, 0) / memoryTimeSeries.length)}Mi</span>
                    <span>Duration: {memoryTimeSeries.length * 5}s</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={memoryTimeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        fontSize={11}
                        label={{ value: 'Memory (Mi)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="memory"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Average Memory"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemAnalysisTab;

// Made with Bob
