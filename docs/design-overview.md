# タスク管理アプリ（Trelloライク） 概念設計図

## 1. この資料の目的

この資料は、MVPで作る画面、利用者の操作、データの流れ、およびデータ同士の関係を、実装前に共通認識として整理するためのものである。

- 対象は単一利用者・単一ボードのタスク管理アプリとする。
- 実装の詳細なコンポーネント構成やライブラリは、この資料では確定しない。
- 図はすべて Mermaid 記法で記述し、Markdown上で更新できるようにする。

## 2. 画面構成

MVPでは画面はボード画面の1画面のみである。リストとカードの操作は、画面遷移ではなく、同じ画面内で行う。

```mermaid
flowchart TB
  Screen[ボード画面]
  Header[ヘッダー\nボード名]
  ListArea[リスト表示エリア\n横スクロール]
  AddList[リスト追加]
  List[リスト]
  ListTitle[リスト名]
  ListActions[リスト編集・削除]
  CardArea[カード一覧]
  AddCard[カード追加]
  Card[カード\nタイトル編集・削除・ドラッグ]

  Screen --> Header
  Screen --> ListArea
  Screen --> AddList
  ListArea --> List
  List --> ListTitle
  List --> ListActions
  List --> CardArea
  List --> AddCard
  CardArea --> Card
```

## 3. 操作フロー

利用者はボード上でリストとカードを管理する。すべての変更は画面上の状態に反映され、保存対象となる。

```mermaid
flowchart TD
  Start([アプリを開く]) --> Restore{保存済みデータはあるか}
  Restore -- はい --> Load[localStorageから復元]
  Restore -- いいえ --> Initial[サンプルデータを表示]
  Load --> Board[ボード画面を表示]
  Initial --> Board

  Board --> Choice{行う操作}
  Choice -->|リスト追加| CreateList[リスト名を入力して追加]
  Choice -->|リスト編集| EditList[リスト名を変更]
  Choice -->|リスト削除| DeleteList[削除確認後に削除]
  Choice -->|カード追加| CreateCard[カード名を入力して追加]
  Choice -->|カード編集| EditCard[カード名を変更]
  Choice -->|カード削除| DeleteCard[削除確認後に削除]
  Choice -->|カード移動| MoveCard[ドラッグ&ドロップで位置またはリストを変更]

  CreateList --> Update[画面の状態を更新]
  EditList --> Update
  DeleteList --> Update
  CreateCard --> Update
  EditCard --> Update
  DeleteCard --> Update
  MoveCard --> Update
  Update --> Save[localStorageへ保存]
  Save --> Board
```

## 4. データフロー

Reactの状態を画面表示の正とし、変更後の状態をlocalStorageへ保存する。起動時にはlocalStorageのデータを読み込み、表示用の状態を復元する。

```mermaid
flowchart LR
  User[利用者] -->|クリック・入力・ドラッグ| UI[ボード画面]
  UI -->|操作イベント| State[アプリケーション状態\nBoard・List・Card]
  State -->|再描画| UI
  State -->|変更後に保存| Storage[(localStorage)]
  Storage -->|起動時に読み込み| State
```

## 5. データモデル図（ER図風）

データベースを使用しないため、これはテーブル定義ではなく、アプリ内で扱うデータの関係を示す概念モデルである。Boardは1件、Listは0件以上、Cardは各Listに0件以上存在できる。

```mermaid
erDiagram
  BOARD ||--o{ LIST : "has"
  LIST ||--o{ CARD : "contains"

  BOARD {
    string id
    string title
  }

  LIST {
    string id
    string title
  }

  CARD {
    string id
    string title
  }
```

## 6. 設計上の確認事項

- 空文字や空白だけのリスト名・カード名を登録できないようにするか。
- カードを含むリストを削除する際、確認ダイアログを表示するか。
- localStorageのデータが破損していた場合、初期状態で起動するか。

これらは、次の「画面・操作の詳細」と「データ要件」で確定する。
