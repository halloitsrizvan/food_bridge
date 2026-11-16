import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "@/components/auth/auth-form";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthLayout title="Join FoodBridge" subtitle="Takes a minute. Details like your location come next.">
      <SignupForm />
    </AuthLayout>
  );
}
