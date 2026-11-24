"use client";
import { PageHeader } from "@/components/dash/ui";
import { ResourceManager } from "@/components/dash/ResourceManager";
import { importsCfg } from "@/lib/modules";

export default function Page() {
  return (<><PageHeader title="Imports" desc="Record imported goods and link them to products, suppliers and reporting periods. Upload many records with CSV." /><ResourceManager cfg={importsCfg} /></>);
}
