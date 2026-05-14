"use client";

import * as React from "react";
import { Cloud, Loader2, RefreshCw } from "lucide-react";

import type { CloudSyncControls, TursoServerSetup } from "@/contexts/expenses-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  cloud: CloudSyncControls;
};

function describeServerSetupGaps(setup: TursoServerSetup): string {
  if (!setup.turso) {
    return "サーバー用の環境変数に Turso の接続情報がありません。TURSO_DATABASE_URL と TURSO_AUTH_TOKEN（または LIBSQL_DATABASE_URL と LIBSQL_AUTH_TOKEN）を設定し、Next.js を再起動してください。";
  }
  const missing: string[] = [];
  if (!setup.sessionSecret) {
    missing.push("BIZGO_CLOUD_SESSION_SECRET（16文字以上・HTTP-only Cookie 用）");
  }
  if (!setup.masterPassword) {
    missing.push("BIZGO_CLOUD_PASSWORD（8文字以上・ブラウザからのログイン用）");
  }
  if (missing.length === 0) {
    return "サーバー設定は揃っています。下からログインして同期をオンにしてください。";
  }
  return `Turso への接続は有効です。次を .env に追加し、Next.js を再起動してください: ${missing.join("、")}。`;
}

export function CloudSyncCard({ cloud }: Props) {
  const [password, setPassword] = React.useState("");
  const [loginMsg, setLoginMsg] = React.useState<string | null>(null);

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault();
    setLoginMsg(null);
    const err = await cloud.login(password);
    if (err) setLoginMsg(err);
    else setPassword("");
  }

  return (
    <section
      aria-labelledby="cloud-sync-heading"
      className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
          <Cloud className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <h2
            id="cloud-sync-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Turso で共有（Web の共有データ）
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            経費データの正本は Turso 上の 1
            つのデータベースに置き、ブラウザの localStorage
            はキャッシュ兼オフライン用です。どの端末からでも同じ Web
            アプリにマスターパスワードでログインすれば同じデータを開けます。
          </p>
        </div>
      </div>

      {cloud.authReady === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          サーバー設定を確認しています…
        </p>
      ) : null}

      {cloud.authReady === false ? (
        <p className="text-sm text-muted-foreground">
          {cloud.serverSetup
            ? describeServerSetupGaps(cloud.serverSetup)
            : "Turso 連携を使えません。環境変数を確認し、Next.js を再起動してください。"}
        </p>
      ) : null}

      {cloud.authReady === true ? (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={cloud.enabled}
              disabled={cloud.busy}
              onChange={(ev) => cloud.setEnabled(ev.target.checked)}
            />
            <span className="leading-snug text-foreground">
              Turso へ同期する（ログイン後、変更は数秒ごとにサーバー経由で DB
              に保存されます）
            </span>
          </label>

          <form className="grid gap-3" onSubmit={(ev) => void handleLogin(ev)}>
            <div className="grid gap-2">
              <Label htmlFor="cloud-master-password">マスターパスワード</Label>
              <Input
                id="cloud-master-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="ログインまたは再ログイン"
                disabled={cloud.busy}
              />
            </div>
            {loginMsg ? (
              <p className="text-sm text-destructive" role="alert">
                {loginMsg}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="gap-2"
                disabled={cloud.busy || !password.trim()}
              >
                {cloud.busy ? (
                  <>
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    処理中…
                  </>
                ) : (
                  "ログイン"
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                disabled={cloud.busy}
                onClick={() => void cloud.pullNow()}
              >
                <RefreshCw className="size-4" aria-hidden />
                Turso から再取得
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={cloud.busy}
                onClick={() => void cloud.logout()}
              >
                ログアウト
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {cloud.lastError ? (
        <p className="text-sm text-destructive" role="status">
          {cloud.lastError}
        </p>
      ) : null}
    </section>
  );
}
