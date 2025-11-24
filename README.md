<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ProbeLensAI - Autonomous Technical Interview Platform

ProbeLensAI is an intelligent system that conducts rigorous, adaptive video interviews, analyzing technical depth, facial prosody, and behavioral cues in real-time.

## Features

- AI-powered technical interview analysis
- Real-time candidate evaluation
- Automated question generation
- Comprehensive reporting with PDF export
- Webcam and screen recording capabilities

## Run Locally

**Prerequisites:** Node.js (v16 or higher)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your Gemini API key to `.env.local`
   
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your API key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## Deploy to Vercel

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add your `VITE_GEMINI_API_KEY` as an environment variable in Vercel
4. Deploy!

## Environment Variables

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key (required)

## Learn More

To learn more about the technologies used in this project:

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [Google Gemini API](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## License

This project is licensed under the MIT License.
