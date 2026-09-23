import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeUrl } from '../services/analyzeService';
import { downloadReport } from '../services/reportService';
import RiskMeter from '../components/shared/RiskMeter';
import ThreatBadge from '../components/shared/ThreatBadge';
import ProgressBar from '../components/ui/ProgressBar';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { formatDuration } from '../utils/formatters';

export default function UrlAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return toast.error('Please enter a URL');
    let testUrl = url.trim();
    if (!/^https?:\/\//i.test(testUrl)) testUrl = 'http://' + testUrl;

    setLoading(true);
    setResult(null);
    try {
      const res = await analyzeUrl(testUrl);
      setResult(res.data.scan);
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?._id) return;
    setDownloading(true);
    try {
      const res = await downloadReport(result._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `threat-report-${result._id}.pdf`;
      link.click();
      toast.success('Report downloaded!');
    } catch {
      toast.error('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          🔗 <span>URL <span className="text-gradient-cyber">Analyzer</span></span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">Analyze any URL for potential cyber threats using AI</p>
      </div>

      {/* Input card */}
      <div className="glass-card p-6">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Enter URL to analyze</label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🌐</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com or paste any URL"
                className="input-cyber pl-10 h-12"
              />
            </div>
            <Button type="submit" loading={loading} className="px-6 h-12 whitespace-nowrap">
              {loading ? 'Analyzing...' : '🔍 Analyze'}
            </Button>
          </div>
          {loading && (
            <div className="flex items-center gap-3 text-cyber-cyan text-sm">
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 border-2 border-cyber-cyan/30 rounded-full" />
                <div className="absolute inset-0 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
              </div>
              AI is scanning the URL for threats…
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Risk meter */}
            <div className="glass-card p-8 flex flex-col items-center">
              <h2 className="text-lg font-semibold text-white mb-6">Threat Assessment</h2>
              <RiskMeter score={result.threatScore} level={result.threatLevel} size="lg" />
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg">
                <div className="text-center p-3 rounded-xl bg-white/3">
                  <p className="text-gray-500 text-xs">Confidence</p>
                  <p className="text-white font-bold font-mono text-lg">{result.confidenceScore}%</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/3">
                  <p className="text-gray-500 text-xs">Scan Time</p>
                  <p className="text-white font-bold font-mono text-lg">{formatDuration(result.scanDuration)}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/3 col-span-2 sm:col-span-1">
                  <p className="text-gray-500 text-xs">Status</p>
                  <ThreatBadge level={result.threatLevel} size="sm" />
                </div>
              </div>
            </div>

            {/* Score breakdown */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-white font-semibold">Risk Breakdown</h3>
              <ProgressBar value={result.threatScore} label="Threat Score" size="lg" />
              <ProgressBar value={result.confidenceScore} label="Confidence" color="#00d4ff" size="md" />
            </div>

            {/* Detected features */}
            {result.detectedFeatures?.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-4">⚠️ Detected Threat Indicators</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.detectedFeatures.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-cyber-red/5 border border-cyber-red/15">
                      <span className="text-cyber-red text-sm">●</span>
                      <span className="text-gray-300 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Screenshot preview */}
            {result.screenshot && (
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-3">📸 Live Screenshot</h3>
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img src={result.screenshot} alt="Website Screenshot preview" className="w-full object-cover" />
                </div>
              </div>
            )}

            {/* AI Explanation */}
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-3">🤖 AI Explanation</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{result.aiExplanation}</p>
            </div>

            {/* Recommendation */}
            <div className={`glass-card p-6 border ${result.threatLevel === 'safe' ? 'border-cyber-green/20' : result.threatLevel === 'malicious' ? 'border-cyber-red/20' : 'border-cyber-yellow/20'}`}>
              <h3 className="text-white font-semibold mb-3">💡 Recommendation</h3>
              <p className={`text-sm leading-relaxed ${result.threatLevel === 'safe' ? 'text-cyber-green' : result.threatLevel === 'malicious' ? 'text-cyber-red' : 'text-cyber-yellow'}`}>
                {result.recommendation}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button onClick={handleDownload} loading={downloading} variant="outline" className="flex-1">
                📥 Download PDF Report
              </Button>
              <Button onClick={() => { setResult(null); setUrl(''); }} variant="ghost" className="flex-1">
                🔄 New Analysis
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
