import React, { useState } from 'react';
import { api } from '../lib/api';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { Play, Copy, RefreshCw, Terminal } from 'lucide-react';

const DEFAULT_JSON = `{
  "task": "analyze_review",
  "review": {
    "text": "Très déçu : 45 minutes d’attente, prestation ratée, et accueil froid.",
    "rating": 1,
    "language": "fr",
    "source": "google",
    "location_name": "Salon de Lyon",
    "created_at": "2025-02-10"
  }
}`;

export const PlaygroundPage = () => {
  const [inputJson, setInputJson] = useState(DEFAULT_JSON);
  const [outputJson, setOutputJson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setIsLoading(true);
    setError(null);
    setOutputJson('');

    try {
      // 1. Validate JSON
      let payload;
      try {
        payload = JSON.parse(inputJson);
      } catch (e) {
        throw new Error("Invalid JSON format in request.");
      }

      // 2. Call AI
      const result = await api.ai.runCustomTask(payload);
      
      // 3. Display Result
      setOutputJson(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputJson);
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Terminal className="h-8 w-8 text-indigo-600" />
             AI Playground
          </h1>
          <p className="text-slate-500">Test raw JSON tasks against your Gemini AI Engine configuration.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInputJson(DEFAULT_JSON)} icon={RefreshCw}>Reset</Button>
            <Button variant="primary" onClick={handleRun} isLoading={isLoading} icon={Play}>Run Task</Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Input Column */}
        <Card className="flex flex-col h-full border-slate-300 shadow-md">
           <CardHeader className="bg-slate-50 py-3 border-b border-slate-200">
              <CardTitle className="text-sm font-mono text-slate-600">INPUT (JSON)</CardTitle>
           </CardHeader>
           <div className="flex-1 relative">
             <textarea 
               className="w-full h-full p-4 font-mono text-sm text-slate-800 focus:outline-none resize-none"
               value={inputJson}
               onChange={(e) => setInputJson(e.target.value)}
               spellCheck={false}
             />
           </div>
        </Card>

        {/* Output Column */}
        <Card className="flex flex-col h-full border-slate-300 shadow-md bg-slate-900">
           <CardHeader className="bg-slate-800 py-3 border-b border-slate-700 flex justify-between items-center">
              <CardTitle className="text-sm font-mono text-slate-300">OUTPUT (JSON)</CardTitle>
              {outputJson && (
                 <button onClick={copyToClipboard} className="text-slate-400 hover:text-white transition-colors">
                    <Copy className="h-4 w-4" />
                 </button>
              )}
           </CardHeader>
           <div className="flex-1 relative overflow-auto custom-scrollbar">
             {error ? (
                <div className="p-4 text-red-400 font-mono text-sm">{error}</div>
             ) : (
                <pre className="p-4 font-mono text-sm text-green-400 whitespace-pre-wrap">
                   {isLoading ? "Running AI task..." : outputJson || "// Result will appear here"}
                </pre>
             )}
           </div>
        </Card>
      </div>
    </div>
  );
};