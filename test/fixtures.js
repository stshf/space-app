// NASA の apod-basic が実際に返した形を元にした、テスト用のデータ

export const imageEntry = {
  date: "2015-07-14",
  title: "New Horizons Passes Pluto and Charon",
  permalink: "https://science.nasa.gov/image-article/apod-2015-july-14/",
  media_type: "image",
  explanation: "<strong>Explanation:</strong> Pluto &amp; Charon, up close.",
  credit: "<b>Image Credit:</b> NASA, JHU APL, SwRI",
  copyright: "",
  alt: "Pluto and its moon Charon",
  url: "https://science.nasa.gov/image-article/apod-2015-july-14/",
  hdurl: "https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2015/july/PlutoCharon01_NewHorizons_1422.jpg?w=1422&h=744&fit=clip",
  basic_html: '<img src="https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2015/july/PlutoCharon01_NewHorizons_1422.jpg">',
};

// 移行で画像が NASA のロゴに置き換わってしまった回
export const placeholderEntry = {
  date: "1996-03-13",
  title: "Here Comes Comet Hyakutake",
  permalink: "https://science.nasa.gov/image-article/apod-1996-march-13/",
  media_type: "image",
  explanation: "<strong>Explanation:</strong> A comet approaches.",
  credit: "<b>Credit:</b> ESO",
  alt: "",
  url: "https://science.nasa.gov/image-article/apod-1996-march-13/",
  hdurl: "https://assets.science.nasa.gov/dynamicimage/assets/science/astro/programs/cosmic-origins/images/misc/news-thumbnail.png?w=594&h=516",
  basic_html: '<IMG SRC="https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/1996/march/hyakutake_eso_big.gif" alt="See Explanation.">',
};

export const videoEntry = {
  date: "2024-08-04",
  title: "Gaia: Here Comes the Sun",
  permalink: "https://science.nasa.gov/image-article/apod-2024-august-4/",
  media_type: "video",
  explanation: "<strong>Explanation:</strong> A video.",
  credit: "",
  alt: "",
  url: "https://science.nasa.gov/image-article/apod-2024-august-4/",
  hdurl: "https://assets.science.nasa.gov/dynamicimage/assets/science/astro/programs/cosmic-origins/images/misc/news-thumbnail.png",
  basic_html: '<iframe width="960" height="540" src="//www.youtube.com/embed/XORui0wFKnE?rel=0" allowfullscreen></iframe>',
};

// 悪意のあるデータが混ざった場合
export const hostileEntry = {
  date: "2020-01-01",
  title: 'Nice <img src=x onerror="alert(1)">',
  permalink: "javascript:alert(1)",
  explanation: "<script>alert(1)</script>Safe text",
  credit: "<b onclick=alert(1)>Credit:</b> Someone",
  alt: '"><script>alert(1)</script>',
  hdurl: "https://evil.example/pwn.jpg",
  basic_html: '<iframe src="https://evil.example/embed/abcdefgh"></iframe>',
};
