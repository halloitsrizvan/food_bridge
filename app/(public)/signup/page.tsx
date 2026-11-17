import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "@/components/auth/auth-form";
import { DemoAccounts } from "@/components/auth/demo-accounts";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthLayout kind="signup">
      <SignupForm />
      <DemoAccounts />
    </AuthLayout>
  );
}
