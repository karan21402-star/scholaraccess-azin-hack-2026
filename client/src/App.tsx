import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownRight, ArrowRight, AudioLines, BadgeCheck, BookOpen, Check, ChevronDown,
  CircleHelp, Clock3, Command, ExternalLink, Eye, FileText, GraduationCap, Headphones,
  Heart, Mic, MicOff, Search, ShieldCheck, Sparkles, StopCircle, Volume2, Webcam, X
} from "lucide-react";
import { parseCommand } from "./services/commands";
import { searchScholarships } from "./services/search";
import { useFacePointer } from "./services/useFacePointer";
import type { LiveResult, SearchResponse } from "./services/scholarships";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
interface RecognitionEvent extends Event { results: ArrayLike<RecognitionResult> }
interface RecognitionErrorEvent extends Event { error: string }
interface RecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface RecognitionConstructor { new(): RecognitionInstance }
type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

const scholarshipText = {
  title: "Access Forward Scholarship",
  amount: "Up to ₹50,000 per year",
  eligibility: "For students enrolled in an undergraduate program at an Indian institution. Applicants should demonstrate financial need and submit proof of enrollment. This is a fictional demo scholarship; its criteria and award are sample content only.",
  documents: "A college enrollment certificate, a recent academic transcript, and an income declaration. This is sample content for the prototype, not an official application checklist."
};

function App() {
  const [query, setQuery] = useState("");
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [command, setCommand] = useState("");
  const [activity, setActivity] = useState("Ready when you are. Try a voice or typed command.");
  const [highlighted, setHighlighted] = useState("");
  const [explanation, setExplanation] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const searchController = useRef<AbortController | null>(null);
  const operationId = useRef(0);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const recognitionLastAt = useRef(0);
  const gazeVideoRef = useRef<HTMLVideoElement>(null);
  const facePointer = useFacePointer(gazeVideoRef);

  useEffect(() => () => {
    operationId.current += 1;
    searchController.current?.abort();
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const stopEverything = () => {
    operationId.current += 1;
    searchController.current?.abort();
    searchController.current = null;
    setSearchBusy(false);
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    setListening(false);
    setHighlighted("");
    setConfirmationOpen(false);
    setActivity("Stopped. Nothing is running in the background.");
  };

  const performCommand = (raw: string) => {
    const parsed = parseCommand(raw);
    if (parsed.intent === "stop") {
      stopEverything();
      return;
    }
    const currentOperation = ++operationId.current;
    setHighlighted("");
    setVoiceError("");

    if (parsed.intent === "help") {
      setActivity("Try: “Find the application form”, “Read eligibility”, “Explain this”, “Scroll down”, or “Stop”.");
      return;
    }
    if (parsed.intent === "unknown") {
      setActivity("I’m not sure what you mean. Try “find the application form” or “read eligibility”.");
      return;
    }
    if (parsed.intent === "scroll") {
      window.scrollBy({ top: parsed.direction === "down" ? window.innerHeight * 0.72 : -window.innerHeight * 0.72, behavior: "smooth" });
      setActivity(`Scrolling ${parsed.direction}.`);
      return;
    }
    if (parsed.intent === "submit") {
      setConfirmationOpen(true);
      setActivity("Please review the local-only demo submission before confirming.");
      return;
    }
    if (parsed.intent === "find" && parsed.target) {
      const target = document.getElementById(parsed.target);
      if (!target || !target.isConnected || target.getAttribute("aria-hidden") === "true") {
        setActivity("That section is not available on this page. Try another command.");
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlighted(parsed.target);
      setActivity(`Found ${target.getAttribute("aria-label") ?? target.textContent?.trim() ?? "the requested section"}.`);
      window.setTimeout(() => {
        if (operationId.current === currentOperation) setHighlighted("");
      }, 4500);
      return;
    }
    if (parsed.intent === "read") {
      const text = parsed.target === "eligibility"
        ? scholarshipText.eligibility
        : parsed.target === "documents"
          ? scholarshipText.documents
          : `${scholarshipText.title}. ${scholarshipText.amount}. ${scholarshipText.eligibility}`;
      setActivity("Reading the sample scholarship information aloud.");
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-IN";
        window.speechSynthesis.speak(utterance);
      } else {
        setActivity("Speech output is not supported in this browser. The content is shown on screen.");
      }
      return;
    }
    if (parsed.intent === "explain") {
      setExplanation("In short: the fictional Access Forward Scholarship gives eligible undergraduate students a sample award of up to ₹50,000 per year. The demo asks for proof of enrollment, an academic transcript, and an income declaration. These are illustrative details, not an official offer.");
      setActivity("I’ve explained the sample scholarship using the information shown on this page.");
      document.getElementById("simple-explanation")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const submitCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!command.trim()) return;
    performCommand(command);
    setCommand("");
  };

  const startListening = () => {
    const recognitionApi = window as SpeechWindow;
    const Recognition = recognitionApi.SpeechRecognition ?? recognitionApi.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Voice input is not supported here. Type a command instead.");
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const now = Date.now();
        if (now - recognitionLastAt.current < 800) return;
        recognitionLastAt.current = now;
        const transcript = event.results[event.results.length - 1]?.[0]?.transcript;
        if (transcript) {
          setActivity(`Heard: “${transcript}”`);
          performCommand(transcript);
        }
      };
      recognition.onerror = (event) => {
        setVoiceError(event.error === "not-allowed"
          ? "Microphone access was denied. Allow it in browser settings, or type a command."
          : `Voice input error (${event.error}). You can still type a command.`);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      setVoiceError("");
      setActivity("Listening. Say a short command, such as “read eligibility”.");
    } catch (error) {
      console.error("Could not start speech recognition:", error);
      setVoiceError("Could not start the microphone. Check browser permissions, or type a command.");
    }
  };

  const runSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setSearchError("Type at least two characters to search.");
      return;
    }
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearchBusy(true);
    setSearchError("");
    setSearchResponse(null);
    try {
      const result = await searchScholarships(query.trim(), controller.signal);
      if (!controller.signal.aborted) setSearchResponse(result);
    } catch (error) {
      if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "Search failed.");
    } finally {
      if (!controller.signal.aborted) setSearchBusy(false);
    }
  };

  const confirmDemoSubmit = () => {
    setSubmitted(true);
    setConfirmationOpen(false);
    setActivity("Demo application saved locally. No personal information was sent anywhere.");
  };

  const liveResults: LiveResult[] = searchResponse?.results ?? [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ScholarAccess home">
          <span className="brand-mark"><GraduationCap size={21} /></span>
          <span>scholar<span className="brand-light">access</span></span>
        </a>
        <nav className="topnav" aria-label="Main navigation">
          <a href="#opportunities">Explore scholarships</a>
          <a href="#accessibility">Accessibility tools</a>
        </nav>
        <div className="topbar-right">
          <span className="online-dot" aria-hidden="true" />
          <span className="topbar-status">Your access, your way</span>
          <button className="avatar-button" aria-label="Profile: demo user">A</button>
        </div>
      </header>

      <main id="top">
        <div className="page-wrap">
          <div className="eyebrow-row"><span className="eyebrow">A MORE ACCESSIBLE WAY FORWARD</span><span className="event-pill"><Sparkles size={13} /> AZINHACK 2026 DEMO</span></div>
          <section className="hero" aria-labelledby="page-heading">
            <div className="hero-copy">
              <p className="hero-kicker"><span className="kicker-line" /> YOUR NEXT CHAPTER STARTS HERE</p>
              <h1 id="page-heading">Find the support<br />to <em>go further.</em></h1>
              <p className="hero-description">Scholarship discovery that meets you where you are. Explore opportunities using your voice, your keyboard, or a live web search.</p>
              <div className="hero-actions">
                <a className="primary-button" href="#opportunities">Explore scholarships <ArrowDownRight size={16} /></a>
                <a className="text-link" href="#accessibility"><Headphones size={17} /> Meet your access assistant</a>
              </div>
              <div className="trust-line"><ShieldCheck size={17} /><span>Your searches stay private. Demo forms never leave this device.</span></div>
            </div>
            <div className="hero-illustration" aria-label="Illustration of a student planning their next step" role="img">
              <div className="illustration-orbit orbit-one" /><div className="illustration-orbit orbit-two" />
              <div className="sun-circle" />
              <div className="floating-note note-one"><span className="note-icon mint-icon"><BadgeCheck size={18} /></span><span><b>One step at a time</b><small>We'll help you find your way</small></span></div>
              <div className="student-art"><span className="student-hair" /><span className="student-face" /><span className="student-neck" /><span className="student-body" /><span className="student-book"><BookOpen size={25} /></span></div>
              <div className="floating-note note-two"><span className="note-icon purple-icon"><Heart size={17} /></span><span><b>Built around you</b><small>Access should feel effortless</small></span></div>
              <div className="hero-sticker"><span>YOUR<br />POTENTIAL<br /><b>IS LIMITLESS</b></span><ArrowDownRight size={17} /></div>
              <div className="art-leaf leaf-one" /><div className="art-leaf leaf-two" /><div className="art-leaf leaf-three" />
            </div>
          </section>

          <section className="stats-strip" aria-label="Scholarship search overview">
            <div><b>One place</b><span>to explore your options</span></div><i />
            <div><b>Live web search</b><span>powered by TinyFish</span></div><i />
            <div><b>Designed for access</b><span>voice, keyboard & more</span></div>
          </section>

          <section className="opportunities-section" id="opportunities" aria-labelledby="opportunities-title">
            <div className="section-heading">
              <div><p className="section-kicker">A LITTLE HELP, A BIG DIFFERENCE</p><h2 id="opportunities-title">Opportunities for your next step<span>.</span></h2><p>Search the live web for current scholarships, or explore this page’s demo opportunity.</p></div>
              <a href="#accessibility" className="subtle-link">Need a hand? <ArrowRight size={15} /></a>
            </div>
            <form className="search-box" onSubmit={runSearch} role="search">
              <Search size={20} aria-hidden="true" />
              <label className="sr-only" htmlFor="scholarship-search">Search scholarships on the web</label>
              <input id="scholarship-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “engineering scholarships for women in India”" />
              <button type="submit" disabled={searchBusy}>{searchBusy ? <span className="spinner" /> : "Search live web"} <ArrowRight size={16} /></button>
            </form>
            <div className="search-note"><span className="live-dot" /> Live search by TinyFish <span className="note-separator">·</span> Search for fresh opportunities from across the web</div>
            {searchError && <div className="inline-alert" role="alert">{searchError}</div>}
            {searchResponse && <div className="live-results" aria-live="polite">
              <div className="results-heading"><div><span className={`source-tag ${searchResponse.mode}`}>{searchResponse.mode === "tinyfish" ? "LIVE · TINYFISH" : "OFFLINE DEMO"}</span><h3>{searchResponse.mode === "tinyfish" ? `Search results for “${query}”` : "Live search is not connected"}</h3></div>
                <button className="icon-button" aria-label="Dismiss search results" onClick={() => setSearchResponse(null)}><X size={17} /></button></div>
              {searchResponse.message && <p className="search-message">{searchResponse.message}</p>}
              {liveResults.length > 0 && <ul className="live-result-list">{liveResults.map((result) => <li key={result.url}>
                <a href={result.url} target="_blank" rel="noreferrer"><span className="result-source">{result.source} <ExternalLink size={12} /></span><b>{result.title}</b><p>{result.snippet}</p></a>
              </li>)}</ul>}
            </div>}

            <div className="cards-heading"><div><h3>Start with this example</h3><span className="demo-label">FICTIONAL DEMO PROGRAM</span></div><button className="filter-button" type="button" onClick={() => setActivity("This demo has one clearly labeled sample scholarship. Use live search above to find current real-world listings.")}>About this listing <ChevronDown size={15} /></button></div>
            <article className={`scholarship-card ${highlighted === "scholarship-details" ? "target-highlight" : ""}`} id="scholarship-details" data-target-id="scholarship-details" aria-label={scholarshipText.title}>
              <div className="scholarship-icon"><GraduationCap size={23} /></div>
              <div className="scholarship-main"><div className="card-labels"><span className="feature-label">SAMPLE OPPORTUNITY</span><span className="category-label">UNDERGRADUATE</span></div>
                <h3>{scholarshipText.title}</h3><p>Financial support for students taking their next step in higher education.</p>
                <div className="card-meta"><span><FileText size={14} /> {scholarshipText.amount}</span><span id="deadline"><Clock3 size={14} /> Demo dates only</span></div></div>
              <a className="card-action" href="#application-form" onClick={() => setHighlighted("application-form")} aria-label="View the demo application form">Explore <ArrowRight size={16} /></a>
            </article>
            <div className="sample-warning"><ShieldCheck size={16} /> This scholarship and application are fictional examples. Always verify real opportunities with the official provider.</div>
          </section>

          <section className="detail-grid" aria-label="Sample scholarship information">
            <article className={`info-card ${highlighted === "eligibility" ? "target-highlight" : ""}`} id="eligibility" data-target-id="eligibility">
              <div className="info-card-heading"><div className="info-icon eligibility-icon"><BadgeCheck size={19} /></div><div><span>01 / WHO IT'S FOR</span><h3>Eligibility criteria</h3></div></div>
              <p>{scholarshipText.eligibility}</p><button className="read-link" onClick={() => performCommand("read eligibility")}><Volume2 size={15} /> Read this section</button>
            </article>
            <article className={`info-card ${highlighted === "documents" ? "target-highlight" : ""}`} id="documents" data-target-id="documents">
              <div className="info-card-heading"><div className="info-icon documents-icon"><FileText size={19} /></div><div><span>02 / WHAT YOU'LL NEED</span><h3>Documents to prepare</h3></div></div>
              <p>{scholarshipText.documents}</p><button className="read-link" onClick={() => performCommand("read documents")}><Volume2 size={15} /> Read this section</button>
            </article>
          </section>

          <section id="simple-explanation" className={`explanation-card ${explanation ? "visible" : ""}`} aria-live="polite">
            <div className="explanation-symbol"><Sparkles size={19} /></div><div><span>IN PLAIN LANGUAGE</span><h3>A simpler explanation</h3><p>{explanation || "Ask “Explain this” and your assistant will summarize the sample details shown on this page."}</p></div>
          </section>

          <section className={`application-panel ${highlighted === "application-form" ? "target-highlight" : ""}`} id="application-form" data-target-id="application-form">
            <div className="application-intro"><span className="section-kicker">TAKE THE NEXT STEP</span><h2>Try the demo application<span>.</span></h2><p>See how an accessible form feels. Your entries stay in your browser and are never sent.</p><div className="local-only"><ShieldCheck size={15} /> LOCAL-ONLY DEMO — NO DATA IS TRANSMITTED</div></div>
            <form className="demo-form" onSubmit={(event) => { event.preventDefault(); setConfirmationOpen(true); }}>
              <div className="form-row"><label htmlFor="demo-name">Your name <span>(optional)</span></label><input id="demo-name" name="name" autoComplete="name" placeholder="e.g. Aanya Sharma" /></div>
              <div className="form-row"><label htmlFor="demo-email">Email address <span>(optional)</span></label><input id="demo-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" /></div>
              <div className="form-footer"><span>Fictional program · sample form only</span><button type="submit" className="submit-button">Review demo application <ArrowRight size={16} /></button></div>
              {submitted && <p className="success-message" role="status"><Check size={16} /> Demo complete. Nothing was sent.</p>}
            </form>
          </section>

          <section className="assistant-section" id="accessibility" aria-labelledby="assistant-heading">
            <div className="assistant-intro"><span className="assistant-chip"><AudioLines size={14} /> YOUR ACCESS ASSISTANT</span><h2 id="assistant-heading">Your page. Your pace.</h2><p>Navigate and understand the information with voice, typing, or keyboard. Every action stays in your control.</p>
              <div className="command-examples"><span>Try saying</span><button type="button" onClick={() => performCommand("Find the registration form")}>“Find the application form”</button><button type="button" onClick={() => performCommand("Read the eligibility criteria")}>“Read eligibility”</button><button type="button" onClick={() => performCommand("Explain this")}>“Explain this simply”</button></div>
            </div>
            <div className="assistant-card">
              <div className="assistant-card-top"><div className="assistant-avatar"><AudioLines size={19} /></div><div><b>ScholarAccess assistant</b><span>Local demo mode <span className="local-dot" /></span></div><span className="assistant-lock"><ShieldCheck size={15} /> Safe by design</span></div>
              <div className="assistant-status" role="status"><span className="status-pulse" /><p>{activity}</p></div>
              {voiceError && <p className="voice-error" role="alert">{voiceError}</p>}
              <form className="command-entry" onSubmit={submitCommand}>
                <label className="sr-only" htmlFor="command-input">Type a command</label>
                <Command size={16} /><input id="command-input" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Type a command, or use your voice…" />
                <button type="submit" aria-label="Send command" disabled={!command.trim()}><ArrowRight size={17} /></button>
              </form>
              <div className="assistant-controls">
                <button className={`mic-button ${listening ? "is-listening" : ""}`} onClick={listening ? stopEverything : startListening} type="button">
                  {listening ? <Mic size={16} /> : <MicOff size={16} />}{listening ? "Listening…" : "Use microphone"}
                </button>
                <button className="stop-button" onClick={stopEverything} type="button"><StopCircle size={16} /> Stop</button>
              </div>
              <div className="assist-footnote"><CircleHelp size={14} /> Voice availability depends on your browser. Typing always works.</div>
            </div>
          </section>

          <section className="gaze-panel" aria-labelledby="gaze-title">
            <div className="gaze-icon"><Eye size={21} /></div><div className="gaze-copy"><span className="experimental-label">EXPERIMENTAL</span><h3 id="gaze-title">Try the camera pointer</h3><p>Optional, in-browser face-position cursor experiment. It is not calibrated eye tracking and will never activate or submit anything.</p>
              {facePointer.state === "error" && <span className="gaze-message" role="alert">Camera permission or model loading failed. Voice and typing still work.</span>}
              {facePointer.state === "unsupported" && <span className="gaze-message" role="alert">Camera access is not supported in this browser or page context.</span>}
              {facePointer.enabled && facePointer.state !== "error" && facePointer.state !== "unsupported" && <>
                <video className="camera-preview" ref={gazeVideoRef} muted playsInline aria-label="Local camera preview" />
                {facePointer.state === "loading" && <span className="gaze-message">Starting camera and loading the optional face model…</span>}
                {facePointer.state === "ready" && <>
                <button className="read-link" type="button" onClick={facePointer.recalibrate}><Eye size={14} /> Re-center pointer</button>
                <span className="gaze-message">Camera stays in your browser. Pointer follows approximate face position, not eye gaze.</span>
                </>}
              </>}
            </div>
            <button className={`gaze-toggle ${facePointer.enabled ? "active" : ""}`} type="button" onClick={facePointer.enabled ? facePointer.disable : facePointer.enable}>
              {facePointer.state === "loading" ? "Starting…" : facePointer.enabled ? "Turn off camera" : <><Webcam size={16} /> Try camera</>}
            </button>
          </section>

          <section className="bottom-note"><div className="bottom-note-icon"><ShieldCheck size={18} /></div><div><b>Your information belongs to you.</b><p>The camera is opt-in, the sample form is local-only, and live search sends only the words you search for to TinyFish.</p></div></section>
        </div>
      </main>
      <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><GraduationCap size={18} /></span><span>scholar<span className="brand-light">access</span></span></a><span>A more accessible way forward.</span><span>AZINHACK 2026 · Open innovation demo</span></footer>

      {confirmationOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmationOpen(false); }}>
        <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
          <button className="dialog-close" aria-label="Close confirmation" onClick={() => setConfirmationOpen(false)}><X size={18} /></button>
          <div className="dialog-icon"><ShieldCheck size={22} /></div><span className="section-kicker">DEMO ONLY · NOTHING LEAVES YOUR DEVICE</span>
          <h2 id="confirm-title">Ready to finish this demo?</h2><p id="confirm-description">This fictional application will be marked complete locally. No information will be sent to a scholarship provider.</p>
          <div className="dialog-actions"><button className="cancel-button" onClick={() => setConfirmationOpen(false)}>Go back</button><button className="submit-button" onClick={confirmDemoSubmit}>Confirm demo <Check size={16} /></button></div>
        </section>
      </div>}
      {facePointer.pointer && <div className="face-pointer" style={{ left: `${facePointer.pointer.x}%`, top: `${facePointer.pointer.y}%` }} aria-hidden="true"><Eye size={15} /></div>}
      <div className="sr-only" aria-live="polite">{facePointer.state === "ready" ? "Experimental face-position pointer is active; no pointer actions will occur." : ""}</div>
    </div>
  );
}

export default App;
