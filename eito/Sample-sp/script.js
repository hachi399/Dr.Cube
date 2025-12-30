// 画像をスマホサイズにトリミングする関数
function trimImageToMobileSize(img, targetWidth = 414, targetHeight = null) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // スマホのアスペクト比（9:16が一般的）
        const mobileAspectRatio = 9 / 16;
        
        // 元の画像サイズ
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;
        const originalAspectRatio = originalWidth / originalHeight;
        
        let cropWidth, cropHeight, cropX, cropY;
        
        // スマホサイズに合わせてトリミング
        if (originalAspectRatio > mobileAspectRatio) {
            // 横長の場合、高さを基準にトリミング
            cropHeight = originalHeight;
            cropWidth = cropHeight * mobileAspectRatio;
            cropX = (originalWidth - cropWidth) / 2;
            cropY = 0;
        } else {
            // 縦長の場合、幅を基準にトリミング
            cropWidth = originalWidth;
            cropHeight = cropWidth / mobileAspectRatio;
            cropX = 0;
            cropY = (originalHeight - cropHeight) / 2;
        }
        
        // Canvasサイズを設定
        canvas.width = targetWidth;
        canvas.height = targetHeight || (targetWidth / mobileAspectRatio);
        
        // 画像をトリミングして描画
        ctx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, canvas.width, canvas.height
        );
        
        // Canvasを画像に変換
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            resolve(url);
        }, 'image/png');
    });
}

// 画像を読み込んでトリミング
function loadAndTrimImages() {
    const images = document.querySelectorAll('.page-image');
    
    images.forEach((img) => {
        if (img.complete) {
            processImage(img);
        } else {
            img.addEventListener('load', () => processImage(img));
        }
    });
}

// 画像を処理して表示
async function processImage(img) {
    try {
        const trimmedUrl = await trimImageToMobileSize(img);
        img.src = trimmedUrl;
        img.style.objectFit = 'cover';
    } catch (error) {
        console.error('画像のトリミングに失敗しました:', error);
    }
}

// ページ切り替え機能
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');

    // メニューアイテムのクリックイベント
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetPageId = this.getAttribute('data-page');
            
            // すべてのページを非表示
            pages.forEach(page => {
                page.classList.remove('active');
            });
            
            // すべてのメニューアイテムからactiveクラスを削除
            menuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });
            
            // 選択されたページを表示
            const targetPage = document.getElementById(targetPageId);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // クリックされたメニューアイテムにactiveクラスを追加
            this.classList.add('active');
        });
    });

    // 初期状態の設定（アップロードページを表示）
    const initialPage = document.getElementById('upload-page');
    const initialMenuItem = document.querySelector('[data-page="upload-page"]');
    
    if (initialPage && initialMenuItem) {
        initialPage.classList.add('active');
        initialMenuItem.classList.add('active');
    }
    
    // 画像のトリミング処理（オプション - 必要に応じてコメントアウト）
    // loadAndTrimImages();
});

