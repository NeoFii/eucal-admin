import { redirect } from "next/navigation";

export default function NewModelRedirectPage() {
  redirect("/models?notice=select-vendor");
}
