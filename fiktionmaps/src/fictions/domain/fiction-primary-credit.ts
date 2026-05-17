import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import type { FictionPersonRole } from "@/src/persons/domain/person.entity"

/** Primary creative credit stored on `fiction_persons` and denormalized to `fictions.author`. */
export function getFictionPrimaryCreditRole(type: Fiction["type"]): FictionPersonRole {
  return type === "book" ? "author" : "director"
}
