---
marp: true
theme: default
paginate: true
header: 'Local File Viewer Showcase'
footer: 'Built with VSCode & Marp'
style: |
  section {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    justify-content: center;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    color: #1e293b;
    font-size: 28px;
    padding: 60px;
  }
  h1 {
    color: #0284c7;
    font-size: 60px;
    border-bottom: 3px solid #0284c7;
    margin-bottom: 40px;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  h2 {
    color: #0369a1;
    font-size: 45px;
    border-left: 10px solid #0ea5e9;
    padding-left: 20px;
    margin-bottom: 30px;
  }
  ul li { margin-bottom: 20px; }
  code {
    background: #f1f5f9;
    color: #0369a1;
    border-radius: 6px;
    padding: 0.1em 0.3em;
    border: 1px solid #cbd5e1;
  }
  pre {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    border-radius: 12px;
  }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-top: 20px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  th {
    background: #0ea5e9;
    color: #fff;
    padding: 15px;
    border-radius: 8px 8px 0 0;
  }
  td {
    background: #fff;
    padding: 15px;
    border-bottom: 1px solid #e2e8f0;
  }
  tr:last-child td { border-radius: 0 0 8px 8px; border-bottom: none; }
  strong { color: #0284c7; }
  header, footer { color: #64748b; font-size: 18px; }
  /* タイトルスライド用特別設定 */
  section.title-page {
    text-align: center;
    background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%);
  }
  section.title-page h1 { font-size: 80px; border: none; }
  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 30px;
    text-align: left;
  }
---

<!-- _class: title-page -->

# Local File Viewer

### ローカルファイルを、もっと手軽に。

**Explore** | **Preview** | **Present**

---

# このスライドについて

Marpは、Markdownから美しいスライドを生成するツールです。

- **自動検知**: `marp: true` を記述するだけ
- **セパレータ**: `---` で簡単ページ分割
- **スタイル**: CSSによる完全な自由度
- **表現力**: コード、テ​​ーブル、数式も完璧

---

## 機能一覧 🛠️

| カテゴリ | 実装済みの機能 |
| :--- | :--- |
| **Explorer** | サイドバーでのディレクトリ木構造表示 |
| **Preview** | GitHubスタイルのMarkdown / Mermaid |
| **Presentation** | Marpエンジンによるスライドショー |
| **Media** | 画像 / ビデオ / PDF の直接プレビュー |

---

## コードプレビュー 💻

シンタックスハイライトもスライドに統合されます。

```python
def showcase_feature():
    # 完全に統合されたプレビュー体験
    print("Welcome to Local File Viewer!")
    
showcase_feature()
```

---

## 高度なレイアウト設定 🏗️

CSSの力を借りれば、多様なレイアウトが可能です。

### 💡 Tips: 2カラムレイアウト

<div class="columns">
<div>

**左側（メイン）**
- 情報の構造化に便利
- 箇条書きなど
- 解説テキストなど

</div>
<div>

**右側（補足）**
- 図解や画像の配置
- 補足コメント
- 重要なキーワード

</div>
</div>

---

<!-- 
_backgroundColor: #f0fdf4
_color: #166534
-->

## 特定のページだけ背景を変える 🎨

ディレクティブの前に `_` を付けることで、そのページだけに適用されます。

- このページは `_backgroundColor` を使用しています
- 次のページからは、元の明るい配色に戻ります
- セクションの区切りや、強調したいスライドに最適です

---

## 画像の配置と調整 🖼️

Markdown標準の記法に加え、拡張機能でリサイズも可能。

- 背景画像としての配置 (`bg`)
- 幅・高さの指定 (`width`, `height`)
- 不透明度の調整 (`opacity`)

> ※ローカル画像も、拡張機能のディレクトリ構造に合わせて正しく参照されます。

---

# まとめと次へのステップ 🏁

Markdownで資料を作る習慣は、知識の再利用性を高めます。

1. **ドキュメント化**: `README.md` を書く
2. **プレビュー**: この拡張機能で確認
3. **プレゼン**: そのままスライドとして発表

---

<!-- _class: title-page -->

# Thank You! 🚀

お使いのVSCodeで、**最高のドキュメント閲覧体験**をお楽しみください。

[GitHub Repository](https://github.com/kohari/vscode-localfile-viewer)
