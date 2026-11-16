import { NeedForm } from "@/components/forms/need-form";

export const metadata = { title: "Post a need" };

export default function NewNeedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Post a need</h1>
        <p className="text-muted-foreground">Givers near you can see it and offer food that fits.</p>
      </div>
      <NeedForm />
    </div>
  );
}
