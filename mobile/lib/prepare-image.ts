import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export const IOS_IMAGE_PICKER = {
  mediaTypes: ["images"] as ImagePicker.MediaType[],
  quality: 0.8,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

/** Stay under Vercel’s ~4.5 Mo body limit (and the former 2 Mo /api/upload cap). */
const MAX_UPLOAD_BYTES = Math.floor(1.8 * 1024 * 1024);
const FIRST_EDGE = 1600;

function fileBytes(uri: string): number {
  try {
    const size = new File(uri).size;
    return typeof size === "number" && Number.isFinite(size) ? size : 0;
  } catch {
    return 0;
  }
}

/** Force JPEG and shrink like Android `buildImageUploadPart` so iPhone photos upload. */
export async function prepareImageUpload(asset: {
  uri: string;
  width?: number | null;
  height?: number | null;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<{ uri: string; name: string; type: string }> {
  try {
    const srcW = asset.width ?? 0;
    const srcH = asset.height ?? 0;
    const longest = Math.max(srcW, srcH);
    let edge = longest > FIRST_EDGE ? FIRST_EDGE : longest || FIRST_EDGE;
    let compress = 0.75;
    const firstResize =
      longest > FIRST_EDGE
        ? srcW >= srcH
          ? [{ resize: { width: edge } }]
          : [{ resize: { height: edge } }]
        : [];
    let result = await ImageManipulator.manipulateAsync(asset.uri, firstResize, {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    for (let i = 0; i < 6; i++) {
      const size = fileBytes(result.uri);
      if (size > 0 && size <= MAX_UPLOAD_BYTES) break;
      if (size === 0 && i > 0) break;
      edge = Math.max(640, Math.round(edge * 0.75));
      compress = Math.max(0.45, compress - 0.1);
      result = await ImageManipulator.manipulateAsync(
        result.uri,
        [{ resize: { width: edge } }],
        {
          compress,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
    }

    return {
      uri: result.uri,
      name: `photo-${Date.now()}.jpg`,
      type: "image/jpeg",
    };
  } catch {
    const name = asset.fileName || `photo-${Date.now()}.jpg`;
    const mime = (asset.mimeType || "").toLowerCase();
    const type =
      mime === "image/jpg" || mime === "image/pjpeg" || mime.includes("heic")
        ? "image/jpeg"
        : mime || "image/jpeg";
    return { uri: asset.uri, name: name.replace(/\.(heic|heif)$/i, ".jpg"), type };
  }
}
