import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Discover.css";

const OPENING_MESSAGE = "Hi! I want to build something cool with AI but I don't know where to start.";
const FALLBACK_REPLY = "Hey! What's something you spend a lot of time doing outside of school?";
const ERROR_REPLY = "Hmm, I lost my train of thought for a second. Can you say that again?";

const STAGE_LABELS = ["Explore interests", "Shape the idea", "Scope it down", "Your blueprint"];

function detectStageAdvance(replyText, currentStage) {
  const lower = replyText.toLowerCase();
  if (currentStage === 1 && /\b(build|building|creating?|exist(?:ing)?)\b/.test(lower)) return 2;
  if (currentStage === 2 && /\b(simplest|v1|one thing)\b/.test(lower)) return 3;
  if (currentStage === 3 && replyText.includes("[BLUEPRINT]")) return 4;
  return currentStage;
}

function parseBlueprint(body) {
  const get = (key) => {
    const re = new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`);
    const m = body.match(re);
    return m ? m[1].trim() : "";
  };
  const milestones = get("MILESTONES")
    .split("||")
    .map((chunk) => {
      const [title, learn] = chunk.split("|").map((s) => (s || "").trim());
      return title ? { title, learn } : null;
    })
    .filter(Boolean);

  return {
    projectName: get("PROJECT_NAME"),
    tagline: get("TAGLINE"),
    milestones,
    collegeDraft: get("COLLEGE_DRAFT"),
    collegeFinished: get("COLLEGE_FINISHED"),
  };
}

function splitMessage(content) {
  const match = content.match(/\[BLUEPRINT\]([\s\S]*?)\[\/BLUEPRINT\]/);
  if (!match) return { before: content, blueprint: null, after: "" };
  return {
    before: content.slice(0, match.index).trim(),
    blueprint: parseBlueprint(match[1]),
    after: content.slice(match.index + match[0].length).trim(),
  };
}

function SparkAvatar() {
  return (
    <div className="spark-avatar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="white" />
      </svg>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="discover-message ai">
      <SparkAvatar />
      <div className="message-bubble ai-bubble typing-bubble">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

function BlueprintCard({ blueprint }) {
  return (
    <div className="blueprint-card">
      <p className="blueprint-label">Your Blueprint</p>
      <h3 className="blueprint-name">{blueprint.projectName}</h3>
      <p className="blueprint-tagline">{blueprint.tagline}</p>

      <div className="blueprint-milestones">
        {blueprint.milestones.map((m, i) => (
          <div className="blueprint-milestone" key={i}>
            <span className="milestone-number">{i + 1}</span>
            <div>
              <p className="milestone-title">{m.title}</p>
              <p className="milestone-learn">{m.learn}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="blueprint-college">
        <p className="blueprint-college-heading">For college &amp; internship applications</p>
        <p className="blueprint-college-sub">
          Here's how to describe this project — right now, and once it's built:
        </p>
        <div className="college-box college-draft">
          <p className="college-label">Starting out</p>
          <p className="college-text">{blueprint.collegeDraft}</p>
        </div>
        <div className="college-box college-finished">
          <p className="college-label">When you finish</p>
          <p className="college-text">{blueprint.collegeFinished}</p>
        </div>
      </div>
    </div>
  );
}

export default function Discover() {
  const [messages, setMessages] = useState([]);
  const [stage, setStage] = useState(1);
  const [aiTurnCount, setAiTurnCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const opening = { role: "user", content: OPENING_MESSAGE, hidden: true };
      try {
        const res = await fetch("/api/spark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: OPENING_MESSAGE }] }),
        });
        const data = await res.json();
        if (cancelled) return;
        const reply = !data.error && data.reply ? data.reply : FALLBACK_REPLY;
        setMessages([opening, { role: "assistant", content: reply }]);
        setAiTurnCount(1);
        setStage((s) => detectStageAdvance(reply, s));
      } catch {
        if (cancelled) return;
        setMessages([opening, { role: "assistant", content: FALLBACK_REPLY }]);
        setAiTurnCount(1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch("/api/spark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      const reply = !data.error && data.reply ? data.reply : ERROR_REPLY;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!data.error) {
        setAiTurnCount((c) => c + 1);
        setStage((s) => detectStageAdvance(reply, s));
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: ERROR_REPLY }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      const lineHeight = 22;
      const maxHeight = lineHeight * 3 + 22;
      el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    }
  }

  const visibleMessages = messages.filter((m) => !m.hidden);
  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const showQuickReplies =
    !loading && stage < 4 && aiTurnCount <= 3 && lastMessage?.role === "assistant";

  return (
    <div className="discover">
      <header className="discover-header">
        <div className="discover-header-top">
          <Link to="/" className="discover-logo">
            pathfinder<span className="logo-dot">.</span>ai
          </Link>
        </div>
        <h1 className="discover-title">Build &amp; Learn</h1>
        <p className="discover-subtitle">
          Tell me what you're into — I'll help you find a project worth building.
        </p>
        <div className="discover-stages">
          {STAGE_LABELS.map((label, i) => {
            const stageNum = i + 1;
            const status = stageNum < stage ? "done" : stageNum === stage ? "active" : "default";
            return (
              <div key={label} className={`stage-pill stage-pill--${status}`}>
                {label}
              </div>
            );
          })}
        </div>
      </header>

      <main className="discover-thread">
        {visibleMessages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div className="discover-message user" key={i}>
                <div className="message-bubble user-bubble">{m.content}</div>
              </div>
            );
          }
          const { before, blueprint, after } = splitMessage(m.content);
          return (
            <div className="discover-message ai" key={i}>
              <SparkAvatar />
              <div className="ai-message-content">
                {before && <div className="message-bubble ai-bubble">{before}</div>}
                {blueprint && <BlueprintCard blueprint={blueprint} />}
                {after && <div className="message-bubble ai-bubble">{after}</div>}
              </div>
            </div>
          );
        })}

        {loading && <TypingIndicator />}

        {showQuickReplies && (
          <div className="quick-replies">
            <button className="quick-reply-btn" onClick={() => sendMessage("I'm not sure yet")}>
              I'm not sure yet
            </button>
            <button className="quick-reply-btn" onClick={() => sendMessage("Show me some examples")}>
              Show me some examples
            </button>
          </div>
        )}

        <div ref={threadEndRef} />
      </main>

      <footer className="discover-input-row">
        <textarea
          ref={textareaRef}
          className="discover-textarea"
          rows={1}
          placeholder="Type your answer…"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className="discover-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          Send
        </button>
      </footer>
    </div>
  );
}
