import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/auth-form";
import { DemoAccounts } from "@/components/auth/demo-accounts";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Log in to share or receive food.">
      <LoginForm />
      <DemoAccounts />
    </AuthLayout>
  );
}
