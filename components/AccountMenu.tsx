"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton={false}
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
          <DropdownMenuLabel className="max-w-56 truncate font-normal">{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
            Set password
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
