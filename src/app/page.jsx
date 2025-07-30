"use client";
import React from "react";

function MainComponent() {
  const [code, setCode] = useState("");
  const [theme, setTheme] = useState("light");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [correctedCode, setCorrectedCode] = useState("");
  const [analysisDetails, setAnalysisDetails] = useState("");
  const [errorHighlights, setErrorHighlights] = useState([]);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your coding companion. Need help with your code or just want a motivational quote? I'm here to help! 💻✨",
    },
  ]);
  const [output, setOutput] = useState("");
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    totalCorrections: 0,
    lastUsed: null,
  });
  const [showCorrected, setShowCorrected] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStats = localStorage.getItem("compilerStats");
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("compilerStats", JSON.stringify(stats));
    }
  }, [stats]);

  const handleStreamResponse = async (response, { onChunk, onFinish }) => {
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let message = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        message += chunk;
        if (onChunk) onChunk(chunk);
      }

      if (onFinish) onFinish(message);
    } catch (error) {
      console.error("Error reading stream:", error);
      throw error;
    }
  };

  const validateCode = (code, language) => {
    const patterns = {
      c: /(#include|int\s+main|void\s+main)/i,
      python:
        /(def\s+|import\s+|print\(|if\s+__name__\s*==\s*('|")__main__('|"))/i,
      java: /(class\s+|public\s+static|void\s+main)/i,
      javascript: /(const|let|var|function|=>)/i,
      cpp: /(#include|using\s+namespace|class\s+.*\{)/i,
      html: /(<html|<!DOCTYPE|<head|<body)/i,
      css: /([.#][a-zA-Z].*\{|\}|@media)/i,
      php: /(<\?php|\$[a-zA-Z_])/i,
      ruby: /(def\s+|require|puts\s|class\s)/i,
      swift: /(import\s+Foundation|var\s+|func\s+|class\s+)/i,
      kotlin: /(fun\s+|class\s+|val\s+|var\s+)/i,
      rust: /(fn\s+|use\s+|let\s+mut|impl)/i,
      go: /(package\s+|func\s+|import\s+)/i,
      sql: /(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)/i,
      typescript: /(interface|type|class\s+.*\{)/i,
    };

    if (!code.trim()) return true;
    if (!patterns[language]) return true;
    return patterns[language].test(code);
  };

  const getPlaceholder = (lang) => {
    const languageName = lang.charAt(0).toUpperCase() + lang.slice(1);
    return `Write ${languageName} code here...`;
  };

  const analyzeCode = async () => {
    if (!code.trim()) {
      setError("Please enter some code first.");
      return;
    }

    if (!validateCode(code, selectedLanguage)) {
      setError(
        `This doesn't appear to be valid ${selectedLanguage} code. Please check your code or select the correct language.`
      );
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCorrectedCode("");
    setAnalysisDetails("");
    setErrorHighlights([]);

    try {
      const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Analyze this ${selectedLanguage} code and provide corrections. Include the exact character positions of each error.

First provide your analysis in this exact format:
Error Analysis:
[For each error include: 
❌ [Line X] Error description
START_POS: <number>
END_POS: <number>
]

Then provide the corrected code without any comments or language markers:
CORRECTED CODE:
[corrected code without any comments or formatting]

Original code:
${code}`,
            },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze code");
      }

      await handleStreamResponse(response, {
        onChunk: (chunk) => {
          setAnalysisDetails((prev) => prev + chunk);
          const matches = chunk.matchAll(/START_POS: (\d+)\nEND_POS: (\d+)/g);
          const newHighlights = Array.from(matches).map((match) => ({
            start: parseInt(match[1]),
            end: parseInt(match[2]),
          }));
          if (newHighlights.length > 0) {
            setErrorHighlights((prev) => [...prev, ...newHighlights]);
          }
        },
        onFinish: (message) => {
          const parts = message.split("CORRECTED CODE:");
          if (parts.length > 1) {
            setAnalysisDetails(parts[0].trim());
            setCorrectedCode(parts[1].trim());
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: message },
            ]);
          }
          setIsProcessing(false);
        },
      });
    } catch (err) {
      setError("Failed to analyze code. Please try again.");
      setIsProcessing(false);
    }
  };

  const applyFix = () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const content = lastMessage.content;
    const correctedCodeMatch = content.split("CORRECTED CODE:\n")[1];

    if (correctedCodeMatch) {
      setCode(correctedCodeMatch.trim());
      setErrorHighlights([]);
      setShowCorrected(true);
    }
  };

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const executeCode = async () => {
    try {
      setOutput("");
      setIsProcessing(true);
      setAnalysisDetails("");

      if (selectedLanguage === "javascript") {
        const context = {
          console: {
            log: (...args) => {
              const formatted = args
                .map((arg) =>
                  typeof arg === "object"
                    ? JSON.stringify(arg, null, 2)
                    : String(arg)
                )
                .join(" ");
              setOutput((prev) => prev + (prev ? "\n" : "") + formatted);
            },
          },
          Math: Math,
          Date: Date,
          Array: Array,
          Object: Object,
          String: String,
          Number: Number,
          Boolean: Boolean,
          Error: Error,
          JSON: JSON,
          RegExp: RegExp,
          Promise: Promise,
          setTimeout: setTimeout,
          clearTimeout: clearTimeout,
          undefined: undefined,
          nullValue: null,
        };

        try {
          const fn = new Function(...Object.keys(context), code);
          await fn(...Object.values(context));
        } catch (err) {
          setOutput(`JavaScript Error: ${err.message}`);
        }
      } else {
        const response = await fetch(
          "/integrations/chat-gpt/conversationgpt4",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                {
                  role: "system",
                  content:
                    "You are a code execution simulator. Only output exactly what would appear in the console/terminal. No explanations, no markdown, no additional text.",
                },
                {
                  role: "user",
                  content: `Execute this ${selectedLanguage} code and show ONLY the console/terminal output:\n\n${code}`,
                },
              ],
              stream: true,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to execute code");
        }

        await handleStreamResponse(response, {
          onChunk: (chunk) => setOutput((prev) => prev + chunk),
          onFinish: () => {
            setIsProcessing(false);
            setMessages((prev) => [...prev]);
          },
        });
      }
    } catch (err) {
      setOutput(`Runtime Error: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleOutputChange = (e) => {
    setOutput(e.target.value);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessages = [...messages, { role: "user", content: inputMessage }];
    setMessages(newMessages);
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a friendly coding assistant that provides help with code, debugging, and shares motivational programming quotes. Keep responses concise and helpful. Include emojis occasionally to make the conversation engaging.",
            },
            ...newMessages,
          ],
          stream: true,
        }),
      });

      await handleStreamResponse(response, {
        onChunk: (chunk) => {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + chunk },
              ];
            } else {
              return [...prev, { role: "assistant", content: chunk }];
            }
          });
        },
        onFinish: () => {
          setIsTyping(false);
        },
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}. Please try again! 🔄`,
        },
      ]);
      setIsTyping(false);
    }
  };

  // Add new state for code blocks in chat
  const [codeBlockRefs] = useState({});

  const formatMessageContent = (content) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: "code",
        language: match[1] || "plaintext",
        content: match[2].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    return parts;
  };

  const CodeBlock = ({ language, content }) => {
    const copyCode = async () => {
      try {
        await navigator.clipboard.writeText(content);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    };

    return (
      <div
        className={`my-2 rounded-lg overflow-hidden ${
          theme === "dark" ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        <div className="flex justify-between items-center px-4 py-2 bg-gray-700 text-white">
          <span className="text-sm font-mono">{language}</span>
          <button
            onClick={copyCode}
            className="px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded flex items-center gap-2"
          >
            <i className="fas fa-copy"></i>
            Copy
          </button>
        </div>
        <pre
          className={`p-4 overflow-x-auto ${
            theme === "dark" ? "text-gray-100" : "text-gray-800"
          }`}
        >
          <code className="font-mono text-sm">{content}</code>
        </pre>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      }`}
    >
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Self-Correcting Compiler</h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={toggleTheme}
              className={`theme-toggle px-4 py-2 rounded-md ${
                theme === "light"
                  ? "bg-gray-900 text-white hover:bg-gray-700"
                  : "bg-white text-gray-900 hover:bg-gray-100"
              } font-inter`}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
        <div className="mb-6">
          <div className="grid grid-cols-[180px_1fr_1fr] gap-4">
            <div className="flex flex-col space-y-1 max-h-[280px] overflow-y-auto no-scrollbar w-[180px]">
              {[
                { id: "javascript", label: "JavaScript", icon: "🟨" },
                { id: "python", label: "Python", icon: "🐍" },
                { id: "java", label: "Java", icon: "☕" },
                { id: "cpp", label: "C++", icon: "🔵" },
                { id: "c", label: "C", icon: "©️" },
                { id: "html", label: "HTML", icon: "🌐" },
                { id: "css", label: "CSS", icon: "🎨" },
                { id: "nodejs", label: "Node.js", icon: "📦" },
                { id: "reactjs", label: "React.js", icon: "💚" },
                { id: "expressjs", label: "Express.js", icon: "🚂" },
                { id: "typescript", label: "TypeScript", icon: "💙" },
                { id: "php", label: "PHP", icon: "🐘" },
                { id: "ruby", label: "Ruby", icon: "💎" },
                { id: "swift", label: "Swift", icon: "🦅" },
                { id: "kotlin", label: "Kotlin", icon: "🟪" },
                { id: "rust", label: "Rust", icon: "🦀" },
                { id: "go", label: "Go", icon: "🔷" },
                { id: "sql", label: "SQL", icon: "🗃️" },
                { id: "mongodb", label: "MongoDB", icon: "🍃" },
                { id: "angular", label: "Angular", icon: "🅰️" },
                { id: "vue", label: "Vue.js", icon: "💚" },
                { id: "sass", label: "Sass", icon: "💅" },
                { id: "less", label: "Less", icon: "🔣" },
                { id: "nextjs", label: "Next.js", icon: "▲" },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    setSelectedLanguage(lang.id);
                    setOutput("");
                    setCode("");
                    setErrorHighlights([]);
                  }}
                  className={`language-button px-3 py-1.5 rounded-md font-mono text-sm ${
                    selectedLanguage === lang.id
                      ? "bg-blue-600 text-white"
                      : theme === "light"
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                      : "bg-gray-800 hover:bg-gray-700 text-white"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 text-center text-lg">{lang.icon}</span>
                    <span className="whitespace-nowrap">{lang.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <div
              className={`rounded-lg border ${
                theme === "light" ? "border-gray-200" : "border-gray-700"
              }`}
            >
              <div
                className={`flex justify-between items-center border-b ${
                  theme === "light" ? "border-gray-200" : "border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold p-4">Code Input</h2>
                  <div
                    className={`px-3 py-1 rounded-md ${
                      theme === "light"
                        ? "bg-gray-100 text-gray-900"
                        : "bg-gray-800 text-white"
                    }`}
                  >
                    <span className="text-sm font-mono">
                      {selectedLanguage}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mr-4">
                  <button
                    onClick={() => {
                      setCode("");
                      setErrorHighlights([]);
                    }}
                    className="button-hover px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    title="Clear code"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(code);
                      } catch (err) {
                        console.error("Failed to copy:", err);
                      }
                    }}
                    className="button-hover px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    title="Copy code"
                  >
                    Copy
                  </button>
                  <button
                    onClick={executeCode}
                    className="run-button button-hover px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold"
                  >
                    ▶ Run
                  </button>
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError(null);
                    setErrorHighlights([]);
                  }}
                  className={`w-full h-[300px] p-4 font-mono text-sm outline-none resize-none ${
                    theme === "light"
                      ? "bg-gray-50 text-gray-900"
                      : "bg-gray-800 text-white"
                  }`}
                  placeholder={getPlaceholder(selectedLanguage)}
                  spellCheck="false"
                  autoCapitalize="off"
                  autoCorrect="off"
                  name="code-input"
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const start = e.target.selectionStart;
                      const end = e.target.selectionEnd;
                      const newValue =
                        code.substring(0, start) + "  " + code.substring(end);
                      setCode(newValue);
                      setTimeout(() => {
                        e.target.selectionStart = e.target.selectionEnd =
                          start + 2;
                      }, 0);
                    }
                  }}
                />
                <div
                  className={`absolute bottom-2 right-2 text-xs ${
                    theme === "light" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Lines: {code.split("\n").length} | Characters: {code.length}
                </div>
              </div>
            </div>
            <div
              className={`rounded-lg border ${
                theme === "light" ? "border-gray-200" : "border-gray-700"
              }`}
            >
              <div
                className={`flex justify-between items-center border-b ${
                  theme === "light" ? "border-gray-200" : "border-gray-700"
                }`}
              >
                <h2 className="text-xl font-bold p-4">Output</h2>
                <div
                  className={`mr-4 px-3 py-1 rounded-md ${
                    theme === "light"
                      ? "bg-gray-100 text-gray-900"
                      : "bg-gray-800 text-white"
                  }`}
                >
                  <span className="text-sm font-mono">{selectedLanguage}</span>
                </div>
              </div>
              <div
                className={`w-full h-[300px] p-4 font-mono text-sm rounded-b-lg overflow-auto ${
                  theme === "light" ? "bg-gray-50" : "bg-gray-800"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center h-full">
                    <div
                      className={`animate-spin rounded-full h-8 w-8 border-4 border-t-transparent ${
                        theme === "light" ? "border-gray-900" : "border-white"
                      }`}
                    ></div>
                  </div>
                ) : (
                  <textarea
                    value={output}
                    onChange={handleOutputChange}
                    className={`w-full h-full bg-transparent outline-none resize-none font-mono text-sm ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                    placeholder="Enter or view output here..."
                    spellCheck="false"
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={analyzeCode}
              disabled={isProcessing}
              className={`analyze-button px-6 py-2 rounded-md font-inter disabled:opacity-50 ${
                theme === "light"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-900"
              }`}
            >
              {isProcessing ? "Analyzing..." : "Analyze Code"}
            </button>
            {error && (
              <div
                className={`mt-4 p-4 rounded-lg ${
                  theme === "light"
                    ? "bg-red-100 text-red-900"
                    : "bg-red-900 text-red-100"
                }`}
              >
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={`rounded-lg border p-4 ${
              theme === "light" ? "border-gray-200" : "border-gray-700"
            }`}
          >
            <h2 className="text-xl font-bold mb-4">Error Analysis</h2>
            <div
              className={`rounded-lg p-4 font-mono ${
                theme === "light"
                  ? "bg-black text-green-400"
                  : "bg-gray-900 text-green-400"
              } terminal-container`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">$</div>
                  <div className="animate-pulse">Analyzing code...</div>
                </div>
              ) : (
                <div className="terminal-output">
                  <div className="flex items-start">
                    <span className="mr-2">$</span>
                    <pre className="whitespace-pre-wrap break-words flex-1 terminal-text">
                      {analysisDetails ||
                        "No errors found. Your code looks good!"}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              theme === "light" ? "border-gray-200" : "border-gray-700"
            }`}
          >
            <h2 className="text-xl font-bold mb-4">Corrected Code</h2>
            <div
              className={`rounded-lg p-4 ${
                theme === "light"
                  ? "bg-gray-50 text-gray-900"
                  : "bg-gray-800 text-white"
              }`}
            >
              <button
                onClick={applyFix}
                disabled={messages.length === 0}
                className={`button-hover w-full px-4 py-2 rounded-md shadow-lg font-bold ${
                  messages.length > 0
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                }`}
              >
                Apply Fix
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-4 right-4 z-50">
        {!showChat ? (
          <button
            onClick={() => setShowChat(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110"
          >
            <i className="fas fa-comments text-2xl"></i>
          </button>
        ) : (
          <div
            className={`w-[350px] h-[500px] rounded-lg shadow-xl flex flex-col ${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-bold">Coding Assistant</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : theme === "dark"
                        ? "bg-gray-700 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {formatMessageContent(msg.content).map((part, i) =>
                      part.type === "code" ? (
                        <CodeBlock
                          key={i}
                          language={part.language}
                          content={part.content}
                        />
                      ) : (
                        <div key={i}>{part.content}</div>
                      )
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      theme === "dark"
                        ? "bg-gray-700 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask me anything about coding..."
                  className={`flex-1 p-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <button
                  onClick={sendMessage}
                  disabled={isTyping || !inputMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        textarea {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          tab-size: 2;
          caret-color: currentColor !important;
        }

        textarea::placeholder {
          color: ${theme === "light" ? "#6B7280" : "#9CA3AF"};
        }

        textarea::-webkit-scrollbar {
          display: none;
        }

        textarea {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        pre {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        }

        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 0.5;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
          }
        }

        .button-hover {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .button-hover:hover {
          transform: translateY(-2px) rotate(1deg);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }

        .button-hover:active {
          transform: translateY(1px) rotate(-1deg);
        }

        .button-hover::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(255, 255, 255, 0.5);
          opacity: 0;
          border-radius: 100%;
          transform: scale(1);
          animation: ripple 0.6s ease-out;
        }

        .run-button {
          animation: pulse 2s infinite ease-in-out;
        }

        .run-button:hover {
          animation: glow 1.5s infinite ease-in-out;
        }

        .language-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .language-button:hover {
          transform: translateY(-2px) scale(1.02);
        }

        .language-button:active {
          transform: translateY(1px) scale(0.98);
        }

        .analyze-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .analyze-button:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }

        .analyze-button:active:not(:disabled) {
          transform: translateY(1px) scale(0.95);
        }

        .theme-toggle {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .theme-toggle:hover {
          transform: rotate(180deg) scale(1.1);
        }

        .terminal-container {
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          line-height: 1.5;
          position: relative;
        }

        .terminal-container::-webkit-scrollbar {
          width: 8px;
        }

        .terminal-container::-webkit-scrollbar-track {
          background: ${theme === "light" ? "#1a1a1a" : "#2d2d2d"};
          border-radius: 4px;
        }

        .terminal-container::-webkit-scrollbar-thumb {
          background: ${theme === "light" ? "#4a4a4a" : "#666"};
          border-radius: 4px;
        }

        .terminal-text {
          font-size: 14px;
        }

        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .terminal-output::after {
          content: '▋';
          animation: cursor-blink 1s infinite;
          margin-left: 2px;
          color: ${theme === "light" ? "#4ade80" : "#4ade80"};
        }

        .code-block {
          position: relative;
          transition: all 0.2s ease;
        }

        .code-block:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .copy-button {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .code-block:hover .copy-button {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

export default MainComponent;