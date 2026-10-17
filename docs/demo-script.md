# 2–3 minute demo script

## Setup

- Run `npm run dev` and open `http://localhost:5173`.
- For the TinyFish segment, configure a server-side `TINYFISH_API_KEY` in `.env` and restart the API. Without a key, use the offline-state backup—never describe it as a live search.
- Use a browser that supports speech synthesis. If speech recognition is unavailable, type commands.
- Camera is optional; do not promise accurate eye tracking.

## Walkthrough

1. **Problem (20 sec):** “Scholarship details are scattered across the web, and dense pages can make it hard to find the information that matters.”
2. **TinyFish live discovery (30 sec):** search “engineering scholarships for women in India”. Show results marked LIVE · TINYFISH and open a source. “TinyFish searches the live web; its result is a lead, not an official eligibility decision.”
3. **Accessible navigation (30 sec):** type “Find the registration form”. The page scrolls and highlights the local sample form.
4. **Read and explain (35 sec):** type “Read eligibility” and then “Explain this simply”. Emphasize the fictional-demo disclaimer and that the explanation uses only visible sample facts.
5. **Safety (25 sec):** choose “Review demo application”. Point out the explicit confirmation, then confirm. “This changes only the local demo state; there is no submission endpoint.”
6. **Optional experiment (20 sec):** opt in to the camera if desired. Re-center the approximate face-position pointer, then turn it off. “This is a prototype, not eye tracking, and it cannot activate controls.”
7. **Close (10 sec):** press Stop and show the typed fallback.

## Backup

- If TinyFish is not configured or the network fails, show its explicit offline/error message, then continue with the local sample page. Explain that the live segment needs the server API key and connection.
- If microphone permission is denied or recognition is unsupported, type the same exact commands into the assistant.
- Skip the camera if permission, CDN/model loading, or calibration is unreliable. Voice, keyboard, and typed commands remain the primary demo path.
