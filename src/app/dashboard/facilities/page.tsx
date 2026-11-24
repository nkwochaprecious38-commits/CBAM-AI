"use client";
import { PageHeader } from "@/components/dash/ui";
import { ResourceManager } from "@/components/dash/ResourceManager";
import { facilitiesCfg } from "@/lib/modules";

export default function Page() {
  return (<><PageHeader title="Production Facilities" desc="Maintain the facilities where your products are made. Link them to suppliers and products." /><ResourceManager cfg={facilitiesCfg} /></>);
}
