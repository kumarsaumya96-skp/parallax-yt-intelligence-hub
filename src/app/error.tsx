"use client";
import { Button, Card } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) { return <Card className="mx-auto max-w-xl p-8 text-center"><h1 className="text-xl font-bold">This screen could not load</h1><p className="mt-2 text-sm text-[var(--muted)]">The error has been isolated to this route. Retry or check Data Health for provider failures.</p><Button className="mt-5" onClick={reset}>Try again</Button></Card>; }
