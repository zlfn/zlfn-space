+++
title = "Dockerを使ったLinux実習環境の構築"
date = 2023-08-29
description = "サークルの後輩向けLinuxセミナーの実習環境をDockerで構築した経験"

[taxonomies]
tags = ["linux", "docker"]
+++

サークルで後輩たちにLinuxセミナーをすることになりました。となると、実習環境の構築が必要ですよね。

一昨年は先輩たちがVirtualBoxをインストールしてこいと言い、去年は同じく自分がセミナーを担当して、後輩たちに自分のLinuxサーバーのアカウントを一つずつ渡す方式で実習をしました。

今年はLinuxと仮想化の知識がかなり増えたし、[サーバーもきれいに再構築した](https://zlfn.space/blog/rocky-linux)ので、仮想化を通じて一人一サーバーを提供することにしました。

### ググる
元々はコンテナを複数開いてSSHリバースプロキシやジャンプフォワードで構築しようとしていたのですが、思ったより難しくて苦戦していたところ、以下の記事を見つけました。

[Replicate and Isolating user environments on the fly](https://unix.stackexchange.com/questions/126426/replicate-and-isolating-user-environments-on-the-fly)

まさに求めていたものだったので、この内容をベースに環境に合わせて修正して構築することにしました。

### イメージの作成
上の記事ではコンテナを修正してそれを再びイメージにする過程を経ていますが、それは面倒すぎるのでDockerfileで構成することにしました。

``` dockerfile
# Dockerfile
FROM ubuntu:latest

RUN apt-get update
RUN apt-get install -y vim sudo man-db gcc
RUN yes | unminimize

RUN useradd -ms /bin/bash guest
RUN echo 'guest:password' | chpasswd
RUN usermod -a -G sudo guest

USER guest
WORKDIR /home/guest
```

実習に必要なパッケージである`vim`、`sudo`、`man-db`、`gcc`をインストールし、`unminimize`を実行して`man`が動作するようにします。

そしてguestというユーザーを作成して、コンテナに接続するとrootではなくユーザーとして接続するようにします。これならSSHで直接接続するのとより似た感覚を与えられますよね。

```bash
docker build --tag sandbox .
```

でイメージをビルドします。

### ユーザーの作成
次にユーザーを作成して、SSHで接続すると偽のシェルに接続するようにします。
```bash
mkdir /home/guest

cat > /home/guest/sandbox <<EOF
#!/bin/sh
exec docker run -t -i --rm=true sandbox /bin/bash
EOF

chmod +x /home/guest/sandbox

# useradd guest -g docker -s /home/guest/sandbox 
useradd guest -s /home/guest/sandbox

chown guest /home/guest

passwd guest
```

私はDockerではなくPodman環境なので、ユーザーに`docker`グループを付与しなくても[Rootless Podman](https://access.redhat.com/documentation/ko-kr/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/proc_setting-up-rootless-containers_assembly_starting-with-containers)を実行できました。Dockerで構成する場合は`docker`グループの付与が必要ですね。

`docker`コマンドには`--rm=true`引数を付けて、Dockerコンテナから出た場合にすぐコンテナが削除されるようにし、ユーザーが入ってくると偽のシェルを実行してDockerを開くようにします。

### 完成
上記の設定通りに構築し、`guest`ユーザーでSSH接続すると、一時的に生成されたコンテナに閉じ込められます。

![Screenshot_20230829_113449](Screenshot_20230829_113449.png "Screenshot_20230829_113449")

（ブログに書いたものとユーザー名は異なります。）

この環境では好きなだけパッケージをインストールしたり（カーネルに関連するもの以外なら）システムを変更でき、`sudo rm -rf /`を実行してもコンテナを実行しているシステムには何の影響もありません。

ログアウトして再接続すると全ての内容が初期化され、新しいコンテナが生成されるので、実習に良い環境ですよね。

```
sudo rm -rf --no-preserve-root /
```
を実行してシステムが壊れないか確認してみましょう。

### 2024.07.15 追記

上記のようにコンテナを構築すると、ログアウト時にたまにコンテナが正しく削除されない問題、ログイン時にRefreshing Errorが発生する問題があります。
```
ERRO[0001] Refreshing container 2e3d121a75ec00add6a35694cdc26e6442bb98a7e993b918569dd7584597bca6: acquiring lock 0 for container 2e3d121a75ec00add6a35694cdc26e6442bb98a7e993b918569dd7584597bca6: file exists
```

ログアウト時にコンテナが削除されない問題は、`guest`アカウントの`.bash_logout`ファイルに`docker stop sandbox`を記述しました。確実ではありませんが解決したようです。
エラーは`loginctl enable-linger guest`でアカウントのlingering modeを許可すると解決するようです。
