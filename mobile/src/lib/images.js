import * as Picker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import { fetch } from "expo/fetch";
import { config } from "./config";

export async function pickImage(camera = false) {
  if (camera) {
    const permission = await Picker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Camera permission is required to take a photo. You can choose an existing photo instead.",
      );
  }
  /** @type {import('expo-image-picker').ImagePickerOptions} */
  const options = {
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
    exif: false,
  };
  const result = await (camera
    ? Picker.launchCameraAsync(options)
    : Picker.launchImageLibraryAsync(options));
  return result.canceled ? null : result.assets[0];
}
export function cleanupImage(asset) {
  try {
    if (asset?.uri?.startsWith(Paths.cache.uri)) {
      const file = new File(asset.uri);
      if (file.exists) file.delete();
    }
  } catch {
    /* The system may already have cleared this picker cache. */
  }
}
export async function uploadImage(asset, purpose, getToken) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > 2400)
    context.resize(
      asset.width > asset.height
        ? { width: 2400, height: null }
        : { height: 2400, width: null },
    );
  const rendered = await context.renderAsync(),
    result = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.88,
    });
  const file = new File(result.uri);
  try {
    if (file.size > 5 * 1024 * 1024)
      throw new Error(
        "Each image must be 5 MB or smaller. Please choose a smaller image.",
      );
    const token = await getToken();
    if (!token) throw new Error("Please sign in again before uploading.");
    const response = await fetch(`${config.siteUrl}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/jpeg",
        "X-Upload-Purpose": purpose,
      },
      body: file,
    });
    const body = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(body.error || "Unable to upload this image."),
        { data: body.error || "Unable to upload this image." },
      );
    return body.storageId;
  } finally {
    if (file.exists) file.delete();
  }
}
