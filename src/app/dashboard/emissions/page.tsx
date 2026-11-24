"use client";
import { useState } from "react";
import { PageHeader, Tabs, Notice } from "@/components/dash/ui";
import { ResourceManager } from "@/components/dash/ResourceManager";
import { recordsCfg, activityCfg, factorsCfg, methodsCfg, evidenceCfg } from "@/lib/modules";

const tabs: [string, string][] = [["records", "Emissions records"], ["activity", "Activity data"], ["factors", "Emissions factors"], ["methods", "Methodologies"], ["evidence", "Carbon price evidence"]];
export default function Page() {
  const [tab, setTab] = useState("records");
  return (
    <>
      <PageHeader title="Emissions Data" desc="One workspace for direct, indirect and precursor emissions, activity data, factors, methodologies and evidence." />
      <div className="mb-4"><Notice>Every value carries a source, measurement period and data status. Basis is shown as actual, default or estimated. Values stay pending verification until your team marks them verified. Verification by an accredited verifier is separate and is not performed by CBAM AI.</Notice></div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "records" && <ResourceManager cfg={recordsCfg} />}
      {tab === "activity" && <ResourceManager cfg={activityCfg} />}
      {tab === "factors" && <ResourceManager cfg={factorsCfg} />}
      {tab === "methods" && <ResourceManager cfg={methodsCfg} />}
      {tab === "evidence" && <ResourceManager cfg={evidenceCfg} />}
    </>
  );
}
