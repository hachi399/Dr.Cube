#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
統合版：正面カメラの3D注視点 -> 魚眼画像上の注視点を
(1) 9点キャリブUI（魚眼に9点表示）、
(2) フレーム平均（サンプリング数）＋中央値によるノイズ除去、
(3) 3D->2D 回帰（多項式, 最小二乗）、
(4) リアルタイム投影表示
を一つにまとめたスクリプト。

使い方：
- 実行後、魚眼ウィンドウに赤い点が順に表示されます（1..9）。
- その点を見ている間に Enter キー（またはスペース）を押すと、その点について N フレーム分サンプリングして中央値を記録します。
- 9点すべて記録したら 't' を押すと回帰学習が走り、 "gaze3d_to_fish.npz" に係数を保存します。
- 学習済みモデルが存在すればリアルタイムに魚眼上へ緑の点で注視位置を表示します。
- 'c' でキャリブ再スタート、'q' or ESC で終了。
- 'a' でキャリブの生データをを消さずにキャリブを再スタート
- 's' で歪み補正をした魚眼の画像と注視点を保存する
"""

import cv2 as cv
import mediapipe as mp
import numpy as np
import json
import time
import math
import os
from collections import deque


#path = "G:/dcon 2"
path = "/Users/ishibashi/dcon 2"

# ------------------ ユーザー設定 ------------------
REAL_IPD = 0.064          # [m]
EYE_OFFSET = -0.012         # 顔表面から奥行き[ｍ](奥に行くほど値は小さくなる)
SAVE_FILE = f"{path}/calibration/focal_mediapipe.json"  # 既存のキャリブJSON
CALIB_JSON = f"{path}/calibration/gaze3d_fish_calib.json"
MODEL_NPZ = f"{path}/calibration/gaze3d_to_fish.npz"
FISH_CALIB = f"{path}/calibration/fisheye_focal.json"

# カメラID（環境に合わせて調整）
FISH_CAM_ID = 0  # 魚眼（表示・ターゲット）
IR_CAM_ID   = 1  # 正面カメラ（視線推定）

# 魚眼表示解像度（ウィンドウ上の描画座標基準）
FISH_WIDTH = 1920
FISH_HEIGHT = 1080

# 視線検知カメラ解像度
FRONT_WIDTH = 640
FRONT_HEIGHT = 480

SAMPLE_FRAMES = 15   # 1点あたりのサンプリングフレーム数（多いほど安定）
MIN_SAMPLES = 10     # 最低でもこれだけはサンプリングする

UV_AVG_FRAMES = 10
uv_buffer = deque(maxlen=UV_AVG_FRAMES)

SNAP_FRAMES = 20
snap_buffer = deque(maxlen=SNAP_FRAMES)

SNAP_SAVE_JSON = f"{path}/calibration/gaze_snapshot.json"
snapshots = []   # 保存された平均注視点リスト

SNAP_IMG_DIR = f"{path}/calibration/snap_images"
os.makedirs(SNAP_IMG_DIR, exist_ok=True)

# --------------------------------------------------

# --- カメラキャリブレーションデータ読み込み（既存ファイル） ---
# frontカメラ
with open(SAVE_FILE, "r") as f:
    data = json.load(f)
mtx = np.array(data["camera_matrix"])
dist = np.array(data["dist_coeff"])
focal = float(data.get("focal", mtx[0,0]))
img_shape = tuple(data["img_shape"])

fx = mtx[0, 0]
fy = mtx[1, 1]
cx = mtx[0, 2]
cy = mtx[1, 2]

# fisheyeカメラ
with open(FISH_CALIB, "r") as f:
    fish_data = json.load(f)
fish_mtx = np.array(fish_data["camera_matrix"])
fish_dist = np.array(fish_data["dist_coeff"])
fish_img_shape = tuple(fish_data["img_shape"])
orig_w, orig_h = fish_data["img_shape"]

scale_x = FISH_WIDTH / orig_w
scale_y = FISH_HEIGHT / orig_h
fish_mtx_scaled = fish_mtx.copy().astype(np.float64)
fish_mtx_scaled[0,0] *= scale_x   # fx
fish_mtx_scaled[1,1] *= scale_y   # fy
fish_mtx_scaled[0,2] *= scale_x   # cx
fish_mtx_scaled[1,2] *= scale_y   # cy

now_fish_mtx = fish_mtx_scaled.copy()

map1, map2 = cv.initUndistortRectifyMap(
    fish_mtx_scaled, fish_dist, None, now_fish_mtx, (FISH_WIDTH, FISH_HEIGHT), cv.CV_16SC2
)


# --- MediaPipe --- 
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# --- OneEuroFilter（そのまま） ---
class OneEuroFilter:
    def __init__(self, freq=60, min_cutoff=1.0, beta=0.03, d_cutoff=1.0):
        self.freq = freq
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev = None
        self.dx_prev = None
        self.last_time = None

    def smoothing_factor(self, cutoff):
        r = 2 * math.pi * cutoff
        return r / (r + self.freq)

    def __call__(self, x):
        t = time.time()
        if self.last_time is None:
            self.last_time = t
            self.x_prev = x
            self.dx_prev = 0.0
            return x

        dt = t - self.last_time
        self.last_time = t
        if dt <= 0:
            dt = 1.0 / self.freq
        self.freq = 1.0 / dt

        dx = (x - self.x_prev) * self.freq
        alpha_d = self.smoothing_factor(self.d_cutoff)
        dx_hat = alpha_d * dx + (1 - alpha_d) * self.dx_prev

        cutoff = self.min_cutoff + self.beta * abs(dx_hat)
        alpha = self.smoothing_factor(cutoff)
        x_hat = alpha * x + (1 - alpha) * self.x_prev

        self.x_prev = x_hat
        self.dx_prev = dx_hat
        return x_hat

pitch_filter = OneEuroFilter()
yaw_filter = OneEuroFilter()
roll_filter = OneEuroFilter()

# --- ランドマークID ---
ID_TOP = 10
ID_BOTTOM = 152
ID_LEFT = 33
ID_RIGHT = 263

LEFT_IRIS_IDX = [468, 469, 470, 471]
RIGHT_IRIS_IDX = [473, 474, 475, 476]
LEFT_EYE_OUTER = 33
LEFT_EYE_INNER = 133
RIGHT_EYE_OUTER = 263
RIGHT_EYE_INNER = 362

# --- 便利関数 ---
def lm_to_pixel(lm, w, h):
    return np.array([lm.x * w, lm.y * h], dtype=np.float64)

def pixel_to_camera(pt_px, depth):
    x = (pt_px[0] - mtx[0,2]) * depth / mtx[0,0]
    y = (pt_px[1] - mtx[1,2]) * depth / mtx[1,1]
    z = depth
    return np.array([x, y, z], dtype=np.float64)

def project_to_2d(point_3d):
    X, Y, Z = point_3d
    u = fx * (X / Z) + cx
    v = fy * (Y / Z) + cy
    return int(u), int(v)

def get_eye_center_by_ellipse(lm, ids, w, h):
    pts = np.array([lm_to_pixel(lm[i], w, h) for i in ids], dtype=np.float32)
    if len(pts) < 5:
        return None
    ellipse = cv.fitEllipse(pts)
    center = np.array(ellipse[0], dtype=np.float64)
    return center

# --- 魚眼上の9点（フルHD基準、必要なら調整） ---
fish_points = [
    (int(FISH_WIDTH*0.25), int(FISH_HEIGHT*0.25)),
    (int(FISH_WIDTH*0.5 ), int(FISH_HEIGHT*0.25)),
    (int(FISH_WIDTH*0.75), int(FISH_HEIGHT*0.25)),
    (int(FISH_WIDTH*0.25), int(FISH_HEIGHT*0.5 )),
    (int(FISH_WIDTH*0.5 ), int(FISH_HEIGHT*0.5 )),
    (int(FISH_WIDTH*0.75), int(FISH_HEIGHT*0.5 )),
    (int(FISH_WIDTH*0.25), int(FISH_HEIGHT*0.75)),
    (int(FISH_WIDTH*0.5 ), int(FISH_HEIGHT*0.75)),
    (int(FISH_WIDTH*0.75), int(FISH_HEIGHT*0.75))
]

# ------------------ グローバル状態 ------------------
if CALIB_JSON is None:
    calib_mode = True
else:
    calib_mode = False
calib_index = 0
calib_storage = []   # list of [X,Y,Z, u, v] collected points
sampling_buffer = [] # 一点のサンプリングバッファ（視線3D）
model_coef = None    # loaded coefficients (dict with coef_u, coef_v)
# ---------------------------------------------------

# --- 回帰（多項式特徴） ---
def poly3_features(pt):
    x,y,z = pt
    return np.array([1.0, x, y, z, x*x, y*y, z*z, x*y, y*z, x*z], dtype=np.float64)

def train_model_from_calib(calib_list):
    """calib_list: list of [X,Y,Z, u, v]"""
    X = np.array([c[:3] for c in calib_list], dtype=np.float64)
    Y = np.array([c[3:] for c in calib_list], dtype=np.float64)
    A = np.array([poly3_features(pt) for pt in X])
    coef_u = np.linalg.lstsq(A, Y[:,0], rcond=None)[0]
    coef_v = np.linalg.lstsq(A, Y[:,1], rcond=None)[0]
    np.savez(MODEL_NPZ, coef_u=coef_u, coef_v=coef_v)
    return {"coef_u":coef_u, "coef_v":coef_v}

def load_model():
    if os.path.exists(MODEL_NPZ):
        d = np.load(MODEL_NPZ)
        return {"coef_u": d["coef_u"], "coef_v": d["coef_v"]}
    return None

def gaze3d_to_fish(pt, model):
    """pt: length-3 array. model: dict from load_model/train_model"""
    if model is None:
        return None
    f = poly3_features(pt)
    u = f @ model["coef_u"]
    v = f @ model["coef_v"]
    return int(round(u)), int(round(v))

# ----------------- 視線処理（process_frame を少し改良して値を返す） -----------------
def process_frame_for_gaze(frame):
    """
    frame: BGR image from 正面カメラ
    returns:
    frame (with overlays),
    gaze_mark_end (np.array length3) or None,
    debug info dict
    """

    gaze_mark_end = None
    debug = {}
    h, w = frame.shape[:2]
    rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
    res = face_mesh.process(rgb)

    if res.multi_face_landmarks:
        print("------------------------------------------------------------------------------")
        lm = res.multi_face_landmarks[0].landmark

        def P(i):
            return np.array([lm[i].x, lm[i].y, lm[i].z])
        

        # 顔の向き ==================================================
        # 描画するランドマークの選択、描画
        for pid in [ID_TOP, ID_BOTTOM, ID_LEFT, ID_RIGHT]:
            lx, ly = int(lm[pid].x * frame.shape[1]), int(lm[pid].y * frame.shape[0])
            cv.circle(frame, (lx, ly), 4, (0,0,255), -1)

        top = P(ID_TOP)
        bottom = P(ID_BOTTOM)
        left = P(ID_LEFT)
        right = P(ID_RIGHT)

        # --- ベクトル計算 ---
        up = top - bottom
        up = up / np.linalg.norm(up)
        right_v = right - left
        right_v = right_v / np.linalg.norm(right_v)
        forward = np.cross(right_v, up)
        forward = forward / np.linalg.norm(forward)

        # --- 角度計算 ---
        pitch = np.arcsin(-forward[1])
        yaw = np.arctan2(forward[0], -forward[2])
        roll = np.arctan2(right_v[1], right_v[0])

        # --- フィルタ ---
        pitch = pitch_filter(pitch)
        yaw = yaw_filter(yaw)
        roll = roll_filter(roll)

        print(f"pitch: {pitch}, yaw: {yaw}, roll: {roll}")
        print(f"forward=                {forward}")
        cv.putText(frame, f"Pitch: {pitch:.2f}", (30, 110),
                cv.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv.putText(frame, f"Yaw:   {yaw:.2f}", (30, 140),
                cv.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv.putText(frame, f"Roll:  {roll:.2f}", (30, 170),
                cv.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        




        #=========================================================

        # --- 眼球中心　2D 座標 ---　(両目の　目頭、目尻　の2d座標)(画面比率の座標 -> ピクセルの座標)
        # 左目輪郭の点群
        left_eye_ids = [ 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161 , 246 ]  
        right_eye_ids = [ 362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385,384, 398 ]
        # --- 眼の輪郭点の描画 ---
        for i in left_eye_ids:
            px, py = int(lm[i].x * w), int(lm[i].y * h)
            cv.circle(frame, (px, py), 2, (255, 0, 0), -1) # 左目は青色
        for i in right_eye_ids:
            px, py = int(lm[i].x * w), int(lm[i].y * h)
            cv.circle(frame, (px, py), 3, (255, 100, 0), -1)  # 右目は青
        # --- 左目の楕円フィットと描画 ---
        left_pts = np.array([lm_to_pixel(lm[i], w, h) for i in left_eye_ids], dtype=np.float32)
        if len(left_pts) >= 5:
            left_ellipse = cv.fitEllipse(left_pts)
            cv.ellipse(frame, left_ellipse, (255, 0, 0), 2)  # 青色で描画
        # --- 右目の楕円フィットと描画 ---
        right_pts = np.array([lm_to_pixel(lm[i], w, h) for i in right_eye_ids], dtype=np.float32)
        if len(right_pts) >= 5:
            right_ellipse = cv.fitEllipse(right_pts)
            cv.ellipse(frame, right_ellipse, (255, 100, 0), 2)  # 青で描画

        # 2次元眼球中心
        left_eye_center = get_eye_center_by_ellipse(lm, left_eye_ids, w, h)
        right_eye_center = get_eye_center_by_ellipse(lm, right_eye_ids, w, h)
        if left_eye_center is not None:
            cv.circle(frame, tuple(left_eye_center.astype(int)), 3, (0, 200, 255), -1)
        if right_eye_center is not None:
            cv.circle(frame, tuple(right_eye_center.astype(int)), 3, (0, 200, 255), -1)

        # 目頭と目尻
        left_outer = lm_to_pixel(lm[LEFT_EYE_OUTER], w, h)
        left_inner = lm_to_pixel(lm[LEFT_EYE_INNER], w, h)
        right_outer = lm_to_pixel(lm[RIGHT_EYE_OUTER], w, h)
        right_inner = lm_to_pixel(lm[RIGHT_EYE_INNER], w, h)
        # 目頭、目尻の描画
        cv.circle(frame, tuple(left_inner.astype(int)), 4, (255, 220, 0), -1)
        cv.circle(frame, tuple(right_inner.astype(int)), 4, (255, 0, 90), -1)
        cv.circle(frame, tuple(left_outer.astype(int)), 4, (255, 0, 0), -1)
        cv.circle(frame, tuple(right_outer.astype(int)), 4, (255, 0, 0), -1)


        # --- 虹彩中心　2D 座標 ---
        left_iris = np.mean([lm_to_pixel(lm[i], w, h) for i in LEFT_IRIS_IDX], axis=0)
        right_iris = np.mean([lm_to_pixel(lm[i], w, h) for i in RIGHT_IRIS_IDX], axis=0)


        # 距離(カメラから顔までの距離) ===========================================================
        pixel_ipd = np.linalg.norm(right_outer - left_outer)
        distance = (REAL_IPD * focal) / (pixel_ipd + 1e-8)
        print(f"distance= {distance}")


        # 奥行き =========================================================
        # 虹彩の奥行き
        left_iris_3d = pixel_to_camera(left_iris, depth=distance)
        right_iris_3d = pixel_to_camera(right_iris, depth=distance)

        left_iris_2d = project_to_2d(left_iris_3d)
        right_iris_2d = project_to_2d(right_iris_3d)

        # 2d虹彩中心
        cv.circle(frame, left_iris_2d, 3, (0, 250, 255), -1)
        cv.circle(frame, right_iris_2d, 3, (0, 250, 255), -1)


        # 眼球中心の奥行き
        #left_center_3d = pixel_to_camera(left_eye_center, depth=distance)
        #right_center_3d = pixel_to_camera(right_eye_center, depth=distance)
        left_center_3d = None
        right_center_3d = None
        if left_eye_center is not None:
            left_center_3d = pixel_to_camera(left_eye_center, depth=distance)
            print(f"left_center_3d=         {left_center_3d}")
        if right_eye_center is not None:
            right_center_3d = pixel_to_camera(right_eye_center, depth=distance)
        
        # 眼球中心を顔法線方向にオフセット
        #left_eye_center_offset = left_center_3d + forward * EYE_OFFSET
        #right_eye_center_offset = right_center_3d + forward * EYE_OFFSET
        if left_center_3d is not None:
            left_eye_center_offset = left_center_3d + forward * EYE_OFFSET
            left_2d = project_to_2d(left_eye_center_offset)
            print(f"left_eye_center_offset= {left_eye_center_offset}")
            cv.circle(frame, left_2d, 3, (0, 0, 255), -1)   # 左眼球中心（赤）
        else:
            left_eye_center_offset = None

        if right_center_3d is not None:
            right_eye_center_offset = right_center_3d + forward * EYE_OFFSET
            right_2d = project_to_2d(right_eye_center_offset)
            print(f"left_eye_center_offset= {right_eye_center_offset}")
            cv.circle(frame, right_2d, 3, (0, 0, 255), -1)  # 右眼球中心（赤）
        else:
            right_eye_center_offset = None


        # ベクトル =============================================================

        if left_eye_center_offset is not None:
            # 眼球中心と虹彩中心の3D座標 
            L_C = left_eye_center_offset
            L_I = left_iris_3d

            # 視線ベクトルを計算
            gaze_vec = L_I - L_C
            print(f"C= {L_C}")
            print(f"I= {L_I}")
            print(f"faze_vec= {gaze_vec}")

            gaze_mark_vec = L_C - L_I

            if np.linalg.norm(gaze_vec) > 1e-6:
                gaze_dir = gaze_vec / np.linalg.norm(gaze_vec) # 正規化
                gaze_mark_dir = gaze_mark_vec / np.linalg.norm(gaze_mark_vec)  # 正規化

                # 余分に伸ばす長さ
                L_1 = 0.1   # 0.1m 伸ばす 
                p = np.array(L_I, dtype=float)
                d = np.array(gaze_mark_dir, dtype=float)
                t = -p[2] / d[2]
                L_2 = distance# distance 先まで伸ばす

                # 最終的な注視点
                gaze_end = L_I + gaze_dir * L_1
                #gaze_mark_end = L_I + gaze_mark_dir * t
                gaze_mark_end = L_I + gaze_mark_dir * L_2
                print(f"見ている点= {gaze_mark_end}")

                # gaze_mark_end は「正面カメラ座標系における注視点（3D）」です
                debug.update({
                    "L_C": L_C,
                    "L_I": L_I,
                    "gaze_dir": gaze_dir,
                    "distance": distance,
                    "yaw": yaw, "pitch": pitch, "roll": roll
                })
                
                # 2D 投影
                C_2d  = project_to_2d(L_C)
                E_2d = project_to_2d(gaze_end)
                #E_mark_2d = (int(gaze_mark_end[0]), int(gaze_mark_end[1]))
                E_mark_2d = project_to_2d(gaze_mark_end)
                # 見ているところの点
                cv.circle(frame, E_mark_2d, 8, (0, 0, 255), -1)  # 赤丸
                cv.arrowedLine(frame, C_2d, E_2d, (255,255,0), 1)

        return frame, gaze_mark_end, debug
    
    else:
        return frame, None, debug

# -------------------- メインループ --------------------
def main():
    global calib_mode, calib_index, calib_storage, sampling_buffer, model_coef

    # ビデオキャプチャ
    cap_fish = cv.VideoCapture(FISH_CAM_ID)
    cap_ir   = cv.VideoCapture(IR_CAM_ID)

    cap_fish.set(cv.CAP_PROP_FRAME_WIDTH, FISH_WIDTH)
    cap_fish.set(cv.CAP_PROP_FRAME_HEIGHT, FISH_HEIGHT)
    cap_ir.set(cv.CAP_PROP_FRAME_WIDTH, FRONT_WIDTH)
    cap_ir.set(cv.CAP_PROP_FRAME_HEIGHT, FRONT_HEIGHT)

    if not cap_fish.isOpened() or not cap_ir.isOpened():
        print("カメラを開けません。IDや接続を確認してください。")
        return

    # もし既に学習モデルがあれば読み込み
    model_coef = load_model()
    if model_coef is not None:
        print("Loaded model:", MODEL_NPZ)

    print("操作：Enter/Space=現在のカメラ視線をサンプリング（キャリブ中）")
    print("       t = 学習（9点揃ったら）  c = キャリブリセット  q/ESC = 終了")

    last_time = time.time()

    while True:
        ret1, frame_fish = cap_fish.read()
        ret2, frame_ir = cap_ir.read()

        if not ret2:
            print("正面カメラ読み込み不可")
            break
        if frame_fish is None:
            frame_fish = np.zeros((FISH_HEIGHT, FISH_WIDTH,3), dtype=np.uint8)

        # 正面から視線処理（frame_ir を加工・注視点抽出）
        processed_ir, gaze3d, dbg = process_frame_for_gaze(frame_ir.copy())

        if gaze3d is not None:
            snap_buffer.append(gaze3d)


        # 魚眼側 UI 表示（キャリブ点 or モデル投影）
        fish_disp = frame_fish.copy()

        if calib_mode:
            # 描画: 今のターゲットポイント
            if calib_index < len(fish_points):
                tx, ty = fish_points[calib_index]
                cv.circle(fish_disp, (tx,ty), 20, (0,0,255), -1)
                cv.putText(fish_disp, f"Point {calib_index+1}/9 - Look & Press Enter",
                            (30,50), cv.FONT_HERSHEY_SIMPLEX, 1.0, (0,0,255), 3)
        else:
            cv.putText(fish_disp, f"RUN MODE - press 'c' to recalibrate", (30,50), cv.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,0), 2)

        # モデルがあれば常時投影（緑点）
        print(model_coef)
        if model_coef is not None and gaze3d is not None:
            uv = gaze3d_to_fish(gaze3d, model_coef)
            if uv is not None:
                u,v = uv
                """print(f"u= {u},  v= {v}")
                cv.circle(fish_disp, (u,v), 12, (0,255,0), -1)
                cv.putText(fish_disp, "Predicted gaze", (u+15, v), cv.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)"""
                # 範囲制限（安全）
                u = int(np.clip(u, 0, FISH_WIDTH-1))
                v = int(np.clip(v, 0, FISH_HEIGHT-1))

                # バッファに追加
                uv_buffer.append([u, v])

                # 10フレーム分たまったら平均
                if len(uv_buffer) >= 1:
                    uv_arr = np.array(uv_buffer)
                    u_avg = int(np.mean(uv_arr[:,0]))
                    v_avg = int(np.mean(uv_arr[:,1]))

                    print(f"u_avg= {u_avg}, v_avg= {v_avg}")

                    # 平均点を描画（緑）
                    cv.circle(fish_disp, (u_avg, v_avg), 12, (0,255,0), -1)
                    cv.putText(fish_disp, "Predicted gaze (avg)",
                            (u_avg+15, v_avg),
                            cv.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)

        # 表示
        cv.imshow("Fish Camera (calib/target)", fish_disp)
        cv.imshow("Front Camera (gaze debug)", processed_ir)

        key = cv.waitKey(1) & 0xFF

        # Enter or Space: サンプリング（キャリブ中のみ）
        if key in (13, 32) and calib_mode:
            if gaze3d is None:
                print("Warning: 視線が取得できません。顔がカメラに映っているか確認してください。")
            else:
                sampling_buffer = []
                print(f"Sampling {SAMPLE_FRAMES} frames for point {calib_index+1} ...")
                # Nフレームを貯める
                got = 0
                t_start = time.time()
                while got < SAMPLE_FRAMES:
                    ret2b, frame_ir_b = cap_ir.read()
                    if not ret2b:
                        break
                    _, g3d_b, _ = process_frame_for_gaze(frame_ir_b)
                    if g3d_b is not None:
                        sampling_buffer.append(g3d_b)
                        got += 1
                    # 任意に少し待つ（CPUに配慮）
                    cv.waitKey(1)
                # ノイズ除去: 各座標軸の中央値を使う
                if len(sampling_buffer) >= MIN_SAMPLES:
                    arr = np.array(sampling_buffer)
                    med = np.median(arr, axis=0)
                    tx, ty = fish_points[calib_index]
                    calib_storage.append([float(med[0]), float(med[1]), float(med[2]), int(tx), int(ty)])
                    print(f"Saved calib {calib_index+1}: 3D={med} -> fish=({tx},{ty})")
                    calib_index += 1
                    if calib_index >= len(fish_points):
                        calib_mode = False
                        # 保存
                        with open(CALIB_JSON, "w") as f:
                            json.dump(calib_storage, f, indent=2)
                        print("✅ 全9点キャリブ完了。ファイル保存:", CALIB_JSON)
                else:
                    print("サンプリング不足。もう一度試してください。")

        # 's' : 10フレーム平均の注視点を保存
        if key == ord('s'):
            if len(snap_buffer) >= 10:   # 最低10フレームたまっていればOK
                arr = np.array(snap_buffer)

                # None を除く
                uv_list = [gaze3d_to_fish(g, model_coef) for g in arr]
                uv_arr = np.array(uv_list)

                # 2D 平均
                u_avg = int(np.mean(uv_arr[:,0]))
                v_avg = int(np.mean(uv_arr[:,1]))

                timestamp = int(time.time() * 1000)
                save_name = f"snap_{timestamp}.png"
                save_path = os.path.join(SNAP_IMG_DIR, f"snap_{timestamp}.png")

                """snapshot = {
                    "time": time.time(),
                    "gaze_2d_mean": [u_avg, v_avg],
                    "image_file": f"snap_{timestamp}.png"
                }
                snapshots.append(snapshot)

                with open(SNAP_SAVE_JSON, "w") as f:
                    json.dump(snapshots, f, indent=2)

                # ✅ 補正済み魚眼画像を保存
                cv.imwrite(save_path, fish_disp)"""

                # ------------------------------------------------
                # ① 現在の魚眼フレームを歪み補正
                # ------------------------------------------------
                undistorted_fish = cv.remap(
                    frame_fish, map1, map2,
                    interpolation=cv.INTER_LINEAR
                )

                # ------------------------------------------------
                # ② 歪み補正後の画像に注視点を描画
                # ------------------------------------------------
                annotated = undistorted_fish.copy()
                cv.circle(annotated, (u_avg, v_avg), 8, (0, 0, 255), -1)

                # ------------------------------------------------
                # 画像の切り取り
                # ------------------------------------------------

                crop_w = 400
                crop_h = 400

                h_img, w_img = undistorted_fish.shape[:2]

                x = int(u_avg - crop_w // 2)
                y = int(v_avg - crop_h // 2)

                x = max(0, min(x, w_img - crop_w))
                y = max(0, min(y, h_img - crop_h))

                roi = undistorted_fish[y:y+crop_h, x:x+crop_w]



                # ------------------------------------------------
                # ③ 保存
                # ------------------------------------------------
                print("undistorted_fish type:", type(undistorted_fish))
                print("undistorted_fish shape:", 
                    None if undistorted_fish is None else undistorted_fish.shape)

                cv.imwrite(save_path, annotated)

                # 補正後の画像のみ
                cv.imwrite(os.path.join(SNAP_IMG_DIR, f"undistorted_{timestamp}.png"),
                        undistorted_fish)
                
                roi_path = os.path.join(
                    SNAP_IMG_DIR,
                    f"roi_{timestamp}.png"
                )
                cv.imwrite(roi_path, roi)

                
                # JSON に記録
                snapshot = {
                    "time": time.time(),
                    "gaze_2d_mean": [u_avg, v_avg],
                    "image_file": save_name
                }
                snapshots.append(snapshot)
                with open(SNAP_SAVE_JSON, "w") as f:
                    json.dump(snapshots, f, indent=2)


                #表示
                print("10フレーム平均 + 歪み補正済みの魚眼画像 を保存しました")
                print("gaze:", [u_avg, v_avg])
                print("image:", save_path)
                break
            else:
                print("まだスナップ用フレームが足りません")


        # 't' : 学習（回帰）
        if key == ord('t'):
            if len(calib_storage) >= 9:
                print("Training model from collected calib data...")
                model_coef = train_model_from_calib(calib_storage)
                print("Training done and saved to", MODEL_NPZ)
            else:
                print("まだ9点揃っていません。現在の点数:", len(calib_storage))
        
        print("                           生データの個数：",len(calib_storage))


        # 'a' : 追加でキャリブ
        if key == ord('a'):
            print("Calibration add.")
            calib_mode = True
            calib_index = 0
            #calib_storage = []
            sampling_buffer = []
            #if os.path.exists(CALIB_JSON):
            #    os.remove(CALIB_JSON)
            if os.path.exists(MODEL_NPZ):
                os.remove(MODEL_NPZ)
            model_coef = None

        # 'c' : キャリブリセット
        if key == ord('c'):
            print("Calibration reset.")
            calib_mode = True
            calib_index = 0
            calib_storage = []
            sampling_buffer = []
            if os.path.exists(CALIB_JSON):
                os.remove(CALIB_JSON)
            if os.path.exists(MODEL_NPZ):
                os.remove(MODEL_NPZ)
            model_coef = None

        # 'q' or ESC : 終了
        if key == ord('q') or key == 27:
            break

    cap_fish.release()
    cap_ir.release()
    cv.destroyAllWindows()

if __name__ == "__main__":
    main()