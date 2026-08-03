import { SettingsPage } from "@/components/settings/settings-page"
import { getSessionAccount } from "@/src/users/infrastructure/next/user.queries"

export default function SettingsRoute() {
  // Not awaited: the shell renders immediately and each section streams in.
  const accountPromise = getSessionAccount()
  return <SettingsPage accountPromise={accountPromise} />
}
