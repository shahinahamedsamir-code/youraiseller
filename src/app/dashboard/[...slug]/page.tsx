import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

type Props = { params: { slug: string[] } };

export default function PlaceholderPage({ params }: Props) {
  const path = params.slug?.join(" / ") ?? "Page";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-violet-500 text-white shadow-lg">
        <Construction className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold capitalize text-slate-900">
        {path.replace(/-/g, " ")}
      </h1>
      <p className="mt-2 max-w-md text-slate-500">
        UI shell is ready. Backend &amp; full module logic will connect in the
        next phase.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-teal-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
