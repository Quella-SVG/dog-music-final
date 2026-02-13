// api/index.js
// B计划：切换至酷狗音乐 (Kugou)，无需 Key，IP 限制少，MP3 连接稳定

export default async function handler(request, response) {
  const { keyword } = request.query;

  if (!keyword) {
    return response.status(200).json({ code: 404, msg: "No keyword", data: [] });
  }

  try {
    // 1. 搜索歌曲 (获取 Hash 值)
    const searchUrl = `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(keyword)}&page=1&pagesize=5&showtype=1`;
    
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    // 如果没搜到
    if (!searchData.data || !searchData.data.info) {
      return response.status(200).json({ code: 200, msg: "Kugou: No songs found", data: [] });
    }

    const rawSongs = searchData.data.info;

    // 2. 并发获取 MP3 链接 (酷狗需要用 Hash 换链接)
    // 我们同时请求 5 首歌，速度很快
    const tasks = rawSongs.map(async (song) => {
      try {
        // 请求详情接口
        const detailUrl = `https://www.kugou.com/yy/index.php?r=play/getdata&hash=${song.hash}`;
        // 加个简单的 Cookie 防止被拦截
        const detailRes = await fetch(detailUrl, {
          headers: { 'Cookie': 'kg_mid=2333' } 
        });
        const detailData = await detailRes.json();

        // 只有拿到了真实的播放链接才返回
        if (detailData.data && detailData.data.play_url) {
          return {
            name: song.songname,      // 歌名
            singer: song.singername,  // 歌手
            pic: detailData.data.img, // 封面
            url: detailData.data.play_url, // 真实的 MP3 链接
            lrc: detailData.data.lyrics    // 歌词
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    });

    // 等待所有请求完成，并过滤掉失败的
    const results = (await Promise.all(tasks)).filter(item => item !== null);

    response.status(200).json({
      code: 200,
      msg: "Success (Kugou)",
      data: results
    });

  } catch (error) {
    response.status(500).json({ error: "Server Error: " + error.message });
  }
}
