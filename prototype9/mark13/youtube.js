/**
 * YouTube Data API v3を使用して動画を検索・取得する
 */

export async function searchYouTubeVideos(videoId = null, query = null) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('YOUTUBE_API_KEYが設定されていません');
  }

  let url;
  
  if (videoId) {
    // 特定の動画IDで検索
    url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`;
  } else if (query) {
    // クエリで検索
    url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${API_KEY}`;
  } else {
    throw new Error('videoIdまたはqueryが必要です');
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (videoId) {
      // 動画ID検索の場合
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return [{
          videoId: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          duration: item.contentDetails?.duration
        }];
      }
      return [];
    } else {
      // クエリ検索の場合
      if (data.items && data.items.length > 0) {
        return data.items.map(item => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url
        }));
      }
      return [];
    }
  } catch (error) {
    console.error('YouTube API error:', error);
    throw error;
  }
}

