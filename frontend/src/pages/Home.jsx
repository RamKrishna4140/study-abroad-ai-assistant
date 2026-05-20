import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import FeatureCard from "../components/FeatureCard";
import { FileText, MessageSquareText, GraduationCap } from "lucide-react";

function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto flex min-h-[80vh] max-w-6xl flex-col items-center justify-center px-6 pt-24 text-center">
          <p className="mb-4 rounded-full bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            AI-Powered Study Abroad Platform
          </p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
            Find the right university with the help of AI
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Upload documents, ask admission questions, check eligibility, and
            get personalized study abroad guidance using RAG and LLM technology.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              to="/chat"
              className="rounded-xl bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600"
            >
              Start Analysis
            </Link>

            <button className="rounded-xl border border-slate-700 px-6 py-3 font-medium text-slate-200 hover:bg-slate-900">
              View Demo
            </button>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              title="Document Analysis"
              description="Upload SOPs, CVs, transcripts, and brochures for AI-powered evaluation."
            />

            <FeatureCard
              title="RAG-Based Answers"
              description="Ask admission questions and receive answers based on uploaded university documents."
            />

            <FeatureCard
              title="University Matching"
              description="Get personalized university suggestions based on academics, goals, and eligibility."
            />
          </div>
        </section>
      </main>
    </>
  );
}

export default Home;
