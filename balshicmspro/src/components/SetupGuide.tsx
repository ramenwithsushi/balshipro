import React, { useState } from 'react';
import { Key, Shield, Globe, Terminal, Copy, Check, ExternalLink, HelpCircle } from 'lucide-react';

export const SetupGuide: React.FC = () => {
  const [metaToken, setMetaToken] = useState('');
  const [igUserId, setIgUserId] = useState('');
  const [ngrokToken, setNgrokToken] = useState('');
  const [ngrokDomain, setNgrokDomain] = useState('balshi-creator.ngrok-free.app');
  const [localPort, setLocalPort] = useState('8088');
  const [copiedEnv, setCopiedEnv] = useState(false);

  const envContent = `# ==============================================================================
# Balshi Instagram CMS & Publisher Configuration (.env)
# ==============================================================================

# 1. Meta Graph API Long-Lived User Access Token
META_ACCESS_TOKEN="${metaToken || 'EAAG...your_long_lived_token_here'}"

# 2. Instagram Creator / Professional Account ID
IG_USER_ID="${igUserId || '178414...your_instagram_user_id_here'}"

# 3. Ngrok Authtoken
NGROK_AUTHTOKEN="${ngrokToken || 'your_ngrok_authtoken_here'}"

# 4. Ngrok Free Static Domain (bypasses browser interstitial warning)
NGROK_DOMAIN="${ngrokDomain || 'your-static-domain.ngrok-free.app'}"

# 5. Local HTTP server port for temporary image serving
LOCAL_HTTP_PORT="${localPort || '8088'}"
`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envContent);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-400" />
          <span>Meta Instagram Graph API & Ngrok Setup Guide</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Follow these 3 steps to configure your 100% zero-cost local automated publishing pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Meta Long-Lived Token */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-sm mb-3">
              1
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Meta Long-Lived Token</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Log into <strong className="text-slate-200">developers.facebook.com</strong> and create a Meta App with the <strong className="text-slate-200">Instagram Graph API</strong> product.
            </p>
            <ul className="text-xs text-slate-400 mt-3 space-y-1.5 list-disc list-inside">
              <li>Request permissions: <code className="text-amber-300 font-mono text-[11px]">instagram_content_publish</code>, <code className="text-amber-300 font-mono text-[11px]">instagram_basic</code>.</li>
              <li>Generate a User Token in Graph API Explorer.</li>
              <li>Exchange short-lived token for a 60-day Long-Lived Access Token via <code className="text-amber-300 font-mono text-[11px]">/oauth/access_token</code>.</li>
            </ul>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className="text-[11px] text-slate-500">Destination:</span>
            <code className="text-[11px] text-amber-300 block font-mono mt-0.5">META_ACCESS_TOKEN</code>
          </div>
        </div>

        {/* Step 2: Instagram Creator Account ID */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 font-bold flex items-center justify-center text-sm mb-3">
              2
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Instagram User ID</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Verify your Instagram account is converted to a <strong className="text-slate-200">Creator or Business</strong> account and linked to a Facebook Page.
            </p>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Run this request in the Graph API Explorer to find your numeric ID:
            </p>
            <pre className="mt-2 text-[10px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-amber-300">
GET /v21.0/me/accounts?
fields=instagram_business_account
            </pre>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className="text-[11px] text-slate-500">Destination:</span>
            <code className="text-[11px] text-amber-300 block font-mono mt-0.5">IG_USER_ID</code>
          </div>
        </div>

        {/* Step 3: Ngrok Free Static Domain */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-sm mb-3">
              3
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Ngrok Free Static Domain</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Sign up for a free account at <strong className="text-slate-200">dashboard.ngrok.com</strong> and copy your Authtoken.
            </p>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Claim your <strong>1 Free Static Domain</strong> under <em>Domains</em> (e.g. <code className="text-emerald-300">my-name.ngrok-free.app</code>).
            </p>
            <div className="mt-3 p-2 bg-emerald-950/30 border border-emerald-500/20 rounded text-[11px] text-emerald-300">
              💡 <strong>Why Static Domain?</strong> Free static domains bypass Ngrok's HTML interstitial warning screen, allowing the Meta photo crawler to fetch the image instantly without an error!
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className="text-[11px] text-slate-500">Destination:</span>
            <code className="text-[11px] text-amber-300 block font-mono mt-0.5">NGROK_AUTHTOKEN & NGROK_DOMAIN</code>
          </div>
        </div>
      </div>

      {/* Interactive .env Generator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Interactive .env File Generator</span>
            </h3>
            <span className="text-xs text-slate-400">
              Type your values below to format your production <code className="text-amber-300">.env</code> file.
            </span>
          </div>
          <button
            onClick={handleCopyEnv}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            {copiedEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEnv ? 'Copied .env!' : 'Copy .env Configuration'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">META_ACCESS_TOKEN</label>
            <input
              type="text"
              value={metaToken}
              onChange={(e) => setMetaToken(e.target.value)}
              placeholder="EAA..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">IG_USER_ID</label>
            <input
              type="text"
              value={igUserId}
              onChange={(e) => setIgUserId(e.target.value)}
              placeholder="178414001928374"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">NGROK_AUTHTOKEN</label>
            <input
              type="text"
              value={ngrokToken}
              onChange={(e) => setNgrokToken(e.target.value)}
              placeholder="2abc..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">NGROK_DOMAIN (Static Domain)</label>
            <input
              type="text"
              value={ngrokDomain}
              onChange={(e) => setNgrokDomain(e.target.value)}
              placeholder="balshi-creator.ngrok-free.app"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-mono text-slate-400 mb-1.5">Resulting .env Output</label>
          <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-amber-300/90 overflow-x-auto leading-relaxed">
            {envContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
