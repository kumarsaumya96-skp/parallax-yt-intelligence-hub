import { ParallaxWelcome } from "@/components/parallax-welcome";

interface HomeProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const requested = (await searchParams).next;
  const nextPath =
    requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/overview";
  return <ParallaxWelcome nextPath={nextPath} />;
}
