import { useState } from 'react'

const LANGUAGES = [
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
]

const SAMPLE_INPUTS = [
  { language: 'hi', text: 'अस्पताल बहुत दूर है, एम्बुलेंस भी नहीं मिलती' },
  { language: 'en', text: 'There is no bus service, we cannot go to the city for work' },
  { language: 'te', text: 'స్కూల్ లేదు, పిల్లలు చదవలేకపోతున్నారు' },
  { language: 'pt', text: 'Não há médico na nossa vila' },
]

export function CitizenPortal() {
  const [language, setLanguage] = useState('hi')
  const [text, setText] = useState('')
  const [isVoice, setIsVoice] = useState(false)
  const [submitted, setSubmitted] = useState<{
    category: string; intent: string; severity: string; location: string;
    summary: string; translation: string;
  } | null>(null)

  const submit = () => {
    if (!text.trim()) return
    // Demo: simple keyword-based classification
    const t = text.toLowerCase()
    let category = 'general'
    if (/hospital|doctor|ambulance|स्वास्थ्य|चिकित्सा|डॉक्टर|больн|мед/.test(t)) category = 'healthcare'
    else if (/school|teacher|स्कूल|शिक्षक|школ|учит/.test(t)) category = 'education'
    else if (/road|bus|सड़क|बस|дорог|транспорт/.test(t)) category = 'roads'
    else if (/water|पानी|जल|вод/.test(t)) category = 'water'
    else if (/electricity|बिजली|электр/.test(t)) category = 'electricity'
    else if (/internet|इंटरनेट|интернет/.test(t)) category = 'internet'
    else if (/ambulance|emergency|आपातकाल|скорая/.test(t)) category = 'emergency_services'

    const isEmergency = /urgent|emergency|तुरंत|अंबुलेंस|скорая/.test(t)

    setSubmitted({
      category,
      intent: 'infrastructure_request',
      severity: isEmergency ? 'high' : 'medium',
      location: 'Auto-detected from device (demo)',
      summary: `Citizen reports ${category} issue in ${language.toUpperCase()}`,
      translation: text,
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-navy-900">JanAwaaz</h1>
        <p className="text-sm text-navy-600 mt-1">
          Your voice. Your language. Your right to be heard.
        </p>
      </div>

      {!submitted ? (
        <div className="card p-6">
          <label className="block text-sm font-medium text-navy-700 mb-2">Select Language</label>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-navy-300 rounded">
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setIsVoice(false)}
              className={`flex-1 py-2 rounded border text-sm font-medium ${
                !isVoice ? 'bg-navy-900 text-white border-navy-900' :
                'bg-white text-navy-700 border-navy-300'
              }`}>
              ⌨ Text
            </button>
            <button onClick={() => setIsVoice(true)}
              className={`flex-1 py-2 rounded border text-sm font-medium ${
                isVoice ? 'bg-navy-900 text-white border-navy-900' :
                'bg-white text-navy-700 border-navy-300'
              }`}>
              🎙 Voice
            </button>
          </div>

          {isVoice ? (
            <div className="border-2 border-dashed border-navy-300 rounded p-8 text-center mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-accent-light flex items-center justify-center mb-3">
                <div className="w-8 h-8 rounded-full bg-accent animate-pulse"></div>
              </div>
              <p className="text-sm font-medium text-navy-700">Tap to record</p>
              <p className="text-xs text-navy-500 mt-1">Speak in any supported language</p>
              <p className="text-xs text-navy-400 mt-2">(Demo: speech-to-text simulated)</p>
            </div>
          ) : (
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Describe your concern in your language..."
              rows={4}
              className="w-full px-3 py-2 border border-navy-300 rounded mb-3 text-sm" />
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <p className="text-xs text-navy-500 w-full">Try a sample:</p>
            {SAMPLE_INPUTS.map(s => (
              <button key={s.text} onClick={() => { setLanguage(s.language); setText(s.text) }}
                className="text-xs px-2 py-1 bg-navy-50 text-navy-700 rounded hover:bg-navy-100">
                {s.text.slice(0, 30)}…
              </button>
            ))}
          </div>

          <button onClick={submit} disabled={!text.trim()}
            className="btn-primary w-full">
            Submit Concern
          </button>

          <p className="text-xs text-navy-500 mt-4 text-center">
            🔒 Your identity is separated from analytics. No PII shared publicly.
          </p>
        </div>
      ) : (
        <div className="card p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-lg font-semibold text-navy-900">Thank you for your voice</h2>
          <p className="text-sm text-navy-600 mt-1">Your concern has been registered.</p>
          <div className="mt-5 bg-navy-50 rounded p-4 text-left text-sm">
            <p className="text-xs text-navy-500 mb-1">Detected Category</p>
            <p className="font-medium text-navy-900 capitalize">{submitted.category}</p>
            <p className="text-xs text-navy-500 mt-3 mb-1">Location</p>
            <p className="text-navy-900">{submitted.location}</p>
            <p className="text-xs text-navy-500 mt-3 mb-1">Severity</p>
            <span className={`inline-block px-2 py-0.5 text-xs rounded ${
              submitted.severity === 'high' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}>{submitted.severity}</span>
          </div>
          <button onClick={() => { setText(''); setSubmitted(null) }}
            className="btn-secondary mt-5">
            Submit Another
          </button>
        </div>
      )}
    </div>
  )
}
