import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { PickedPhoto, PickPhoto } from "./types";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/**
 * 크기를 줄이고 JPEG로 다시 저장한다. 원본의 EXIF(촬영 위치)가 빠지므로
 * 공개 버킷에 올려도 메이트에게 위치가 새지 않는다. 작은 사진도 항상 거친다.
 */
async function reencode({
  uri,
  width,
  height,
}: ImagePicker.ImagePickerAsset): Promise<PickedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE)
    context.resize(
      width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE },
    );
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
  });
  return { uri: saved.uri };
}

/** 앨범은 시스템 선택기를 써서 권한을 묻지 않는다. 카메라만 권한이 필요하다. */
export const pickPhoto: PickPhoto = async (source) => {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: "denied" };
  }
  const launch =
    source === "camera"
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
  const result = await launch({ mediaTypes: ["images"] });
  if (result.canceled) return { status: "cancelled" };
  return { status: "picked", photo: await reencode(result.assets[0]) };
};
