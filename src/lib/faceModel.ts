/** Loads the small on-device face model (MediaPipe). Downloaded once from jsDelivr and Google, then runs in the browser. Nothing is uploaded. */
const VER = "0.10.14";
export interface FaceResult { faceLandmarks?: { x: number; y: number }[][]; faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[] }
export interface Landmarker { detectForVideo: (v: HTMLVideoElement, ts: number) => FaceResult; close: () => void }
export async function loadLandmarker(blendshapes = false): Promise<Landmarker> {
  const mod = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + VER + "/vision_bundle.mjs");
  const fileset = await mod.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + VER + "/wasm");
  return mod.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" }, runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: blendshapes });
}
