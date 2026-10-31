# このリポジトリで作業するClaudeへ

電圧降下アプリ(GitHub Pagesで公開しているアプリ)です。持ち主はタイチ。

## アプリを更新したら、Googleドライブにバックアップする
タイチの希望で、アプリを更新して main に push したら、そのたびに Googleドライブ「電気 › アプリ」へ zip でバックアップします。
ドライブへの保存はバックアップページ(Claudeのアーティファクト)が行います。ページを開くと、まだの分を自動でドライブに保存し、同じアプリの古いzipをゴミ箱に移します。

- バックアップページ: https://claude.ai/artifact/Rzjzq7G4T7dycu5ozNWEAi
- このリポジトリの key: `vd-calc` / アプリ名: `電圧降下アプリ`
- もう一方のアプリ: tree4384/conduit(conduit・電線管選定アプリ)、tree4384/vd-calc(vd-calc・電圧降下アプリ)

手順(push したあと):
1. 下のスクリプトで zip を作り、ページのデータ置き場に入れる JSON を作る(REPO_DIR はこのリポジトリのパス)。
2. ArtifactData ツールの action "batch" で、url にバックアップページのURLを入れ、writes に
   中身 `{op:"set", collection:"backup_parts", doc_id:"<id>-<番号>", file_path:"<out>/<id>-<番号>.json"}` を全部、
   最後に目録 `{op:"set", collection:"backups", doc_id:"<id>", file_path:"<out>/<id>.json"}` を入れて書き込む。
   中身は必ず file_path で渡す(書き写さない)。id は「key-更新番号の先頭7文字」。
3. Artifact ツールの action "open" でバックアップページを開く。タイチの画面でページが動いて、ドライブに保存される。
4. 少し待って ArtifactData の list で collection "saved" にその id が入ったか確かめる。入っていなければ、ページを開いてもらうよう一言伝える。

zip の中身を書き写して Googleドライブに直接アップロードしないこと(1文字でも間違えると壊れたファイルが黙って保存されるため)。

```bash
set -e; KEY=vd-calc; APP=電圧降下アプリ; REPO_DIR=/home/claude/vd-calc
W=$(mktemp -d); SHA=$(git -C $REPO_DIR rev-parse HEAD)
WHEN=$(TZ=Asia/Tokyo git -C $REPO_DIR log -1 --date=format-local:'%Y-%m-%d_%H%M' --format=%cd); MSG=$(git -C $REPO_DIR log -1 --format=%s)
git -C $REPO_DIR archive --format=zip -9 --prefix=$KEY/ -o $W/b.zip HEAD
python3 - "$W" "$KEY" "tree4384/$KEY" "$APP" "$SHA" "$WHEN" "$MSG" <<'PY'
import base64,hashlib,json,os,sys,time
w,key,repo,app,sha,when,msg=sys.argv[1:]
z=open(w+'/b.zip','rb').read(); b=base64.b64encode(z).decode()
bid=key+'-'+sha[:7]; os.makedirs(w+'/out',exist_ok=True)
parts=[b[i:i+150000] for i in range(0,len(b),150000)]
for k,p in enumerate(parts): json.dump({'data':p},open(f'{w}/out/{bid}-{k}.json','w'))
meta={'repo':repo,'app':app,'sha':sha,'date':when,'msg':msg,'size':len(z),'md5':hashlib.md5(z).hexdigest(),'name':f'{app}_{when}_{sha[:7]}.zip','parts':len(parts),'created':int(time.time()*1000)}
json.dump(meta,open(f'{w}/out/{bid}.json','w'),ensure_ascii=False)
print(bid,len(parts),w+'/out')
PY
```

## そのほか
- アプリを更新したら sw.js の CACHE の番号を1つ上げる(iPhoneのホーム画面アプリに新しい版を届けるため)。
