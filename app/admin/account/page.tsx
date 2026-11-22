import { requireStaff } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export default async function AccountPage() {
  const me = await requireStaff();
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-bold">My account</h1>
      <div className="card text-sm">
        <div className="font-medium">{me.full_name}</div>
        <div className="text-muted">{me.email} · {me.role}</div>
      </div>
      <h2 className="font-semibold">Change password</h2>
      <PasswordForm />
    </div>
  );
}
