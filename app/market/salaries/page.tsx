import { redirect } from "next/navigation";

export default function SalaryResearchPage() {
  redirect("/market?tab=salary");
}
