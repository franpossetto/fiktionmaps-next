import { createClient } from "@/lib/supabase/server"
import {
  BANNER_UPLOAD_VARIANTS,
  THUMB_UPLOAD_VARIANTS,
} from "@/lib/asset-images/variant-sizes"
import { listAssetRoleFormatInventoryUseCase } from "@/src/asset-images/application/list-asset-role-format-inventory.usecase"
import type { AssetRoleFormatInventory } from "@/src/asset-images/domain/asset-image.entity"
import { createAssetImagesSupabaseAdapter } from "@/src/asset-images/infrastructure/supabase/asset-image.repository.impl"

const assetImagesRepo = createAssetImagesSupabaseAdapter(createClient)

export async function getFictionImprovePhotoInventories(
  fictionId: string,
): Promise<{ cover: AssetRoleFormatInventory; banner: AssetRoleFormatInventory }> {
  const [cover, banner] = await Promise.all([
    listAssetRoleFormatInventoryUseCase(
      {
        entityType: "fiction",
        entityId: fictionId,
        role: "cover",
        expectedVariants: THUMB_UPLOAD_VARIANTS,
      },
      assetImagesRepo,
    ),
    listAssetRoleFormatInventoryUseCase(
      {
        entityType: "fiction",
        entityId: fictionId,
        role: "banner",
        expectedVariants: BANNER_UPLOAD_VARIANTS,
      },
      assetImagesRepo,
    ),
  ])
  return { cover, banner }
}

export async function getPlaceImprovePhotoInventory(
  placeId: string,
): Promise<AssetRoleFormatInventory> {
  return listAssetRoleFormatInventoryUseCase(
    {
      entityType: "place",
      entityId: placeId,
      role: "avatar",
      expectedVariants: THUMB_UPLOAD_VARIANTS,
    },
    assetImagesRepo,
  )
}
