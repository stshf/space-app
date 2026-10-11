export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { signal } = {}) {
  let res;
  try {
    res = await fetch(path, { signal, headers: { Accept: "application/json" } });
  } catch (err) {
    if (err.name === "AbortError") {
      throw err;
    }
    throw new ApiError(0, "network_error", "ネットワークに接続できません");
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // JSON 以外が返ってきた場合は下のエラー処理に任せる
  }
  if (!res.ok || !body) {
    throw new ApiError(res.status, body?.error?.code ?? "http_error", body?.error?.message);
  }
  return body;
}

export async function fetchApod(date, options) {
  const path = date ? `/api/apod?date=${encodeURIComponent(date)}` : "/api/apod";
  return (await request(path, options)).apod;
}

export async function fetchRandomApods(options) {
  return (await request("/api/apods/random", options)).apods;
}

export function describeError(err) {
  if (err.code === "out_of_range") {
    return "APOD は 1995年6月16日から毎日公開されています。その範囲の日付を選んでください。";
  }
  if (err.status === 404) {
    return "この日の APOD は見つかりませんでした（公開されていない日もあります）。";
  }
  if (err.status === 400) {
    return "日付の形式が正しくありません。";
  }
  if (err.code === "network_error") {
    return "ネットワークに接続できません。接続を確認してもう一度お試しください。";
  }
  return "NASA のサーバーが応答していません。少し時間をおいてもう一度お試しください。";
}
