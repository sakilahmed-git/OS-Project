import { useState } from "react";
import "./App.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

function App() {
  const [inputEdges, setInputEdges] = useState("");
  const [edges, setEdges] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [cycle, setCycle] = useState([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_KEY);

  const buildGraph = () => {
    const parsed = inputEdges.split(",").map((e, i) => {
      const [from, to] = e.split("->");
      return { id: i, from: from.trim(), to: to.trim() };
    });

    setEdges(parsed);

    const uniqueNodes = new Set();
    parsed.forEach(e => {
      uniqueNodes.add(e.from);
      uniqueNodes.add(e.to);
    });

    const nodeArray = Array.from(uniqueNodes).map((id, i) => ({
      id,
      x: id.startsWith("P") ? 150 : 450,
      y: 100 + i * 80
    }));

    setNodes(nodeArray);
    setResult("⚡ Graph Built");
    setCycle([]);
  };

  const analyzeWithAI = async (cycleNodes) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Deadlock cycle:
${cycleNodes.join(" -> ")}

Explain cause and best fix briefly.
`;

    const res = await model.generateContent(prompt);
    return res.response.text();
  } catch (err) {
    return "AI failed. Check API key or internet.";
  }
};

  const detectDeadlock = async () => {
    setLoading(true);

    const graph = {};
    edges.forEach(e => {
      if (!graph[e.from]) graph[e.from] = [];
      graph[e.from].push(e.to);
    });

    let visited = new Set();
    let stack = new Set();
    let cycleNodes = [];

    const dfs = (node, path = []) => {
      if (stack.has(node)) {
        cycleNodes = [...path, node];
        return true;
      }

      if (visited.has(node)) return false;

      visited.add(node);
      stack.add(node);

      for (let n of graph[node] || []) {
        if (dfs(n, [...path, node])) return true;
      }

      stack.delete(node);
      return false;
    };

    for (let node in graph) {
      if (dfs(node)) {
        setCycle(cycleNodes);

        const ai = await analyzeWithAI(cycleNodes);

        setResult(`
⚠️ DEADLOCK DETECTED

Cycle:
${cycleNodes.join(" → ")}

${ai}
        `);

        setLoading(false);
        return;
      }
    }

    setResult("✅ SYSTEM SAFE");
    setLoading(false);
  };

  const getNodePos = (id) => nodes.find(n => n.id === id);

  return (
    <div className="app">

      {/* LEFT PANEL */}
      <div className="panel left">
        <h2>System Input</h2>

        <textarea
          placeholder="P1->R1, R1->P2, P2->R2..."
          value={inputEdges}
          onChange={(e) => setInputEdges(e.target.value)}
        />

        <button onClick={buildGraph}>Build Graph</button>
        <button onClick={detectDeadlock}>Detect Deadlock</button>
      </div>

      {/* CENTER GRAPH */}
      <div className="panel center">
        <h2>Live Graph</h2>

        <svg width="100%" height="100%">

  {/* Arrow marker */}
  <defs>
    <marker
      id="arrow"
      markerWidth="10"
      markerHeight="10"
      refX="10"
      refY="5"
      orient="auto"
    >
      <polygon points="0 0, 10 5, 0 10" fill="#00f5a0" />
    </marker>

    <marker
      id="arrow-red"
      markerWidth="10"
      markerHeight="10"
      refX="10"
      refY="5"
      orient="auto"
    >
      <polygon points="0 0, 10 5, 0 10" fill="red" />
    </marker>
  </defs>

  {edges.map((e, i) => {
    const from = getNodePos(e.from);
    const to = getNodePos(e.to);
    if (!from || !to) return null;

    const isCycleEdge =
      cycle.includes(e.from) && cycle.includes(e.to);

    return (
      <line
        key={i}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={isCycleEdge ? "red" : "#00f5a0"}
        strokeWidth="2.5"
        markerEnd={`url(#${isCycleEdge ? "arrow-red" : "arrow"})`}
        className="edge-line"
      />
    );
  })}

  {nodes.map((n, i) => (
    <g key={i} className="node-group">
      <circle
        cx={n.x}
        cy={n.y}
        r="28"
        className={`node ${cycle.includes(n.id) ? "deadlock" : ""}`}
      />
      <text
        x={n.x}
        y={n.y}
        textAnchor="middle"
        dy=".3em"
        fill="white"
      >
        {n.id}
      </text>
    </g>
  ))}

</svg>
      </div>

      {/* RIGHT PANEL */}
      <div className="panel right">
        <h2>AI Engine</h2>

        {loading && <p className="loading">Analyzing...</p>}

        <pre className="output">{result}</pre>
      </div>
    </div>
  );
}

export default App;