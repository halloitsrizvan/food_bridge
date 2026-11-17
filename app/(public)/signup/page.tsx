import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "@/components/auth/auth-form";
import { DemoAccounts } from "@/components/auth/demo-accounts";

export const metadata = {
  title: "Create an account",
  description: "Join FoodBridge as a food giver (restaurant, caterer, home) or receiver (charity, institution, family). Free and government run.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <AuthLayout kind="signup">
      <SignupForm />
      <DemoAccounts />
    </AuthLayout>
  );
}
