import type { AssetRoleFormatInventory } from "@/src/asset-images/domain/asset-image.entity"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function weightSuffix(byteLength: number | null): string {
  if (byteLength == null) return ""
  return ` · ${formatBytes(byteLength)}`
}

type AssetVariantFormatChecklistProps = {
  inventory: AssetRoleFormatInventory
  className?: string
  showSkipHint?: boolean
}

export function AssetVariantFormatChecklist({
  inventory,
  className,
  showSkipHint = true,
}: AssetVariantFormatChecklistProps) {
  if (inventory.variants.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Format: none
      </p>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      <ul className="space-y-0.5 font-mono text-[11px] leading-snug">
        {inventory.variants.map((item) => {
          if (!item.present) {
            return (
              <li key={item.variant} className="text-amber-700 dark:text-amber-400">
                — {item.variant} missing
              </li>
            )
          }
          if (item.ok) {
            return (
              <li key={item.variant} className="text-emerald-600 dark:text-emerald-400">
                avif {item.variant} ok{weightSuffix(item.byteLength)}
              </li>
            )
          }
          return (
            <li key={item.variant} className="text-foreground">
              {item.format} {item.variant}
              {weightSuffix(item.byteLength)}
            </li>
          )
        })}
      </ul>
      {showSkipHint && inventory.allAvifOk ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          All AVIF — skip unless you want a new photo.
        </p>
      ) : null}
    </div>
  )
}
