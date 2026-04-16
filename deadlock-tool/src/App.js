import "./App.css";
import { useState, useEffect, useCallback } from "react";

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [cycle, setCycle] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [removedEdge, setRemovedEdge] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [redoStack, setRedoStack] = useState([]);
  const addNode = (type) => {
  const count = nodes.filter(n => n.type === type).length + 1;
  const id = type + count;

  const newNodes = [
    ...nodes,
    {
      id,
      type,
      x: type === "P" ? 200 : 600,
      y: 150 + nodes.length * 70
    }
  ];

  saveHistory(newNodes, edges);
  // 🔥 ADD MESSAGE
  setResult({
    type: "info",
    message: `${type === "P" ? "Process" : "Resource"} added (${id})`
  });
};
  const handleMove = (e) => {
    if (!dragging) return;

    const rect = e.target.closest("svg").getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes(prev =>
      prev.map(n => (n.id === dragging ? { ...n, x, y } : n))
    );
  };

const handleNodeClick = (id) => {
  if (!selected) {
    setSelected(id);
  } else {
    if (selected !== id) {

      const from = getNode(selected);
      const to = getNode(id);

      // 🛑 SAFETY CHECK (VERY IMPORTANT)
      if (!from || !to) {
        setResult({ type: "info", message: "Invalid node selection" });
        setSelected(null);
        return;
      }

      // ❌ block same type
      if (from.type === to.type) {
        setResult({ type: "error", message: "Invalid: only P→R or R→P allowed" });
        setSelected(null);
        return;
      }

      // ❌ block duplicate edge
      const exists = edges.some(
        e => e.from === selected && e.to === id
      );

      if (exists) {
        setResult({ type: "error", message: "Edge already exists"});
        setSelected(null);
        return;
      }

      // ✅ add edge
      const newEdges = [...edges, { from: selected, to: id }];
      saveHistory(nodes, newEdges);

      let message = "";

if (from.type === "P" && to.type === "R") {
  message = `Process ${from.id} is requesting Resource ${to.id}`;
} else if (from.type === "R" && to.type === "P") {
  message = `Resource ${from.id} is allocated to Process ${to.id}`;
}

setResult({ type: "info", message });
    }

    setSelected(null);
  }
};

  const detectDeadlock = useCallback((manual=false)=> {
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
  // extract only processes from cycle
  const processes = [...new Set(cycleNodes.filter(n => n.startsWith("P")))];

if (processes.length <= 1) {
  continue;
}

  setCycle(cycleNodes);

  setResult({
  type: "deadlock",
  cycle: cycleNodes,
  processes: processes,
  suggestions: [
    "Terminate one process",
    "Preempt a resource",
    "Break circular wait"
  ]
});

  return;
}
if (manual) {
  setCycle([]);
  setResult({ type: "safe", message: "No Deadlock" });
} else {
  setCycle([]);
}
    }

    // ✅ ONLY HERE
  setCycle([]);
  // ❌ don't override if user action just happened

if (!result || result.type === "deadlock") {
  setResult({ type: "safe", message: "No Deadlock" });
}

}, [edges]);

  const getNode = (id) => nodes.find(n => n.id === id);
  const resolveDeadlock = () => {
  if (cycle.length < 2) return;

  setResolving(true);

  const edgeToRemove = edges.find(e =>
  cycle.some((node, i) =>
    node === e.from &&
    cycle[(i + 1) % cycle.length] === e.to
  )

)
if (!edgeToRemove) {
  setResult({ type: "resolved", message: "No removable edge found"});
  setResolving(false);
  return;
};


  setRemovedEdge(edgeToRemove);

  setTimeout(() => {
    const newEdges = edges.filter(
      (e) => !(e.from === edgeToRemove.from && e.to === edgeToRemove.to)
    );

    saveHistory(nodes, newEdges);
    setCycle([]);
    setRemovedEdge(null);
    setResolving(false);
    setResult({ type: "resolved", message: "Deadlock Resolved" });
  }, 2000);
};
const saveHistory = (newNodes, newEdges) => {
  setHistory(prev => [...prev, { nodes, edges }]);
  setRedoStack([]); // clear redo on new action
  setNodes(newNodes);
  setEdges(newEdges);
};
const undo = () => {
  if (history.length === 0) return;

  const last = history[history.length - 1];

  setRedoStack(prev => [...prev, { nodes, edges }]);
  setNodes(last.nodes);
  setEdges(last.edges);
  setHistory(prev => prev.slice(0, -1));

  setCycle([]);
  setRemovedEdge(null);
  setResolving(false);
  setResult({ type: "info", message: "Undo applied" });

};
const redo = () => {
  if (redoStack.length === 0) return;

  const next = redoStack[redoStack.length - 1];

  setHistory(prev => [...prev, { nodes, edges }]);

  setNodes(next.nodes);
  setEdges(next.edges);

  setRedoStack(prev => prev.slice(0, -1));

  // 🔥 RESET UI STATE
  setCycle([]);
  setRemovedEdge(null);
  setResolving(false);
  setResult({ type: "info", message: "Redo applied" });
};
const reset = () => {
  setNodes([]);
  setEdges([]);
  setCycle([]);
  setHistory([]);
  setRedoStack([]);

  // ✅ show reset message only
  setResult({ type: "info", message: "System reset" });
};
useEffect(() => {
  // ❌ don't run if no edges
  if (edges.length === 0) return;

  detectDeadlock();
}, [detectDeadlock, edges]);
useEffect(() => {
  if (!result) return;

  // ❌ don't auto-hide deadlock popup
  if (result.type === "deadlock") return;

  const timer = setTimeout(() => {
    setResult(null);
  }, 1800);

  return () => clearTimeout(timer);
}, [result]);
const getEdgePoint = (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (from.type === "P") {
  const r = 30;
  return {
    x: from.x + (dx / dist) * r,
    y: from.y + (dy / dist) * r
  };
} else {
  // 🔥 proper rectangle edge intersection
  const w = 35;
  const h = 25;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let scale;

  if (absDx / w > absDy / h) {
    scale = w / absDx;
  } else {
    scale = h / absDy;
  }

  return {
    x: from.x + dx * scale,
    y: from.y + dy * scale
  };
}
};

  return (
  <div className="app">

    {/* HEADER */}
    <div className="header">
      <div className="title">Deadlock Detection Tool</div>

      <div className="controls">
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button onClick={reset}>Reset</button>
        <button className="dete" onClick={() => detectDeadlock(true)}>
  Detect
</button>
        <button className="primary" onClick={resolveDeadlock}>
          Resolve
        </button>
      </div>
    </div>

    {/* MAIN */}
    <div className="main">

      {/* SIDEBAR */}
      <div className="sidebar">
        <button onClick={() => addNode("P")}>+ Process</button>
        <button onClick={() => addNode("R")}>+ Resource</button>
      </div>

      {/* CANVAS */}
      <div className="canvas">
        <svg
          width="100%"
          height="100%"
          onMouseMove={handleMove}
          onMouseUp={() => setDragging(null)}
          onClick={() => setSelected(null)}
        >

          {/* ARROWS (FIXED) */}
         <defs>
  <marker
    id="arrow"
    markerWidth="12"
    markerHeight="12"
    refX="12"     // 🔥 push arrow OUTSIDE node
    refY="6"
    orient="auto"
    markerUnits="strokeWidth"
  >
    <path d="M0,0 L12,6 L0,12 Z" fill="#00b9e3" />
  </marker>

  <marker
    id="arrow-red"
    markerWidth="12"
    markerHeight="12"
    refX="12"
    refY="6"
    orient="auto"
    markerUnits="strokeWidth"
  >
    <path d="M0,0 L12,6 L0,12 Z" fill="#ff3b30" />
  </marker>
</defs>

          {/* GRID */}
          {[...Array(50)].map((_, i) => (
            <line key={"v"+i} x1={i * 40} y1="0" x2={i * 40} y2="100%" stroke="#eee" />
          ))}
          {[...Array(30)].map((_, i) => (
            <line key={"h"+i} y1={i * 40} x1="0" y2={i * 40} x2="100%" stroke="#eee" />
          ))}

          {/* EDGES */}
          {edges.map((e, i) => {
            const from = getNode(e.from);
            const to = getNode(e.to);
            if (!from || !to) return null;


            const isCycle = cycle.some(
              (node, index) =>
                node === e.from &&
                cycle[(index + 1) % cycle.length] === e.to
            );

            const isRemoved =
              removedEdge &&
              e.from === removedEdge.from &&
              e.to === removedEdge.to;
            const start = getEdgePoint(from, to);
                const end = getEdgePoint(to, from);

                const dx = (start.x + end.x) / 2;
                const dy = (start.y + end.y) / 2 - 60;
            return (
              <path
                key={i}
                
                d={`M ${start.x} ${start.y} Q ${dx} ${dy} ${end.x} ${end.y}`}
                stroke={
                  isRemoved
                    ? "#aaa"
                    : isCycle
                    ? "#ff3b30"
                    : "#00b9e3"
                }
                fill="none"
                strokeWidth={isCycle ? 4 : 2.5}
                markerEnd={`url(#${isCycle ? "arrow-red" : "arrow"})`}
                strokeDasharray={isRemoved ? "5,5" : "none"}
                opacity={isRemoved ? 0.5 : 1}
                strokeLinecap="round"
                className="edge"
              />
            );
          })}

          {/* FLOW ANIMATION */}
          {edges.map((e, i) => {
            const from = getNode(e.from);
            const to = getNode(e.to);
            if (!from || !to) return null;

            const start = getEdgePoint(from, to);
const end = getEdgePoint(to, from);

const dx = (start.x + end.x) / 2;
const dy = (start.y + end.y) / 2 - 60;

return (
  <circle key={"flow"+i} r="3" fill="#00b9e3">
    <animateMotion
      dur="2s"
      repeatCount="indefinite"
      path={`M ${start.x} ${start.y} Q ${dx} ${dy} ${end.x} ${end.y}`}
    />
  </circle>
);
          })}

          {/* RESOLVE ANIMATION */}
          {resolving &&
            edges.map((e, i) => {
              const from = getNode(e.from);
              const to = getNode(e.to);
              if (!from || !to) return null;

              return (
                <circle key={"rev"+i} r="4" fill="#999">
                  <animateMotion
                    dur="1.5s"
                    repeatCount="1"
                    path={`M ${to.x} ${to.y} L ${from.x} ${from.y}`}
                  />
                </circle>
              );
            })}

          {/* NODES */}
          {nodes.map(n => (
  <g
  key={n.id}
  transform={`translate(${n.x}, ${n.y})`}
  onMouseDown={(e) => {
    e.stopPropagation();       // ✅ IMPORTANT
    setDragging(n.id);
  }}
  onClick={(e) => {
    e.stopPropagation();       // ✅ IMPORTANT
    handleNodeClick(n.id);
  }}
  style={{ cursor: "pointer" }}
>
    {n.type === "R" ? (
  <rect
    x={-35}
    y={-25}
    width="70"
    height="50"
    rx="10"
    className={
      cycle.includes(n.id)
        ? "deadlock"
        : selected === n.id
        ? "selected"
        : "node"
    }
  />
) : (
  <circle
    r="30"
    className={
      cycle.includes(n.id)
        ? "deadlock"
        : selected === n.id
        ? "selected"
        : "node"
    }
  />
)}

    <text
  textAnchor="middle"
  dominantBaseline="middle"
  style={{
    pointerEvents: "none",
    fill: cycle.includes(n.id) ? "white" : "#1d1d1f"
  }}
>
  {n.id}
</text>
  </g>
))}

        </svg>
      </div>

    </div>

    {/* STATUS BAR (CLEAN) */}

    {result && result.type === "deadlock" && (
  <div className="island danger">

    <div className="title">⚠ Deadlock Detected</div>

    <div className="section">
      <b>Cycle:</b> {result.cycle.join(" → ")}
    </div>

    <div className="section">
      <b>Processes:</b> {result.processes.join(", ")}
    </div>

    <div className="section">
      <b>Suggestions:</b>
      <ul>
        {result.suggestions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>

  </div>
)}
    {/* POPUP */}
    {result?.type === "resolved" && (
  <div className="popup">Deadlock Resolved ✅</div>
)}
{result && result.type !== "deadlock" && (
  <div className={`island ${result.type}`}>
    {result.message}
  </div>
)}
    
  </div>
  
);
}

export default App;