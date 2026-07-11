import Link from "next/link";

/** Shared layout for the login and registration cards. */
export function AuthFormShell({
  title,
  footer,
  children,
}: {
  title: string;
  footer: { prompt: string; linkLabel: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6">{children}</div>
      <p className="mt-6 text-sm text-zinc-600">
        {footer.prompt}{" "}
        <Link href={footer.href} className="font-medium text-zinc-900 underline">
          {footer.linkLabel}
        </Link>
      </p>
    </main>
  );
}
