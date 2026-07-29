"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Re-runs the server component so the repository list is fetched again. A
 * link to the current route would be served from the router cache and would
 * not retry anything.
 */
export function Retry() {
  const router = useRouter();
  return (
    <Button variant="primary" onClick={() => router.refresh()}>
      Try again
    </Button>
  );
}
