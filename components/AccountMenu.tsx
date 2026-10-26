"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadExcelExport, downloadJsonExport } from "@/lib/export";
import { remoteStore } from "@/lib/store/remote";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SetPasswordDialog } from "@/components/SetPasswordDialog";

export function AccountMenu({ email }: { email: string }) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  async function handleExport(download: () => Promise<void>) {
    try {
      await download();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not export your data.");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Account menu for ${email}`}
              title={email}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
            />
          }
        >
          {email.charAt(0).toUpperCase()}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="max-w-56 truncate px-1.5 py-1 text-xs font-medium text-muted-foreground">
            {email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
            Set password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport(() => downloadExcelExport(remoteStore))}>
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport(() => downloadJsonExport(remoteStore, email))}>
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SetPasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </>
  );
}
