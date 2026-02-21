import Link from "next/link";
import { Scale } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-80"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg">
          <Scale className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="text-2xl font-bold text-primary">Tabeliao</span>
          <p className="text-xs text-muted-foreground">
            Cartorio Digital Inteligente
          </p>
        </div>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
