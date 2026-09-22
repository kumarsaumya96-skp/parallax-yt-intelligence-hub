import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PARALLAX_SESSION_COOKIE, verifySessionToken } from "@/lib/parallax-session";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const requested = (await searchParams).next;
  const nextPath =
    requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/overview";
  const token = (await cookies()).get(PARALLAX_SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) redirect(nextPath);
  return <LoginForm nextPath={nextPath} />;
}
