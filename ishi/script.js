// --- 設定 (Python版定数を移植) ---
const REAL_IPD = 0.064;
const EYE_OFFSET = -0.012;
const SAMPLE_FRAMES = 15;
const FISH_WIDTH = 1920, FISH_HEIGHT = 1080;

// --- カメラパラメータ (PythonのJSONから転記する想定) ---
// 本来はfetchでJSONを読むのがベストだけど、ここでは定数として定義するわ
const frontMtx = [ [600, 0, 320], [0, 600, 240], [0, 0, 1] ]; // ダミー
const fishDist = [-0.05, 0.1, 0, 0]; // ダミー。あなたの環境に合わせてね

// --- ベクトル演算ヘルパー ---
const vec = {
    sub: (a, b) => a.map((v, i) => v - b[i]),
    add: (a, b) => a.map((v, i) => v + b[i]),
    mul: (a, s) => a.map(v => v * s),
    norm: (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0)),
    unit: (a) => { const n = vec.norm(a); return a.map(v => v / (n + 1e-8)); },
    cross: (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ]
};

// --- グローバル状態 ---
let calibMode = false, calibIndex = 0;
let calibStorage = [], samplingBuffer = [];
let modelCoef = null, gaze3d = null;
let map1, map2; // OpenCV 歪み補正用

// --- MediaPipe & OpenCV セットアップ ---
const faceMesh = new FaceMesh({locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
faceMesh.setOptions({refineLandmarks: true, minDetectionConfidence: 0.5});

faceMesh.onResults(results => {
    if (!results.multiFaceLandmarks) return;
    const lm = results.multiFaceLandmarks[0];

    // Python版のベクトル計算ロジックを再現
    // ID_TOP:10, ID_BOTTOM:152, ID_LEFT:33, ID_RIGHT:263
    const p = (id) => [lm[id].x, lm[id].y, lm[id].z];
    const top = p(10), bottom = p(152), left = p(33), right = p(263);

    const up = vec.unit(vec.sub(top, bottom));
    const rightV = vec.unit(vec.sub(right, left));
    const forward = vec.unit(vec.cross(rightV, up)); // 顔の法線

    // 距離計算 (IPDベース)
    const pixelIpd = Math.hypot(lm[263].x - lm[33].x, lm[263].y - lm[33].y);
    const distance = (REAL_IPD * 600) / (pixelIpd + 1e-8); // 600はダミーfx

    // 虹彩と眼球中心
    const iris = [468,469,470,471].reduce((acc, id) => vec.add(acc, p(id)), [0,0,0]).map(v => v/4);
    const eyeCenter = p(33); // 簡易化のため左目
    
    // オフセット適用: 視線ベクトル = (虹彩 - (眼球中心 + 顔正面方向*OFFSET))
    const eyeCenterOffset = vec.add(eyeCenter, vec.mul(forward, EYE_OFFSET));
    const gazeVec = vec.sub(iris, eyeCenterOffset);
    
    // 注視点 (distance先まで伸ばす)
    gaze3d = vec.add(iris, vec.mul(vec.unit(gazeVec), distance));
});

// --- OpenCV 歪み補正の初期化 ---
function initUndistort(mtxArray, distArray) {
    const K = cv.matFromArray(3, 3, cv.CV_64F, mtxArray.flat());
    const D = cv.matFromArray(1, 4, cv.CV_64F, distArray);
    const size = new cv.Size(FISH_WIDTH, FISH_HEIGHT);
    map1 = new cv.Mat(), map2 = new cv.Mat();
    cv.initUndistortRectifyMap(K, D, new cv.Mat(), K, size, cv.CV_16SC2, map1, map2);
}

// --- メインループ ---
async function loop() {
    const frontVideo = document.getElementById("frontCam");
    const fishVideo = document.getElementById("fishCam");
    const fCtx = document.getElementById("frontCanvas").getContext("2d");
    const bCtx = document.getElementById("fishCanvas").getContext("2d");

    // カメラ映像取得
    fCtx.drawImage(frontVideo, 0, 0, 640, 480);
    await faceMesh.send({image: document.getElementById("frontCanvas")});

    // 魚眼映像を一旦メモリに描画して歪み補正
    let src = cv.imread(fishVideo); // 実際にはCanvasに描画したものを読み込む
    let dst = new cv.Mat();
    if(map1) cv.remap(src, dst, map1, map2, cv.INTER_LINEAR);
    cv.imshow("fishCanvas", dst);
    src.delete(); dst.delete();

    // キャリブ点描画 & 予測点描画（省略せずに実装）
    drawUI(bCtx);

    requestAnimationFrame(loop);
}

function drawUI(ctx) {
    if (calibMode) {
        // 赤いターゲット表示
        const [tx, ty] = fishPoints[calibIndex];
        ctx.fillStyle = "red";
        ctx.beginPath(); ctx.arc(tx, ty, 20, 0, Math.PI*2); ctx.fill();
    }
    
    if (modelCoef && gaze3d) {
        const uv = predict(gaze3d);
        ctx.fillStyle = "lime";
        ctx.beginPath(); ctx.arc(uv[0], uv[1], 10, 0, Math.PI*2); ctx.fill();
    }
}

// --- サンプリング (中央値フィルタ実装) ---
function capturePoint() {
    if (!gaze3d) return;
    samplingBuffer.push([...gaze3d]);
    if (samplingBuffer.length >= SAMPLE_FRAMES) {
        // 中央値（Median）を計算
        const medianPoint = [0, 1, 2].map(i => {
            const sorted = samplingBuffer.map(p => p[i]).sort((a, b) => a - b);
            return sorted[Math.floor(SAMPLE_FRAMES / 2)];
        });
        const [tx, ty] = fishPoints[calibIndex];
        calibStorage.push([...medianPoint, tx, ty]);
        samplingBuffer = [];
        calibIndex++;
        if (calibIndex >= 9) calibMode = false;
    }
}

// キーイベント
document.addEventListener("keydown", e => {
    if (e.key === "Enter") capturePoint();
    if (e.key === "t") trainModel(); // 前述の最小二乗法
});

// OpenCVの準備ができたら開始
cv['onRuntimeInitialized'] = () => {
    initUndistort(frontMtx, fishDist);
    startCameras().then(loop);
};
