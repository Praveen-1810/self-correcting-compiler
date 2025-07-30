"use client";
import React from "react";

import { useHandleStreamResponse } from "../utilities/runtime-helpers";

function MainComponent() {
  const [code, setCode] = useState("");
  const [theme, setTheme] = useState("light");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [correctedCode, setCorrectedCode] = useState("");
  const [analysisDetails, setAnalysisDetails] = useState("");
  const [stats, setStats] = useState({
    corrections: 0,
    errorsFound: 0,
    accuracy: 0,
  });
  const [streamingResponse, setStreamingResponse] = useState("");
  const [messages, setMessages] = useState([]);
  const [output, setOutput] = useState("");
  const [consoleOutput, setConsoleOutput] = useState([]);

  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingResponse,
    onFinish: (message) => {
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
      const analysis = message.split("CORRECTED CODE:")[0].trim();
      setAnalysisDetails(analysis);
      setStreamingResponse("");
      setIsProcessing(false);
    },
  });

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
    return `Enter your ${languageName} code`;
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

    try {
      const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Analyze this ${selectedLanguage} code and provide corrections.

First provide your analysis with this exact format:
Error Analysis:
[your analysis here]

Then provide ONLY the corrected code with this exact format:
CORRECTED CODE:
[corrected code only, no comments, no markdown, no explanations]

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

      handleStreamResponse(response);
      setStats((prev) => ({ ...prev, errorsFound: prev.errorsFound + 1 }));
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
      const newCode = correctedCodeMatch
        .replace(/^\s*$\n/gm, "")
        .split("\n")
        .filter((line) => {
          const trimmedLine = line.trim();
          return (
            trimmedLine.length > 0 &&
            !trimmedLine.startsWith("//") &&
            !trimmedLine.startsWith("/*") &&
            !trimmedLine.startsWith("*/")
          );
        })
        .join("\n")
        .trim();

      setCode(newCode);
      setCorrectedCode(newCode);
      setStats((prev) => ({
        corrections: prev.corrections + 1,
        errorsFound: prev.errorsFound,
        accuracy: Math.round(((prev.corrections + 1) / prev.errorsFound) * 100),
      }));
    }
  };

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const executeCode = () => {
    try {
      setOutput("");
      setConsoleOutput([]);

      if (selectedLanguage === "html") {
        setOutput("HTML will render in browser");
        return;
      } else if (selectedLanguage === "css") {
        setOutput("CSS will apply to elements");
        return;
      }

      const sandbox = {
        console: {
          log: (...args) => {
            const formattedArgs = args
              .map((arg) => {
                if (typeof arg === "object") {
                  return JSON.stringify(arg, null, 2);
                }
                return String(arg);
              })
              .join(" ");
            setOutput((prev) => prev + (prev ? "\n" : "") + formattedArgs);
          },
        },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Error,
        JSON,
        RegExp,
        undefinedValue: undefined,
        nullValue: null,
      };

      try {
        const evaluator = new Function(...Object.keys(sandbox), code);
        evaluator(...Object.values(sandbox));
      } catch (err) {
        setOutput(`Error: ${err.message}`);
      }
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
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
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-inter"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
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
                { id: "reactjs", label: "React.js", icon: "⚛️" },
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
                  }}
                  className={`px-3 py-1.5 rounded-md font-mono text-sm transition-all duration-200 ${
                    selectedLanguage === lang.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 text-center text-lg">{lang.icon}</span>
                    <span className="whitespace-nowrap">{lang.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold p-4">Code Input</h2>
                  <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <span className="text-sm font-mono">
                      {selectedLanguage}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mr-4">
                  <button
                    onClick={() => setCode("")}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200"
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
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all duration-200"
                    title="Copy code"
                  >
                    Copy
                  </button>
                  <button
                    onClick={executeCode}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transform hover:scale-105 transition-all duration-200 font-bold"
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
                  }}
                  className="w-full h-[300px] p-4 font-mono text-sm outline-none resize-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
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
                <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-600">
                  Lines: {code.split("\n").length} | Characters: {code.length}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold p-4">Output</h2>
                <div className="mr-4 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <span className="text-sm font-mono">{selectedLanguage}</span>
                </div>
              </div>
              <div className="w-full h-[300px] p-4 font-mono text-sm bg-gray-50 dark:bg-gray-800 rounded-b-lg overflow-auto">
                {output ? (
                  <pre className="whitespace-pre-wrap">{output}</pre>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    Click Run to see output...
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={analyzeCode}
              disabled={isProcessing}
              className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md font-inter hover:opacity-80 disabled:opacity-50"
            >
              {isProcessing ? "Analyzing..." : "Analyze Code"}
            </button>
            {error && (
              <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xl font-bold mb-4">Error Analysis</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              {isProcessing ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-900 dark:border-white border-t-transparent"></div>
                </div>
              ) : (
                <div className="font-mono text-sm whitespace-pre-wrap">
                  {analysisDetails}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xl font-bold mb-4">Corrected Code</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="font-mono text-sm whitespace-pre-wrap mb-4">
                {correctedCode}
              </div>
              {messages.length > 0 && (
                <button
                  onClick={applyFix}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg font-bold"
                >
                  Apply Fix
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-8 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xl font-bold mb-4">Learning Progress</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Errors Found
              </div>
              <div className="text-2xl font-bold">{stats.errorsFound}</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Fixed
              </div>
              <div className="text-2xl font-bold">{stats.corrections}</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Fix Rate
              </div>
              <div className="text-2xl font-bold">{stats.accuracy}%</div>
            </div>
          </div>
        </div>
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
          color: #6B7280;
        }
        
        .dark textarea::placeholder {
          color: #9CA3AF;
        }

        textarea::-webkit-scrollbar {
          display: none;
        }

        textarea {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .token.comment { color: #6a9955; }
        .token.string { color: #ce9178; }
        .token.number { color: #b5cea8; }
        .token.keyword { color: #569cd6; }
        .token.function { color: #dcdcaa; }
        .token.operator { color: #d4d4d4; }
        .token.class-name { color: #4ec9b0; }
        .token.property { color: #9cdcfe; }
        .token.punctuation { color: #d4d4d4; }

        .dark pre, .dark code {
          color: #d4d4d4;
        }
      `}</style>
    </div>
  );
}

export default MainComponent;