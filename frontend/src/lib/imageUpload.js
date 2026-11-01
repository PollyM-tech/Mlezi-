const MAX_SOURCE = 25 * 1024 * 1024
const MAX_UPLOAD = 5 * 1024 * 1024

// Decode locally, correct browser-supported orientation and reduce phone photos
// before sending them to the independently validated private upload endpoint.
export async function prepareUploadImage(file) {
  if (!file.size || file.size > MAX_SOURCE) throw new Error('Choose an image smaller than 25 MB.')
  let bitmap, image, objectUrl
  try {
    if (typeof createImageBitmap === 'function') bitmap = await createImageBitmap(file)
    else {
      objectUrl = URL.createObjectURL(file)
      image = new Image()
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = objectUrl })
    }
    const source = bitmap || image, width = source.width, height = source.height
    if (!width || !height || width * height > 60000000) throw new Error('dimensions')
    const scale = Math.min(1, 2400 / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas')
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88))
    if (!blob || blob.size > MAX_UPLOAD) throw new Error('size')
    return blob
  } catch { throw new Error('This image could not be prepared. Choose a complete JPEG, PNG or WebP photo, or export your phone photo as JPEG and try again.') }
  finally { bitmap?.close(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
}
