# City image upload

Plan para reemplazar el campo de URL manual en el admin por un file picker con upload directo a Supabase Storage.

---

## Estado actual

- `cities.image_url` — columna `text NULL` (migración `053_cities_image_url.sql`, pendiente de commitear y aplicar)
- `city-edit-view.tsx` — `<input type="url">` donde el admin pega una URL externa (Unsplash, etc.)
- No hay upload de archivo ni procesamiento de imagen

---

## Objetivo

El admin puede subir una foto desde su dispositivo. El sistema la convierte a WebP, la sube al bucket existente `asset-images`, y guarda la URL pública en `cities.image_url`.

No se usan variantes múltiples (sm/lg) porque la imagen de ciudad solo aparece como hero en la página de detalle, nunca en thumbnails.

---

## Infraestructura existente reutilizable

| Pieza | Archivo | Nota |
|-------|---------|------|
| Bucket | `asset-images` | Ya existe, usado por fictions/places/scenes |
| Upload + WebP | `lib/asset-images/image-variant-service.ts` → `uploadEntityImage()` | `EntityType` ya incluye `"city"` |
| Validación de archivo | `validateImageFile()` en el mismo archivo | Límite 10 MB, tipos: jpg/png/webp/gif |
| Patrón de referencia | `uploadFictionImageAction` en `fiction.actions.ts:282` | Copiar estructura |
| Vista de referencia | `fiction-edit-view.tsx:257` | File picker + preview + spinner |

No hay que crear bucket ni nueva función de storage.

---

## Cambios necesarios

### 1. Migration — commitear el archivo existente

```bash
git add supabase/migrations/053_cities_image_url.sql
```

Aplicar en producción antes del deploy del código (ya está en disco, solo falta commitear y correr `supabase db push`).

### 2. Server Action — `src/cities/infrastructure/next/city.actions.ts`

Agregar `uploadCityImageAction`:

```ts
export async function uploadCityImageAction(
  cityId: string,
  formData: FormData,
): Promise<{ success: true; imageUrl: string } | { success: false; error: string }> {
  const file = formData.get("file") as File | null
  if (!file || !(file instanceof File) || file.size === 0)
    return { success: false, error: "No file provided" }

  const validationError = validateImageFile(file)
  if (validationError) return { success: false, error: validationError }

  const result = await uploadEntityImage({
    entityType: "city",
    entityId: cityId,
    role: "cover",
    variants: ["lg"],
    file,
    replace: true,
  })
  if (!result.success) return result

  const updated = await citiesRepo.update(cityId, { image_url: result.urls.lg })
  if (!updated) return { success: false, error: "Failed to save image URL" }

  revalidatePath(`/admin/cities/${cityId}`)
  revalidatePath(`/cities/${cityId}`)
  return { success: true, imageUrl: result.urls.lg }
}
```

### 3. UI — `components/admin/city-edit-view.tsx`

Reemplazar el bloque del `<input type="url">` por un file picker con preview:

- Mostrar preview de la imagen actual (`formData.image_url`) si existe
- Botón "Upload photo" abre `<input type="file" accept="image/*">`
- Al seleccionar archivo: llamar `uploadCityImageAction`, mostrar spinner, actualizar preview con la URL devuelta
- Mantener el campo URL como fallback oculto (se actualiza automáticamente tras el upload)
- Mostrar error inline si el upload falla

Patrón a seguir: `fiction-edit-view.tsx` líneas 77–160 (manejo de `coverImage` state + `handleCoverUpload`).

### 4. Schema — `src/cities/domain/city.schemas.ts`

Verificar que `UpdateCityData` incluye `image_url?: string | null`. Ya está según el diff actual, solo confirmar.

---

## Orden de ejecución

1. Commitear y aplicar migración `053`
2. Agregar `uploadCityImageAction`
3. Actualizar `city-edit-view.tsx`
4. Probar: subir imagen → verificar en Storage bucket bajo `city/{cityId}/cover/` → verificar URL en `cities.image_url`

---

## Consideraciones

- **RLS en Storage**: verificar que el bucket `asset-images` tiene política de insert para usuarios autenticados con rol `admin`. Las fictions ya funcionan con esta política, las cities deberían estar cubiertas por la misma regla genérica.
- **Cleanup**: si el admin sube una nueva imagen, `replace: true` en `uploadEntityImage` borra la anterior del bucket automáticamente.
- **Sin variantes**: a diferencia de fictions, se genera solo `lg` (800px). Si en el futuro se necesita una versión thumbnail para listados, agregar `"sm"` al array de variants y actualizar `city.entity.ts` con un campo `image_url_sm`.
