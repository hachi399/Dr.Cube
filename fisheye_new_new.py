import cv2
import numpy as np

# 画像の読み込み
img = cv2.imread('G:/dcon 2/calibration/test/calib_img_3.jpg')
if img is None:
    print("画像が見つからないよ！")
    exit()

# パラメータの初期値
params = {
    'f': 1024,
    'k1': 0.3,
    'k2': 0.0,
    'k3': 0.0,
    'k4': 0.0,
    'balance': 0.5
}

def update(x=0):
    try:
        h, w = img.shape[:2]

        params['f'] = cv2.getTrackbarPos('f', 'Tuning')
        params['k1'] = (cv2.getTrackbarPos('k1', 'Tuning') - 1000) / 1000.0
        params['k2'] = (cv2.getTrackbarPos('k2', 'Tuning') - 1000) / 1000.0
        params['k3'] = (cv2.getTrackbarPos('k3', 'Tuning') - 1000) / 10000.0
        params['k4'] = (cv2.getTrackbarPos('k4', 'Tuning') - 1000) / 10000.0
        params['balance'] = cv2.getTrackbarPos('balance', 'Tuning') / 100.0

        K = np.array([
            [params['f'], 0, w / 2],
            [0, params['f'], h / 2],
            [0, 0, 1]
        ], dtype=np.float32)

        D = np.array([
            params['k1'], params['k2'], params['k3'], params['k4']
        ], dtype=np.float32)

        new_K = cv2.fisheye.estimateNewCameraMatrixForUndistortRectify(
            K, D, (w, h), np.eye(3), balance=params['balance']
        )

        map1, map2 = cv2.fisheye.initUndistortRectifyMap(
            K, D, np.eye(3), new_K, (w, h), cv2.CV_16SC2
        )

        undistorted = cv2.remap(img, map1, map2, cv2.INTER_LINEAR)

        res_img = cv2.resize(undistorted, (960, 540))
        cv2.putText(
            res_img,
            f"f:{params['f']} k1:{params['k1']:.4f} k2:{params['k2']:.4f}",
            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2
        )
        cv2.putText(
            res_img,
            "Press 's' to ENTER values manually",
            (10, 520), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1
        )

        cv2.imshow('Tuning', res_img)
        print(" f= ", params['f']) 
        print("k1= ", params['k1']) 
        print("k2= ", params['k2']) 
        print("k3= ", params['k3'])
        print("k4= ", params['k4']) 
        print("balance= ", params['balance'])

    except cv2.error:
        # トラックバー未生成時の保険
        return


# ===== UI 初期化 =====
cv2.namedWindow('Tuning')

cv2.createTrackbar('f', 'Tuning', 1024, 2000, update)
cv2.createTrackbar('k1', 'Tuning', 1000, 2000, update)
cv2.createTrackbar('k2', 'Tuning', 1000, 2000, update)
cv2.createTrackbar('k3', 'Tuning', 1000, 2000, update)
cv2.createTrackbar('k4', 'Tuning', 1000, 2000, update)
cv2.createTrackbar('balance', 'Tuning', 50, 100, update)

# 初期描画
update(0)

# ===== メインループ =====
while True:
    key = cv2.waitKey(1) & 0xFF

    if key == ord('s'):
        print("\n--- 手入力モード ---")
        try:
            new_k1 = float(input("k1の値を入力してね (例: -0.015): "))
            cv2.setTrackbarPos('k1', 'Tuning', int(new_k1 * 1000 + 1000))
            update(0)
        except ValueError:
            print("数字を入れてね！")

    if key == ord('q') or key == 27:
        break

cv2.destroyAllWindows()
