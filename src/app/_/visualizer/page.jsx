"use client";
import React, { useState, useEffect } from "react";
import CodeVisualizer from "../../components/code-visualizer";

function CodeVisualizer({ code = "", theme = "light" }) {
  const [step, setStep] = useState(0);
  const [executionSteps, setExecutionSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;

    const analyzeCode = async () => {
      setLoading(true);
      setError(null);
      try {
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
                    "You are a code execution simulator. Analyze the code and provide step-by-step execution state including frames (function calls), variables, and object references in memory.",
                },
                {
                  role: "user",
                  content: `Analyze this code and provide execution steps with stack frames, variables, and object references:\n\n${code}`,
                },
              ],
              json_schema: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        lineNumber: { type: "number" },
                        code: { type: "string" },
                        frames: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              variables: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    name: { type: "string" },
                                    value: { type: "string" },
                                    type: { type: "string" },
                                    id: { type: "string" },
                                  },
                                },
                              },
                            },
                          },
                        },
                        objects: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              type: { type: "string" },
                              value: { type: "string" },
                              references: {
                                type: "array",
                                items: { type: "string" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to analyze code");
        }

        const data = await response.json();
        setExecutionSteps(data.result.steps);
      } catch (err) {
        setError("Failed to analyze code");
        console.error(err);
      }
      setLoading(false);
    };

    analyzeCode();
  }, [code]);

  const nextStep = () => {
    if (step < executionSteps.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const currentStep = executionSteps[step];

  return (
    <div className={`w-full ${theme === "light" ? "bg-white" : "bg-gray-900"}`}>
      <div className="flex flex-col space-y-4">
        <div
          className={`p-4 rounded-lg border ${
            theme === "light" ? "border-gray-200" : "border-gray-700"
          }`}
        >
          <div className="font-mono text-sm">
            {code.split("\n").map((line, idx) => (
              <div
                key={idx}
                className={`flex items-start ${
                  currentStep?.lineNumber === idx + 1
                    ? "bg-yellow-200 dark:bg-yellow-900"
                    : ""
                }`}
              >
                <span className="inline-block w-8 text-gray-400 select-none">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre">{line}</span>
                {currentStep?.lineNumber === idx + 1 && (
                  <span className="text-red-500 ml-2">➤</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-lg border ${
              theme === "light" ? "border-gray-200" : "border-gray-700"
            }`}
          >
            <h3 className="font-bold mb-4">Frames</h3>
            {currentStep?.frames.map((frame, idx) => (
              <div
                key={idx}
                className={`p-3 mb-2 rounded ${
                  theme === "light"
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-blue-900 border border-blue-800"
                }`}
              >
                <div className="font-mono font-bold mb-2">{frame.name}</div>
                {frame.variables.map((variable, vIdx) => (
                  <div key={vIdx} className="ml-4 font-mono text-sm">
                    {variable.name}: {variable.value}
                    {variable.id && (
                      <span className="text-gray-500 ml-2">
                        [id: {variable.id}]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            className={`p-4 rounded-lg border ${
              theme === "light" ? "border-gray-200" : "border-gray-700"
            }`}
          >
            <h3 className="font-bold mb-4">Objects</h3>
            <div className="space-y-2">
              {currentStep?.objects.map((obj, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded ${
                    theme === "light"
                      ? "bg-green-50 border border-green-200"
                      : "bg-green-900 border border-green-800"
                  }`}
                >
                  <div className="font-mono">
                    <span className="font-bold">{obj.id}</span>: {obj.type}
                  </div>
                  <div className="font-mono text-sm mt-1">{obj.value}</div>
                  {obj.references.length > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      Referenced by: {obj.references.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center space-x-4 mt-4">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className={`px-4 py-2 rounded-md ${
              theme === "light"
                ? "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700"
            }`}
          >
            ← Prev
          </button>
          <div className={theme === "light" ? "text-gray-900" : "text-white"}>
            Step {step + 1} of {executionSteps.length}
          </div>
          <button
            onClick={nextStep}
            disabled={step === executionSteps.length - 1}
            className={`px-4 py-2 rounded-md ${
              theme === "light"
                ? "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700"
            }`}
          >
            Next →
          </button>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        </div>
      )}

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
  );
}

function MainComponent() {
  const [code, setCode] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [theme, setTheme] = useState("light");

  const languages = [
    { id: "javascript", label: "JavaScript", icon: "🟨" },
    { id: "python", label: "Python", icon: "🐍" },
    { id: "java", label: "Java", icon: "☕" },
    { id: "cpp", label: "C++", icon: "🔵" },
    { id: "typescript", label: "TypeScript", icon: "💙" },
  ];

  const getPlaceholder = (lang) => {
    const examples = {
      javascript: `// Example:
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

factorial(5);`,
      python: `# Example:
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

factorial(5)`,
      java: `// Example:
public class Main {
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    
    public static void main(String[] args) {
        factorial(5);
    }
}`,
      cpp: `// Example:
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    factorial(5);
    return 0;
}`,
      typescript: `// Example:
function factorial(n: number): number {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

factorial(5);`,
    };
    return examples[lang] || "Enter your code here...";
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      }`}
    >
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold font-inter">Code Visualizer</h1>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className={`px-4 py-2 rounded-md ${
              theme === "light"
                ? "bg-gray-900 text-white hover:bg-gray-700"
                : "bg-white text-gray-900 hover:bg-gray-100"
            }`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                    selectedLanguage === lang.id
                      ? "bg-blue-600 text-white"
                      : theme === "light"
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                      : "bg-gray-800 hover:bg-gray-700 text-white"
                  }`}
                >
                  <span className="text-xl">{lang.icon}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>

            <div
              className={`rounded-lg border ${
                theme === "light" ? "border-gray-200" : "border-gray-700"
              }`}
            >
              <div
                className={`flex justify-between items-center border-b p-4 ${
                  theme === "light" ? "border-gray-200" : "border-gray-700"
                }`}
              >
                <h2 className="text-xl font-bold">Code Editor</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCode("")}
                    className={`px-3 py-1 rounded-md ${
                      theme === "light"
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        : "bg-gray-800 hover:bg-gray-700 text-white"
                    }`}
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
                    className={`px-3 py-1 rounded-md ${
                      theme === "light"
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        : "bg-gray-800 hover:bg-gray-700 text-white"
                    }`}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={getPlaceholder(selectedLanguage)}
                className={`w-full h-[400px] p-4 font-mono text-sm outline-none resize-none ${
                  theme === "light"
                    ? "bg-gray-50 text-gray-900"
                    : "bg-gray-800 text-white"
                }`}
                spellCheck="false"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
          </div>

          <div className="visualization-container">
            {code && <CodeVisualizer code={code} theme={theme} />}
          </div>
        </div>
      </div>

      <style jsx global>{`
        textarea {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          tab-size: 2;
        }

        textarea::placeholder {
          color: ${theme === "light" ? "#6B7280" : "#9CA3AF"};
        }

        .visualization-container {
          min-height: 500px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .visualization-container {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default MainComponent;