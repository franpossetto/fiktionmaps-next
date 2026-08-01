import { UpdatePasswordForm } from "@/components/auth/update-password-form"

/**
 * Must not server-redirect unauthenticated users: recovery links often arrive
 * with tokens in the URL hash, which only the client can claim.
 */
export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />
}
