"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useT } from "@/lib/i18n";
import { clearOfflineData } from "@/lib/pwa";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** "Log out?" popup shared by every logout button. Confirming clears saved offline data and the session. */
export function LogoutConfirm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await clearOfflineData();
      await createSupabaseBrowserClient().auth.signOut();
      qc.clear();
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
      onOpenChange(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      title={t.common.logoutTitle}
      description={t.common.logoutBody}
      confirmLabel={t.common.logout}
      cancelLabel={t.common.cancel}
      busyLabel={t.common.pleaseWait}
      destructive
      busy={busy}
      onConfirm={() => void logout()}
    />
  );
}
