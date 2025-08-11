import { useState } from "react";
import { useAtom } from "jotai";
import { AxiosError } from "axios";

import "./App.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";

import { upload } from "./lib/wanikani";
import { ProgressReport } from "./components/progress";
import { writeProgressAtom } from "./lib/progressreporter";
import { RadicalsManagerRefactored } from "./components/RadicalsManagerRefactored";

function App() {
  const [apiToken, setApiToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'radicals'>('vocabulary');
  const [, setProgress] = useAtom(writeProgressAtom);

  const handleUpload = async () => {
    setUploading(true);
    setError("");

    try {
      await upload(apiToken, setProgress);
      setError("Done!");
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 401) {
          if (error.response.data?.error?.includes("grant permission")) {
            setError(
              'Please use an API token with "study_material:create" and "study_materials:update" permissions.'
            );
          } else {
            setError(
              "Could not connect to Wanikani, please check the API token."
            );
          }
        } else if (error.response.status === 422) {
          setError(
            `There is an issue with the data: ${error.response.data.error}`
          );
        } else if (error.response.status === 429) {
          setError(
            "Too many requests, try again later. Note: Do not use Wanikani and Doitsukani in parallel."
          );
        }
      } else {
        setError("Error: " + error);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-6">
              <img
                src="doitsukani.webp"
                className="w-16 h-16 mr-4"
                alt="Doitsukani logo"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Doitsukani</h1>
                <p className="text-gray-600">
                  Deutsche Übersetzungen für <a href="https://wanikani.com/" className="text-blue-600 hover:underline">Wanikani</a>
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center border-b">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('vocabulary')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'vocabulary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  📚 Vocabulary
                </button>
                <button
                  onClick={() => setActiveTab('radicals')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'radicals'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  🌸 Radicals
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container mx-auto px-4 py-8">
          {activeTab === 'vocabulary' && (
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Vocabulary Übersetzungen
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Füge deutsche Übersetzungen für all deine Wanikani-Vokabeln hinzu
                  </p>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="text"
                      placeholder="Wanikani API Token eingeben"
                      value={apiToken}
                      onFocus={() => setError("")}
                      onChange={(e) => setApiToken(e.target.value)}
                      className="mb-4"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <ul className="m-4 text-left list-disc">
                      <li>
                        Gehe zum Wanikani Dashboard und klicke auf dein Profil → "API Tokens"
                      </li>
                      <li>
                        Klicke "Generate a new token" und wähle "study_materials:create" und "study_materials:update"
                      </li>
                      <li>Klicke "Generate token"</li>
                      <li>Kopiere den Token hier hinein</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>

                <Button
                  className="w-full mb-4"
                  onClick={handleUpload}
                  disabled={!apiToken || uploading}
                >
                  {uploading ? "Lade hoch..." : "Übersetzungen hochladen"}
                </Button>

                {uploading && <ProgressReport />}

                {error && (
                  <div className={`p-3 rounded-md text-sm ${error === "Done!"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                    {error}
                  </div>
                )}

                <div className="mt-6 text-xs text-gray-500 space-y-2">
                  <p>
                    ⚠️ Der Upload kann über eine Stunde dauern (Wanikani Server-Limits)
                  </p>
                  <p>
                    💡 Benutze Wanikani nicht gleichzeitig. Bei Seitenwechsel wird der Upload gestoppt.
                  </p>
                  <p className="italic">
                    Hinweis: Dieser Service wird "wie er ist" ohne Garantie bereitgestellt.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'radicals' && (
            <RadicalsManagerRefactored />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
