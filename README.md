# Topic Generator

Tap **Go**, get one interesting topic to research for ~30 minutes and talk about. Runs locally on your Mac and uses Google Gemini (free tier).

## Setup

1. Get a Gemini API key at https://aistudio.google.com/apikey
2. Create `.env.local` in this folder:
   ```
   GEMINI_API_KEY=your-key-here
   ```
3. Install and run:
   ```
   npm install
   npm start
   ```
4. Open http://localhost:3000

The topic areas and the prompt live at the top of `server.js`.
