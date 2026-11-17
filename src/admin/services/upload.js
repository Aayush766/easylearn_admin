import { apiClient } from "./api";

export async function uploadAdminMedia(file, resourceType = "image") {
  if (!file) throw new Error("Choose a file to upload.");
  if (!["image", "video", "raw"].includes(resourceType)) throw new Error("Unsupported media type.");
  const extension = resourceType === "raw" ? String(file.name.split(".").pop() || "").toLowerCase() : "";
  if (resourceType === "raw" && !extension) throw new Error("The selected document must have a file extension.");

  const signedResponse = await apiClient.post("/api/uploads/signature", { resourceType, extension });
  const signed = signedResponse.data?.data ?? signedResponse.data;
  if (!signed?.cloudName || !signed.apiKey || !signed.timestamp || !signed.folder || !signed.publicId || !signed.signature) {
    throw new Error("The server returned an incomplete Cloudinary upload signature.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("folder", signed.folder);
  body.append("allowed_formats", signed.allowedFormats);
  body.append("public_id", signed.publicId);
  body.append("overwrite", String(signed.overwrite));
  body.append("signature", signed.signature);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
  let response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`, {
      method: "POST",
      body,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The upload timed out. Try a smaller file or check your connection.");
    throw new Error("Could not reach Cloudinary. Check your internet connection and try again.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  let result;
  try { result = JSON.parse(responseText); }
  catch { throw new Error(`Cloudinary returned an unreadable response (${response.status}).`); }
  if (!response.ok) throw new Error(result.error?.message || `Cloudinary upload failed (${response.status}).`);
  if (!result.secure_url || !result.public_id) throw new Error("Cloudinary did not return the uploaded file URL.");
  return { publicId: result.public_id, url: result.secure_url };
}

export async function uploadAdminImage(file) {
  return uploadAdminMedia(file, "image");
}

export async function uploadAdminVideo(file) {
  return uploadAdminMedia(file, "video");
}
export async function uploadCloudflareImage(file) {
  if (!file) throw new Error("Choose an image to upload.");
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) throw new Error("Choose a PNG, JPG, WEBP, or GIF image.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Certificate images must be 10 MB or smaller.");

  const response = await apiClient.post("/api/uploads/cloudflare-image", {});
  const authorization = response.data?.data ?? response.data;
  if (!authorization?.uploadUrl || !authorization.imageId) throw new Error("The server did not return a Cloudflare upload URL.");

  const body = new FormData();
  body.append("file", file);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
  let uploadResponse;
  try {
    uploadResponse = await fetch(authorization.uploadUrl, { method: "POST", body, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The Cloudflare upload timed out. Try a smaller image or retry.");
    throw new Error("Could not reach Cloudflare Images. Check your connection and try again.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await uploadResponse.text();
  let result;
  try { result = JSON.parse(text); }
  catch { throw new Error(`Cloudflare Images returned an unreadable response (${uploadResponse.status}).`); }
  if (!uploadResponse.ok || result.success === false) throw new Error(result.errors?.[0]?.message || `Cloudflare image upload failed (${uploadResponse.status}).`);
  const url = result.result?.variants?.[0] || (authorization.deliveryHash ? `https://imagedelivery.net/${authorization.deliveryHash}/${authorization.imageId}/public` : "");
  if (!url) throw new Error("Cloudflare uploaded the image but did not return a delivery URL. Configure CLOUDFLARE_IMAGES_DELIVERY_HASH on the server.");
  return { id: authorization.imageId, url };
}

