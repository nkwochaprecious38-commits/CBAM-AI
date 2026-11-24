"use client";
import { PageHeader } from "@/components/dash/ui";
import { ResourceManager } from "@/components/dash/ResourceManager";
import { productsCfg } from "@/lib/modules";

export default function Page() {
  return (<><PageHeader title="Products" desc="Manage the products you import, their CN codes, categories and linked suppliers and facilities." /><ResourceManager cfg={productsCfg} /></>);
}
