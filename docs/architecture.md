# Architecture notes

The Vite React app contains a fictional scholarship example and a local, deterministic command interpreter. Actions are constrained to known sections, text-to-speech, scrolling, and a confirmation-gated local demo form. Stop cancels speech and pending search requests; result IDs are never interpreted as code.

The Express API validates scholarship-search query length and proxies the query server-to-server to TinyFish Search. The key remains in the server environment. Upstream errors are surfaced as errors; no mock results are labeled live. CORS is restricted to the configured client origin.

The optional webcam path loads MediaPipe Tasks Vision and an external face-landmark model after explicit opt-in. It approximates a cursor from nose/face movement and does not track gaze, click, or activate targets. The feature is experimental and requires browser camera permission and network access for the model assets.
