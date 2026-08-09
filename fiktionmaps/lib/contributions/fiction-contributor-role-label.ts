import type {
  ContributionEntityType,
  ContributionType,
  FictionScopeContributorContributionItem,
} from "@/src/contributions/domain/contribution.entity"

export type FictionContributorActionKey =
  | "contributorModalAction_create_fiction"
  | "contributorModalAction_create_place"
  | "contributorModalAction_add_photo_fiction"
  | "contributorModalAction_add_photo_place"
  | "contributorModalAction_add_scene"
  | "contributorModalAction_add_credits"
  | "contributorModalAction_enrich_entity_fiction"
  | "contributorModalAction_enrich_entity_place"
  | "contributorModalAction_correct_data"
  | "contributorModalAction_mark_inaccessible"
  | "contributorModalAction_add_tip"
  | "contributorModalAction_checkin"

function getActionKey(type: ContributionType, entityType: ContributionEntityType): FictionContributorActionKey {
  if (type === "add_photo") {
    return entityType === "place"
      ? "contributorModalAction_add_photo_place"
      : "contributorModalAction_add_photo_fiction"
  }

  if (type === "enrich_entity") {
    return entityType === "place"
      ? "contributorModalAction_enrich_entity_place"
      : "contributorModalAction_enrich_entity_fiction"
  }

  return `contributorModalAction_${type}` as FictionContributorActionKey
}

export function getFictionContributorActionFromItem(
  item: FictionScopeContributorContributionItem,
): { key: FictionContributorActionKey; params: { place: string } } {
  return {
    key: getActionKey(item.type, item.entityType),
    params: { place: item.entityLabel?.trim() ?? "" },
  }
}
