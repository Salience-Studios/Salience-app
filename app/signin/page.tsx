import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button, Eyebrow, Panel } from "@/components/ui";

export default async function SignIn() {
  const session = await auth();
  if (session?.user) redirect("/workspaces");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-[var(--s-6)] px-[var(--s-4)] py-[var(--s-7)]">
      <div className="flex flex-col gap-[var(--s-3)]">
        <Eyebrow>Salience</Eyebrow>
        <h1 className="heading-lg text-3xl font-semibold">
          Same outputs. A fraction of the tokens.
        </h1>
        <p className="text-sm text-[var(--text-dim)]">
          Your workspace lives in your own GitHub repository. Salience writes the
          structure and runs each stage against only what that stage declares.
        </p>
      </div>

      <Panel className="p-[var(--s-5)]">
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/workspaces" });
          }}
        >
          <Button variant="primary" type="submit" className="w-full">
            Continue with GitHub
          </Button>
        </form>
        <p className="mt-[var(--s-3)] text-sm text-[var(--text-muted)]">
          Salience reads and writes only the repositories you install it on.
        </p>
      </Panel>
    </main>
  );
}
