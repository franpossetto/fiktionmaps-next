import { unstable_cache } from "next/cache"
import { cache } from "react"
import { getAllFictionsUncached, getFictionByIdUncached } from "@/src/server/fictions"

/** Cached 60s; invalidate with revalidateTag("fictions"). */
export const getAllFictions = unstable_cache(
  async () => getAllFictionsUncached(),
  ["fictions"],
  { revalidate: 60, tags: ["fictions"] }
)

/** Per-request dedupe for generateMetadata + page. */
export const getFictionById = cache(getFictionByIdUncached)
