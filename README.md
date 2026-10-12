# APOD (Astronomy Picture of the Day)

> このリポジトリは、Recursionのチーム開発で作成した [Recursion-teamdev-go-lang-teamc/space-app](https://github.com/Recursion-teamdev-go-lang-teamc/space-app) をベースに、個人で Cloudflare へのデプロイを練習するために移行したものです。

NASAの APOD (Astronomy Picture of the Day) を表示する天体写真ビューアです。日付を選んで見る「一枚」ビューと、30年分からランダムに並べる「ギャラリー」ビューがあります。

**公開URL: https://space-app.stsh.workers.dev**

https://github.com/user-attachments/assets/2218264f-6f84-4693-953e-0319fd9fbe1b

## 特徴
- 1995年6月16日から今日まで、日付を選んで天体写真を表示（← → キーで前後の日へ）
- 30年分からランダムに8枚を並べるギャラリー（動画の回は埋め込みプレーヤーで表示）
- 日付ごとに共有できる URL（`/?date=2015-07-14`）。SNS で共有するとその日の写真がプレビューに出る（OGP）
- スマホ対応・キーボード操作・スクリーンリーダー向けの読み上げに対応
- Cloudflare Workers 上で動作（無料プランの範囲内）、APIキー不要

## 構成

```
ブラウザ ──> space-app.stsh.workers.dev（Cloudflare Workers）
               ├─ /app.css, /js/*, /favicon.svg → public/ の静的ファイルをそのまま配信
               ├─ /                             → Worker が index.html に OGP とセキュリティヘッダーを付けて返す
               └─ /api/*                        → Worker（src/）
                                                   ├─> KV（過去の日付の APOD をキャッシュ）
                                                   └─> NASA (science.nasa.gov) の APOD データ
```

- 静的ファイルは [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) で配信します。静的ファイルへのリクエストは無料・無制限です。
- `/` と `/api/*` だけ Worker を先に通します（`wrangler.jsonc` の `run_worker_first`）。Worker の無料枠は 1日10万リクエストです。
- 過去の日付の APOD は内容が変わらないので、一度取得したら KV に保存し、以後は NASA に問い合わせません。

## 技術スタック
### フロントエンド
- HTML / JavaScript（ES Modules、ビルド不要）
- Tailwind CSS v4（`npm run build` でビルド。CDN は使わない）
- アイソメトリックの天文台の図（SVG）：[anatomy](https://github.com/wheresryan22/anatomy) スキルのキット（MIT）で描画

### API
- Cloudflare Workers（JavaScript）、Workers KV
- Wrangler（Cloudflare 公式 CLI）
- Vitest（テスト）

## API

| エンドポイント | 説明 |
|---|---|
| `GET /api/apod` | 最新の APOD を返す |
| `GET /api/apod?date=YYYY-MM-DD` | 指定日の APOD を返す（旧形式 `MM/DD/YYYY` も可） |
| `GET /api/apods/random` | ランダムな日付の APOD を最大8件返す（写真を優先） |

レスポンス例:
```json
{
  "apod": {
    "date": "2015-07-14",
    "title": "New Horizons Passes Pluto and Charon",
    "explanation": "Will the New Horizons spacecraft survive ...",
    "credit": "NASA, Johns Hopkins Univ./APL, Southwest Research Inst.",
    "alt": "",
    "mediaType": "image",
    "image": { "thumb": "https://...?w=640", "large": "https://...?w=1280", "full": "https://...?w=2048" },
    "videoUrl": null,
    "pageUrl": "https://science.nasa.gov/image-article/..."
  }
}
```

- `mediaType` は `image` / `video` / `other`（インタラクティブなページなど、埋め込めないもの）。
- 文字列はすべて **HTML タグを取り除いたプレーンテキスト**です。URL は許可したホスト（NASA の画像・ページ、YouTube・Vimeo のプレーヤー）の https のものだけを返します。
- エラーは `{ "error": { "code": "...", "message": "..." } }` の形で返します。

| ステータス | `code` | 意味 |
|---|---|---|
| 400 | `invalid_date` | 日付の形式が正しくない、または存在しない日付 |
| 404 | `out_of_range` | 1995-06-16 より前、または未来の日付 |
| 404 | `not_found` | その日の APOD が NASA にない |
| 502 | `upstream_error` | NASA が応答しない（取り直しても失敗） |

## データ取得元について
2026年9月に APOD のサイトが `apod.nasa.gov` から `science.nasa.gov/apod` に移転し、従来の `api.nasa.gov/planetary/apod` は全日付で NASA のロゴを返すようになりました（2026年12月1日に停止予定）。
そのため、現在は NASA Science の `https://science.nasa.gov/wp-json/wp/v2/apod-basic` からデータを取得しています。

Worker（`src/apod.js`）では、取得元の次の挙動に対応しています。
- **日付指定はパス形式**: `apod-basic/YYMMDD`。ランダム取得の機能はないため、1995-06-16〜今日の中からランダムに日付を選び、並列に取得しています。
- **画像が欠けている回がある**: 移行で画像が NASA のロゴ（`news-thumbnail.png`）に置き換わっている回は、`basic_html` に残っている本物の画像や動画の URL で補正しています。
- **説明文などが HTML で届く**: タグを取り除いてプレーンテキストにしてから返します（`src/sanitize.js`）。フロントエンドも `innerHTML` を使わず `textContent` で表示するので、二重に XSS を防いでいます。
- **ボット判定で 403 が返ることがある**: 待ち時間を延ばしながら最大4回取り直します。ランダム取得は多めに12件取りに行き、成功した中から8件を返します。

## セキュリティ
- `/` には Content-Security-Policy を付けています。スクリプトは自サイトのものだけ、画像は NASA、埋め込みは YouTube（no-cookie）と Vimeo だけを許可しています（`src/http.js`）。
- 静的ファイルのヘッダーは `public/_headers` で設定しています（`_headers` は Worker が返す応答には効かないため、`/` と `/api/*` は Worker 側で付けています）。

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
npm run dev
```
http://localhost:8787 で確認できます。起動時に CSS がビルドされます。`public/` の HTML や JS で新しい Tailwind のクラスを使ったときは、`npm run build` で CSS を作り直してください。

### テスト
```bash
npm test
```
NASA への通信は偽物に差し替えてテストするので、ネットワークなしで動きます。

### デプロイ
`main` に push（PR をマージ）すると、GitHub Actions がテストに合格したときだけ自動でデプロイします（`.github/workflows/deploy.yml`）。PR ではテストだけが走ります。

手動でデプロイする場合:
```bash
npx wrangler login   # 初回のみ
npm run deploy
```

### 本番のログを見る
```bash
npx wrangler tail space-app
```

### 天文台の図を描き直す
図の静的な部分は `public/index.html` に書き込まれています。寸法や部品を変えたら、次のコマンドで書き直してください。
```bash
npm run figure
```
ドームの向きが「その年の何日目か」（建物の縁の暦の目盛り。左の 1 月 1 日から右の 12 月 31 日まで、前側の 150°）、望遠鏡の高さが「何年か」（1995 年が 14°、今年が 76°）を表します。図をドラッグすると日付を選べます（スマホでは左右のスワイプで日付、ヒントの ↑ ↓ ボタンで年）。

## ディレクトリ構成
```
.
├── frontend/
│   ├── styles.css          # Tailwind の入力（ビルドすると public/app.css になる）
│   ├── iso.css             # 図のキットのスタイル（anatomy）
│   └── observatory.css     # 天文台の図だけで使う色
├── tools/
│   └── build-observatory.mjs # 天文台の図を組み立てて index.html に書き込む
├── public/                 # 配信する静的ファイル（このフォルダの中身だけが公開される）
│   ├── index.html
│   ├── _headers            # 静的ファイル用のレスポンスヘッダー
│   ├── favicon.svg
│   └── js/
│       ├── main.js           # 画面の状態・URL・イベント
│       ├── render.js         # 画面の部品
│       ├── api.js            # /api/* の呼び出しとエラーメッセージ
│       ├── dom.js            # innerHTML を使わない要素の組み立て
│       ├── dates.js          # 日付の計算と表示
│       ├── observatory-model.js # 天文台の寸法・日付と角度の対応・動く部品の形
│       ├── observatory.js    # 天文台を動かす（ドラッグ、キー、読み取り値）
│       └── kit/              # anatomy の描画キット（MIT）
├── src/                    # Worker
│   ├── index.js            # ルーティング・OGP の差し込み
│   ├── apod.js             # NASA からの取得・補正・KV キャッシュ
│   ├── sanitize.js         # HTML の除去・URL の許可リスト
│   ├── dates.js            # 日付の検証
│   └── http.js             # レスポンスとセキュリティヘッダー
├── test/                   # Vitest のテスト
├── wrangler.jsonc          # Cloudflare Workers の設定
├── package.json
├── cmd/, internal/, go.mod # 旧 Go バックエンド（下記参照）
└── docs/                   # チーム開発時のドキュメント
```

## 旧 Go バックエンドについて
`cmd/` と `internal/` には、チーム開発時に作成した Go のバックエンドが残っています。Cloudflare Workers では Go のサーバーをそのまま動かせないため、同じ API を `src/` に書き直しました。
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
