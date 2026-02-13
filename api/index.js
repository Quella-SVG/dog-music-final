// api/index.js
// 终极救火版：使用咪咕音乐 APP 内部接口 (MIGUM3.0)
// 特点：伪装成手机 APP，抗封锁能力极强，支持周杰伦免费播放

export default async function handler(request, response) {
  const { keyword } = request.query;

  if (!keyword) {
    return response.status(200).json({ code: 404, msg: "No keyword", data: [] });
  }

  try {
    // 1. 使用咪咕 APP 的搜索接口 (这个接口很少封 IP)
    const searchUrl = `https://pd.musicapp.migu.cn/MIGUM3.0/v1.0/content/search_all.do?text=${encodeURIComponent(keyword)}&pageNo=1&searchSwitch={"song":1}`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'host': 'pd.musicapp.migu.cn'
      }
    });
    
    // 这里的 text() 是为了防止再次出现 Unexpected token 报错
    // 我们先拿文本，确认是 JSON 再解析
    const rawText = await res.text();
    
    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      // 如果这里报错，说明还是返回了 HTML，那就真的没辙了
      return response.status(500).json({ error: "Migu Blocked: " + rawText.substring(0, 100) });
    }

    // 2. 检查有没有数据
    if (!json.songResultData || !json.songResultData.result) {
      return response.status(200).json({ code: 200, msg: "No songs found", data: [] });
    }

    // 3. 清洗数据
    const cleanList = json.songResultData.result.map(song => {
      // 寻找播放链接
      // 咪咕 APP 接口返回的链接字段比较多，我们优先找高音质
      let playUrl = "";
      if (song.rateFormats) {
        // 优先找标准 MP3 (格式适中，机器狗能放)
        const format = song.rateFormats.find(f => f.formatType === 'MP3' && f.url);
        if (format) {
          playUrl = format.url; // 新版接口直接返回 URL
        }
      }
      
      // 如果 rateFormats 里没找到，尝试旧字段
      if (!playUrl && song.contentId) {
         // 这是一个兜底策略，构造老版链接
         playUrl = `https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/sub/listenSong.do?contentId=${song.contentId}&toneFlag=PQ`;
      }

      // 如果有链接才返回
      if (playUrl) {
        // 这里的 URL 可能是 FTP 或者是没有 http 前缀的，处理一下
        if (playUrl.startsWith("//")) playUrl = "https:" + playUrl;
        // 把 ftp 换成 http (机器狗可能不支持 ftp)
        playUrl = playUrl.replace("ftp://", "http://");

        return {
          name: song.name,
          singer: song.singers ? song.singers.map(s => s.name).join('/') : "咪咕歌手",
          pic: song.imgItems && song.imgItems.length > 0 ? song.imgItems[0].img : "",
          url: playUrl,
          lrc: ""
        };
      }
      return null;
    }).filter(item => item !== null);

    response.status(200).json({
      code: 200,
      msg: "Success (Migu App)",
      data: cleanList
    });

  } catch (error) {
    response.status(500).json({ error: "Server Error: " + error.message });
  }
}
