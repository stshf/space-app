# APOD (Astronomy Picture of the Day)

> このリポジトリは、Recursionのチーム開発で作成した [Recursion-teamdev-go-lang-teamc/space-app](https://github.com/Recursion-teamdev-go-lang-teamc/space-app) をベースに、個人で Cloudflare へのデプロイを練習するために移行したものです。

NASAの APOD (Astronomy Picture of the Day) を表示する天体写真ビューアです。カレンダービューとギャラリービューを提供しています。

**公開URL: https://space-app.stsh.workers.dev**

https://github.com/user-attachments/assets/2218264f-6f84-4693-953e-0319fd9fbe1b

## 特徴
- 日付指定での天体写真表示
- ランダムな天体写真のギャラリービュー（動画の回は埋め込みプレーヤーで表示）
- Cloudflare Workers 上で動作（無料プランの範囲内）
- APIキー不要

## 構成

```
ブラウザ ──> space-app.stsh.workers.dev（Cloudflare Workers）
               ├─ /index.html, /js/*  → public/ の静的ファイルをそのまま配信
               └─ /api/*              → src/index.js（Worker）
                                          └─> NASA (science.nasa.gov) の APOD データ
```

- 静的ファイルは [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) で配信します。静的ファイルへのリクエストは無料・無制限です。
- `public/` に該当するファイルがないリクエスト（`/api/*`）だけが Worker のコードに回ります。Worker の無料枠は 1日10万リクエストです。

## 技術スタック
### フロントエンド
- HTML5
- Tailwind CSS（CDN）
- JavaScript（ES Modules）

### API
- Cloudflare Workers（JavaScript）
- Wrangler（Cloudflare 公式 CLI）

## API

| エンドポイント | 説明 |
|---|---|
| `GET /api/apod` | 最新の APOD を返す |
| `GET /api/apod?date=MM/DD/YYYY` | 指定日の APOD を返す（形式が違う場合は 400） |
| `GET /api/apods/random` | ランダムな日付の APOD を最大8件返す |

レスポンス例:
```json
{ "apod": { "date": "2015-07-14", "title": "New Horizons Passes Pluto and Charon", "hdurl": "https://...", "url": "https://...", "media_type": "image", "explanation": "...", "copyright": "..." } }
```
`hdurl` が空文字のときは動画の回で、`url` に埋め込み用の URL（YouTube / Vimeo など）が入ります。

## データ取得元について
2026年9月29日に APOD のサイトが `apod.nasa.gov` から `science.nasa.gov/apod` に移転し、従来の `api.nasa.gov/planetary/apod` は全日付で NASA のロゴを返すようになりました（2026年12月1日に廃止予定）。
そのため、現在は NASA Science の `https://science.nasa.gov/wp-json/wp/v2/apod-basic` からデータを取得しています。

Worker（`src/index.js`）では、取得元の次の挙動に対応しています。
- **日付指定はパス形式**: `apod-basic/YYMMDD`。ランダム取得の機能はないため、1995-06-16〜今日の中からランダムに日付を選び、並列に取得しています。
- **画像が欠けている回がある**: 移行で画像が NASA のロゴ（`news-thumbnail.png`）に置き換わっている回は、`basic_html` に残っている本物の画像や動画の URL で補正しています。
- **ボット判定で 403 が返ることがある**: 待ち時間を延ばしながら最大4回取り直します。ランダム取得は多めに12件取りに行き、成功した中から8件を返します。

## ローカル開発

### 前提条件
- Node.js（v22 で動作確認）
- Cloudflare アカウント（デプロイする場合のみ・無料プランで可）

### セットアップ
```bash
npm install
```

### ローカルで起動
```bash
npx wrangler dev
```
http://localhost:8787 で確認できます。`src/index.js` を保存すると自動で再読み込みされます。

### デプロイ
```bash
npx wrangler login   # 初回のみ
npx wrangler deploy
```

### 本番のログを見る
```bash
npx wrangler tail space-app
```

## ディレクトリ構成
```
.
├── public/                 # 配信する静的ファイル（このフォルダの中身だけが公開される）
│   ├── index.html
│   └── js/
│       ├── apodApi.js        # /api/* の呼び出し
│       ├── apodRenderer.js   # APOD の描画
│       ├── dateValidator.js  # 日付入力のチェック
│       ├── modalController.js
│       └── viewController.js
├── src/
│   └── index.js            # Worker（API）
├── wrangler.jsonc          # Cloudflare Workers の設定
├── package.json
├── cmd/, internal/, go.mod # 旧 Go バックエンド（下記参照）
└── docs/                   # チーム開発時のドキュメント
```

## 旧 Go バックエンドについて
`cmd/` と `internal/` には、チーム開発時に作成した Go のバックエンドが残っています。Cloudflare Workers では Go のサーバーをそのまま動かせないため、同じ API を `src/index.js` に書き直しました。
Go 版は旧 API（`api.nasa.gov`）を使っているため、現在は正しいデータを返しません。参考用として残しています。
[Swagger UI](https://recursion-teamdev-go-lang-teamc.github.io/space-app/swagger/) の仕様もチーム開発時（Go 版）のものです。

## ライセンス

### アプリケーションコード
本プロジェクトは [MIT License](LICENSE) の下で公開されています。

### NASA APOD コンテンツ
本アプリケーションで表示される天体写真およびその説明文は、NASA の [Astronomy Picture of the Day](https://science.nasa.gov/apod/) から取得しています。
copyright があるものは帰属先を明記し、ないものはパブリックドメインとして扱っています。
- 詳細: https://github.com/nasa/apod-api

## 著者
- [stshf](https://github.com/stshf)
- [mumiso710](https://github.com/mumiso710)
- [5103246](https://github.com/5103246)

## 謝辞
- [NASA Astronomy Picture of the Day](https://science.nasa.gov/apod/) に感謝を申し上げる
