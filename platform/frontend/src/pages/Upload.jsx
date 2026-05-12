import { Link } from "react-router-dom";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20 text-white">
      <div className="rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur">
        <div className="mb-4 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-200">
          Legacy route
        </div>
        <h1 className="mb-3 text-4xl font-bold">Use the new platform workflow</h1>
        <p className="mb-8 text-white/70">
          Uploading source comics and creating video generation jobs now happens in the unified
          project workflow. Start from the platform page to create a project, inspect assets,
          and launch jobs.
        </p>
        <Link
          to="/projects"
          className="inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90"
        >
          Go to Platform
        </Link>
      </div>
    </div>
  );
}
