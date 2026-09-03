import { NextResponse } from "next/server";
import { bySlug } from "@/lib/agents/definitions";
import { IDENTITY_REGISTRY } from "@/lib/chain/abi";

export const dynamic = "force-dynamic";

/**
 * The ERC-8004 agent card, in the shape the registry's own agents publish.
 * This is what an agent's tokenURI points at, and what Assay's indexer fetches
 * and probes like any other card on the registry.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const def = bySlug(slug);
  if (!def) return NextResponse.json({ error: "no such agent" }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? new URL(req.url).origin;
  const endpoint = `${origin}/api/agents/${def.slug}`;

  return NextResponse.json(
    {
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: def.name,
      description: def.description,
      image: `${origin}/icon.svg`,
      active: true,
      version: "1.0.0",
      services: [
        { name: "web", endpoint },
        { name: "A2A", version: "1.0.0", endpoint, a2aSkills: [def.category] },
      ],
      skills: [
        {
          id: `assay_${def.slug}`,
          name: def.name,
          description: def.does,
          tags: [def.category, "bnb-chain", "erc-8004"],
          inputs: def.inputs,
        },
      ],
      capabilities: { streaming: false },
      supportedTrust: ["reputation"],
      defaultInputModes: ["text/plain", "application/json"],
      defaultOutputModes: ["application/json"],
      registrations: [{ agentRegistry: `eip155:56:${IDENTITY_REGISTRY}` }],
      userInterface: `${origin}/category/${def.category}`,
      documentationUrl: `${origin}/#method`,
    },
    { headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } },
  );
}
